import { parse } from '@babel/parser'
import type { File, Node } from '@babel/types'
import type { FileNode, CodeEntity } from '../types.js'

function visit(node: Node | Node[] | null | undefined, visitors: Record<string, (n: Node, parent?: Node) => void>, parent?: Node): void {
  if (!node) return
  if (Array.isArray(node)) {
    for (const child of node) {
      visit(child, visitors, parent)
    }
    return
  }
  if (typeof node !== 'object') return

  const handler = visitors[node.type]
  if (handler) handler(node, parent)

  const obj = node as unknown as Record<string, unknown>
  for (const key of Object.keys(obj)) {
    if (['leadingComments', 'trailingComments', 'innerComments', 'start', 'end', 'loc', 'type'].includes(key)) continue
    const val = obj[key]
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && 'type' in (item as object)) {
          visit(item as Node, visitors, node)
        }
      }
    } else if (val && typeof val === 'object' && 'type' in (val as object)) {
      visit(val as Node, visitors, node as Node)
    }
  }
}

function resolveImportSource(source: string): string {
  if (source.startsWith('.')) return source
  const parts = source.split('/')
  return parts[0]!.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]!
}

export function parseJavaScriptFile(filePath: string, content: string): FileNode {
  const entities: CodeEntity[] = []
  const imports: string[] = []
  const exportsList: string[] = []

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'optionalChaining',
        'nullishCoalescingOperator',
        'classProperties',
        'dynamicImport',
      ],
      errorRecovery: true,
      tokens: false,
    })

    visit(ast, {
      ImportDeclaration(node) {
        const source = (node as any).source?.value
        if (source) {
          imports.push(source)
          entities.push({
            name: `import ${resolveImportSource(source)}`,
            type: 'import',
            line: (node as any).loc?.start?.line ?? 0,
            details: { source },
          })
        }
      },

      ExportNamedDeclaration(node) {
        const n = node as any
        if (n.source?.value) {
          exportsList.push(n.source.value)
        }
        if (n.declaration) {
          const decl = n.declaration
          if (decl.type === 'FunctionDeclaration' || decl.type === 'VariableDeclaration' || decl.type === 'ClassDeclaration' || decl.type === 'TSInterfaceDeclaration' || decl.type === 'TSTypeAliasDeclaration') {
            const name = decl.id?.name ?? decl.declarations?.[0]?.id?.name ?? 'unnamed'
            exportsList.push(name)
          }
        }
      },

      ExportDefaultDeclaration(node) {
        const n = node as any
        const decl = n.declaration
        const name = decl?.id?.name ?? decl?.name ?? 'default'
        exportsList.push(`default:${name}`)
      },

      FunctionDeclaration(node, parent) {
        const n = node as any
        const name = n.id?.name ?? 'anonymous'
        if ((parent as any)?.type !== 'ExportNamedDeclaration') {
          entities.push({
            name,
            type: 'function',
            line: n.loc?.start?.line ?? 0,
            details: {
              params: n.params?.map((p: any) => p.name ?? '?') ?? [],
              async: n.async ?? false,
            },
          })
        }
      },

      ClassDeclaration(node) {
        const n = node as any
        const name = n.id?.name ?? 'anonymous'
        entities.push({
          name,
          type: 'class',
          line: n.loc?.start?.line ?? 0,
          details: {
            extends: n.superClass?.name ?? null,
            methods: n.body?.body
              ?.filter((m: any) => m.type === 'ClassMethod' || m.type === 'ClassPrivateMethod')
              ?.map((m: any) => ({
                name: m.key?.name ?? m.key?.value ?? '(computed)',
                kind: m.kind ?? 'method',
              })) ?? [],
          },
        })
      },

      CallExpression(node) {
        const n = node as any
        const callee = n.callee
        if (callee.type === 'MemberExpression') {
          const objName = (callee.object as any)?.name ?? ''
          const propName = (callee.property as any)?.name ?? (callee.property as any)?.value ?? ''
          const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']
          if (httpMethods.includes(propName) && n.arguments?.[0]) {
            const routePath = n.arguments[0]?.value ?? n.arguments[0]?.extra?.raw ?? '?'
            entities.push({
              name: `${propName.toUpperCase()} ${routePath}`,
              type: 'route',
              line: n.loc?.start?.line ?? 0,
              details: {
                method: propName.toUpperCase(),
                path: routePath,
                handlerName: n.arguments[1]?.name ?? '(inline)',
              },
            })
          }
        }
      },

      VariableDeclarator(node) {
        const n = node as any
        if (n.init?.type === 'CallExpression' && n.init?.callee?.name === 'require') {
          const source = n.init.arguments?.[0]?.value
          if (source) {
            imports.push(source)
            entities.push({
              name: `require ${resolveImportSource(source)}`,
              type: 'import',
              line: n.loc?.start?.line ?? 0,
              details: { source },
            })
          }
        }
      },
    })
  } catch {
    return parseJavaScriptFileFallback(filePath, content)
  }

  return { path: filePath, language: 'javascript', entities, imports, exports: exportsList }
}

function parseJavaScriptFileFallback(filePath: string, content: string): FileNode {
  const entities: CodeEntity[] = []
  const imports: string[] = []
  const exportsList: string[] = []

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineNum = i + 1

    const importMatch = line.match(
      /(?:import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]|const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\))/
    )
    if (importMatch) {
      const source = importMatch[1] ?? importMatch[2]!
      imports.push(source)
      entities.push({ name: `import ${resolveImportSource(source)}`, type: 'import', line: lineNum, details: { source } })
    }

    const exportMatch = line.match(/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/)
    if (exportMatch) exportsList.push(exportMatch[1]!)

    const funcMatch = line.match(
      /(?:async\s+)?function\s+(\w+)\s*\(/
    )
    if (funcMatch) {
      entities.push({ name: funcMatch[1]!, type: 'function', line: lineNum, details: {} })
    }

    const classMatch = line.match(/class\s+(\w+)/)
    if (classMatch) {
      const extendsMatch = line.match(/extends\s+(\w+)/)
      entities.push({
        name: classMatch[1]!,
        type: 'class',
        line: lineNum,
        details: { extends: extendsMatch?.[1] ?? null, methods: [] },
      })
    }

    const routeMatch = line.match(
      /(?:app|router|route)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/
    )
    if (routeMatch) {
      entities.push({
        name: `${routeMatch[1]!.toUpperCase()} ${routeMatch[2]!}`,
        type: 'route',
        line: lineNum,
        details: { method: routeMatch[1]!.toUpperCase(), path: routeMatch[2]! },
      })
    }
  }

  return { path: filePath, language: 'javascript', entities, imports, exports: exportsList }
}
