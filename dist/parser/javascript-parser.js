import { parse } from '@babel/parser';
function visit(node, visitors, parent) {
    if (!node)
        return;
    if (Array.isArray(node)) {
        for (const child of node) {
            visit(child, visitors, parent);
        }
        return;
    }
    if (typeof node !== 'object')
        return;
    const handler = visitors[node.type];
    if (handler)
        handler(node, parent);
    const obj = node;
    for (const key of Object.keys(obj)) {
        if (['leadingComments', 'trailingComments', 'innerComments', 'start', 'end', 'loc', 'type'].includes(key))
            continue;
        const val = obj[key];
        if (Array.isArray(val)) {
            for (const item of val) {
                if (item && typeof item === 'object' && 'type' in item) {
                    visit(item, visitors, node);
                }
            }
        }
        else if (val && typeof val === 'object' && 'type' in val) {
            visit(val, visitors, node);
        }
    }
}
function resolveImportSource(source) {
    if (source.startsWith('.'))
        return source;
    const parts = source.split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}
export function parseJavaScriptFile(filePath, content) {
    const entities = [];
    const imports = [];
    const exportsList = [];
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
        });
        visit(ast, {
            ImportDeclaration(node) {
                const source = node.source?.value;
                if (source) {
                    imports.push(source);
                    entities.push({
                        name: `import ${resolveImportSource(source)}`,
                        type: 'import',
                        line: node.loc?.start?.line ?? 0,
                        details: { source },
                    });
                }
            },
            ExportNamedDeclaration(node) {
                const n = node;
                if (n.source?.value) {
                    exportsList.push(n.source.value);
                }
                if (n.declaration) {
                    const decl = n.declaration;
                    if (decl.type === 'FunctionDeclaration' || decl.type === 'VariableDeclaration' || decl.type === 'ClassDeclaration' || decl.type === 'TSInterfaceDeclaration' || decl.type === 'TSTypeAliasDeclaration') {
                        const name = decl.id?.name ?? decl.declarations?.[0]?.id?.name ?? 'unnamed';
                        exportsList.push(name);
                    }
                }
            },
            ExportDefaultDeclaration(node) {
                const n = node;
                const decl = n.declaration;
                const name = decl?.id?.name ?? decl?.name ?? 'default';
                exportsList.push(`default:${name}`);
            },
            FunctionDeclaration(node, parent) {
                const n = node;
                const name = n.id?.name ?? 'anonymous';
                if (parent?.type !== 'ExportNamedDeclaration') {
                    entities.push({
                        name,
                        type: 'function',
                        line: n.loc?.start?.line ?? 0,
                        details: {
                            params: n.params?.map((p) => p.name ?? '?') ?? [],
                            async: n.async ?? false,
                        },
                    });
                }
            },
            ClassDeclaration(node) {
                const n = node;
                const name = n.id?.name ?? 'anonymous';
                entities.push({
                    name,
                    type: 'class',
                    line: n.loc?.start?.line ?? 0,
                    details: {
                        extends: n.superClass?.name ?? null,
                        methods: n.body?.body
                            ?.filter((m) => m.type === 'ClassMethod' || m.type === 'ClassPrivateMethod')
                            ?.map((m) => ({
                            name: m.key?.name ?? m.key?.value ?? '(computed)',
                            kind: m.kind ?? 'method',
                        })) ?? [],
                    },
                });
            },
            CallExpression(node) {
                const n = node;
                const callee = n.callee;
                if (callee.type === 'MemberExpression') {
                    const objName = callee.object?.name ?? '';
                    const propName = callee.property?.name ?? callee.property?.value ?? '';
                    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
                    if (httpMethods.includes(propName) && n.arguments?.[0]) {
                        const routePath = n.arguments[0]?.value ?? n.arguments[0]?.extra?.raw ?? '?';
                        entities.push({
                            name: `${propName.toUpperCase()} ${routePath}`,
                            type: 'route',
                            line: n.loc?.start?.line ?? 0,
                            details: {
                                method: propName.toUpperCase(),
                                path: routePath,
                                handlerName: n.arguments[1]?.name ?? '(inline)',
                            },
                        });
                    }
                }
            },
            VariableDeclarator(node) {
                const n = node;
                if (n.init?.type === 'CallExpression' && n.init?.callee?.name === 'require') {
                    const source = n.init.arguments?.[0]?.value;
                    if (source) {
                        imports.push(source);
                        entities.push({
                            name: `require ${resolveImportSource(source)}`,
                            type: 'import',
                            line: n.loc?.start?.line ?? 0,
                            details: { source },
                        });
                    }
                }
            },
        });
    }
    catch {
        return parseJavaScriptFileFallback(filePath, content);
    }
    return { path: filePath, language: 'javascript', entities, imports, exports: exportsList };
}
function parseJavaScriptFileFallback(filePath, content) {
    const entities = [];
    const imports = [];
    const exportsList = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const importMatch = line.match(/(?:import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]|const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\))/);
        if (importMatch) {
            const source = importMatch[1] ?? importMatch[2];
            imports.push(source);
            entities.push({ name: `import ${resolveImportSource(source)}`, type: 'import', line: lineNum, details: { source } });
        }
        const exportMatch = line.match(/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/);
        if (exportMatch)
            exportsList.push(exportMatch[1]);
        const funcMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\(/);
        if (funcMatch) {
            entities.push({ name: funcMatch[1], type: 'function', line: lineNum, details: {} });
        }
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
            const extendsMatch = line.match(/extends\s+(\w+)/);
            entities.push({
                name: classMatch[1],
                type: 'class',
                line: lineNum,
                details: { extends: extendsMatch?.[1] ?? null, methods: [] },
            });
        }
        const routeMatch = line.match(/(?:app|router|route)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/);
        if (routeMatch) {
            entities.push({
                name: `${routeMatch[1].toUpperCase()} ${routeMatch[2]}`,
                type: 'route',
                line: lineNum,
                details: { method: routeMatch[1].toUpperCase(), path: routeMatch[2] },
            });
        }
    }
    return { path: filePath, language: 'javascript', entities, imports, exports: exportsList };
}
//# sourceMappingURL=javascript-parser.js.map