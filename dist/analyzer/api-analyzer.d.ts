import type { FileNode, GraphNode, GraphEdge } from '../types.js';
interface RouteInfo {
    method: string;
    path: string;
    handler: string;
    file: string;
    line: number;
    framework?: string;
}
export declare function extractAPIRoutes(files: FileNode[]): RouteInfo[];
export declare function buildAPIGraphNodes(routes: RouteInfo[]): GraphNode[];
export declare function buildAPIGraphEdges(routes: RouteInfo[], fileNodes: Map<string, string>): GraphEdge[];
export {};
