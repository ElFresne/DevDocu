import { relative, dirname, sep, extname } from 'node:path'
import type { FileNode, GraphNode, GraphEdge, AnalysisResult, AnalysisSummary } from '../types.js'

function isNodeModuleImport(imp: string): boolean {
  return !imp.startsWith('.') && !imp.startsWith('/')
}

function resolveImportPath(importerPath: string, importSource: string): string | null {
  if (importSource.startsWith('.')) {
    const baseDir = dirname(importerPath)
    const resolved = joinSafe(baseDir, importSource)
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '', '/index.ts', '/index.js', '/index.tsx', '/index.jsx']
    for (const ext of exts) {
      const candidate = resolved + ext
      if (candidate.endsWith('/index.ts') || candidate.endsWith('/index.js') || candidate.endsWith('/index.tsx') || candidate.endsWith('/index.jsx')) {
        if (candidate.endsWith(ext)) return candidate
      }
      return candidate
    }
    return resolved
  }
  return null
}

function joinSafe(...parts: string[]): string {
  return parts.join(sep).replace(/\/+/g, sep).replace(/\\+/g, sep)
}

function getNodeType(filePath: string, entity: { type: string; name: string }): GraphNode['type'] {
  if (entity.type === 'route') return 'route'
  if (entity.type === 'model' || entity.name.toLowerCase().includes('model')) return 'model'
  if (entity.type === 'class') return 'class'
  if (entity.type === 'function') return 'function'
  return 'file'
}

function getColorForNodeType(type: GraphNode['type']): string {
  const colors: Record<GraphNode['type'], string> = {
    file: '#6366f1',
    function: '#22c55e',
    class: '#f59e0b',
    route: '#ef4444',
    model: '#06b6d4',
    config: '#8b5cf6',
  }
  return colors[type] ?? '#64748b'
}

function getColorForLanguage(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3776ab',
  }
  return colors[lang] ?? '#64748b'
}

export function buildGraph(files: FileNode[], projectRoot: string): AnalysisResult {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const summary: AnalysisSummary = { totalFiles: 0, totalFunctions: 0, totalClasses: 0, totalRoutes: 0, totalImports: 0 }

  const fileMap = new Map<string, FileNode>()

  for (const file of files) {
    fileMap.set(file.path, file)
    summary.totalFiles++
    summary.totalFunctions += file.entities.filter(e => e.type === 'function').length
    summary.totalClasses += file.entities.filter(e => e.type === 'class').length
    summary.totalRoutes += file.entities.filter(e => e.type === 'route').length
  }

  const fileNodes = new Map<string, string>()

  for (const file of files) {
    const relPath = relative(projectRoot, file.path)
    const fileNodeId = `file:${relPath}`

    nodes.push({
      id: fileNodeId,
      type: 'file',
      label: relPath.split(sep).pop() ?? relPath,
      filePath: relPath,
      language: file.language,
      details: {
        fullPath: relPath,
        language: file.language,
        entities: file.entities.map(e => ({ name: e.name, type: e.type, line: e.line })),
        entityCount: file.entities.length,
        importCount: file.imports.length,
      },
    })

    fileNodes.set(file.path, fileNodeId)

    for (const entity of file.entities) {
      if (entity.type === 'function' || entity.type === 'class' || entity.type === 'route' || entity.type === 'model') {
        const entityId = `${entity.type}:${relPath}#${entity.name}`
        const nodeType = getNodeType(file.path, entity)

        nodes.push({
          id: entityId,
          type: nodeType,
          label: entity.name,
          filePath: relPath,
          language: file.language,
          details: { ...entity.details, line: entity.line, kind: entity.type },
        })

        edges.push({
          id: `contains:${fileNodeId}->${entityId}`,
          source: fileNodeId,
          target: entityId,
          label: 'contains',
          type: 'depends',
        })
      }
    }

    for (const imp of file.imports) {
      if (isNodeModuleImport(imp)) continue
      summary.totalImports++

      const resolvedPath = resolveImportPath(file.path, imp)
      if (resolvedPath) {
        const normalized = resolvedPath.replace(/\\/g, '/')
        for (const [filePath, fileNodeId] of fileNodes) {
          const normalizedFilePath = filePath.replace(/\\/g, '/')
          if (normalizedFilePath === normalized || normalizedFilePath.startsWith(normalized) || normalizedFilePath === normalized + '/index') {
            const edgeId = `import:${relPath}->${relative(projectRoot, filePath)}`
            if (!edges.some(e => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                source: fileNodeId,
                target: `file:${relative(projectRoot, filePath)}`,
                label: 'imports',
                type: 'import',
              })
            }
            break
          }
        }
      }
    }
  }

  return { nodes, edges, files, summary }
}
