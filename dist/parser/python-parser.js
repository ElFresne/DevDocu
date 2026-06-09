function extractDecorators(lines, lineIndex) {
    const decorators = [];
    let i = lineIndex - 1;
    while (i >= 0) {
        const trimmed = lines[i].trim();
        if (!trimmed.startsWith('@'))
            break;
        const match = trimmed.match(/@(\w+)\.?(\w*)\s*(?:\(([^)]*)\))?/);
        if (match) {
            decorators.push({
                name: match[2] ? `${match[1]}.${match[2]}` : match[1],
                args: match[3] ? match[3].split(',').map((a) => a.trim()) : [],
            });
        }
        i--;
    }
    return decorators;
}
export function parsePythonFile(filePath, content) {
    const entities = [];
    const imports = [];
    const exportsList = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const importMatch = line.match(/^(?:from\s+([\w.]+)\s+)?import\s+(.+)$/);
        if (importMatch) {
            const module = importMatch[1] ?? '';
            const targets = importMatch[2];
            if (module) {
                imports.push(module);
                entities.push({ name: `from ${module}`, type: 'import', line: lineNum, details: { module, names: targets.split(',').map(t => t.trim().split(' as ')[0].trim()) } });
            }
            else {
                targets.split(',').forEach(t => {
                    const name = t.trim().split(' as ')[0].trim();
                    imports.push(name);
                    entities.push({ name: `import ${name}`, type: 'import', line: lineNum, details: {} });
                });
            }
        }
        const classMatch = line.match(/^class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/);
        if (classMatch) {
            const bases = classMatch[2] ? classMatch[2].split(',').map(b => b.trim()) : [];
            entities.push({
                name: classMatch[1],
                type: 'class',
                line: lineNum,
                details: { bases, methods: [] },
            });
        }
        const decorators = extractDecorators(lines, i);
        const hasRouteDecorator = decorators.some(d => d.name === 'route' || d.name === 'app.route' || d.name === 'get' || d.name === 'post' || d.name === 'put' || d.name === 'delete' || d.name === 'patch');
        const funcMatch = line.match(/^async\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*\S+)?\s*:/) ||
            line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*\S+)?\s*:/);
        if (funcMatch) {
            if (hasRouteDecorator) {
                const decorator = decorators.find(d => d.name !== 'route' && d.name !== 'app.route') ?? decorators[0];
                let routePath = decorator.args[0]?.replace(/['"]/g, '') ?? `/${funcMatch[1]}`;
                const methodMap = { get: 'GET', post: 'POST', put: 'PUT', delete: 'DELETE', patch: 'PATCH', route: 'GET' };
                const method = methodMap[decorator.name.split('.').pop()] ?? (decorator.name === 'app.route' ? 'GET' : decorator.args[1]?.replace(/['"]/g, '') ?? 'GET');
                entities.push({
                    name: `${method} ${routePath}`,
                    type: 'route',
                    line: lineNum,
                    details: {
                        method,
                        path: routePath,
                        handler: funcMatch[1],
                        decorators: decorators.map(d => d.name),
                    },
                });
            }
            entities.push({
                name: funcMatch[1],
                type: 'function',
                line: lineNum,
                details: {
                    params: funcMatch[2] ? funcMatch[2].split(',').map(p => p.trim().split(':')[0].trim()) : [],
                    async: line.trimStart().startsWith('async'),
                    decorators: decorators.map(d => d.name),
                },
            });
        }
        const flaskRoute = line.match(/@(\w+)\.route\s*\(\s*['"]([^'"]+)['"]/);
        if (flaskRoute) {
            if (!hasRouteDecorator) {
                entities.push({
                    name: `ROUTE ${flaskRoute[2]}`,
                    type: 'route',
                    line: lineNum,
                    details: { method: 'GET', path: flaskRoute[2] },
                });
            }
        }
    }
    return { path: filePath, language: 'python', entities, imports, exports: exportsList };
}
//# sourceMappingURL=python-parser.js.map