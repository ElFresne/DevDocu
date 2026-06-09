export function extractAPIRoutes(files) {
    const routes = [];
    for (const file of files) {
        for (const entity of file.entities) {
            if (entity.type === 'route') {
                routes.push({
                    method: entity.details?.method ?? 'GET',
                    path: entity.details?.path ?? '/',
                    handler: entity.details?.handlerName ?? entity.name,
                    file: file.path,
                    line: entity.line,
                    framework: file.language === 'python' ? 'Flask/FastAPI' : 'Express',
                });
            }
        }
    }
    return routes;
}
export function buildAPIGraphNodes(routes) {
    return routes.map((route, i) => ({
        id: `route:${i}`,
        type: 'route',
        label: `${route.method} ${route.path}`,
        filePath: route.file,
        language: route.framework === 'Flask/FastAPI' ? 'python' : 'javascript',
        details: {
            method: route.method,
            path: route.path,
            handler: route.handler,
            framework: route.framework,
            line: route.line,
        },
    }));
}
export function buildAPIGraphEdges(routes, fileNodes) {
    const edges = [];
    for (const route of routes) {
        const fileNodeId = fileNodes.get(route.file);
        if (fileNodeId) {
            edges.push({
                id: `route-edge:${fileNodeId}->${route.method} ${route.path}`,
                source: fileNodeId,
                target: `route:${route.path}`,
                label: `exposes ${route.method}`,
                type: 'route',
            });
        }
    }
    return edges;
}
//# sourceMappingURL=api-analyzer.js.map