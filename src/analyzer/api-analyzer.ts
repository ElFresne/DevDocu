import type { FileNode, GraphNode, GraphEdge } from '../types.js'

interface RouteInfo {
  method: string
  path: string
  handler: string
  file: string
  line: number
  framework?: string
}

export function extractAPIRoutes(files: FileNode[]): RouteInfo[] {
  const routes: RouteInfo[] = []

  for (const file of files) {
    for (const entity of file.entities) {
      if (entity.type === 'route') {
        routes.push({
          method: (entity.details?.method as string) ?? 'GET',
          path: (entity.details?.path as string) ?? '/',
          handler: (entity.details?.handlerName as string) ?? entity.name,
          file: file.path,
          line: entity.line,
          framework: file.language === 'python' ? 'Flask/FastAPI' : 'Express',
        })
      }
    }
  }

  return routes
}

export function buildAPIGraphNodes(routes: RouteInfo[]): GraphNode[] {
  return routes.map((route, i) => ({
    id: `route:${i}`,
    type: 'route' as const,
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
  }))
}

export function buildAPIGraphEdges(routes: RouteInfo[], fileNodes: Map<string, string>): GraphEdge[] {
  const edges: GraphEdge[] = []

  for (const route of routes) {
    const fileNodeId = fileNodes.get(route.file)
    if (fileNodeId) {
      edges.push({
        id: `route-edge:${fileNodeId}->${route.method} ${route.path}`,
        source: fileNodeId,
        target: `route:${route.path}`,
        label: `exposes ${route.method}`,
        type: 'route',
      })
    }
  }

  return edges
}
