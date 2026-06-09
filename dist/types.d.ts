export interface CodeEntity {
    name: string;
    type: 'function' | 'class' | 'variable' | 'route' | 'model' | 'import' | 'export';
    line: number;
    details?: Record<string, unknown>;
}
export interface FileNode {
    path: string;
    language: string;
    entities: CodeEntity[];
    imports: string[];
    exports: string[];
}
export interface GraphNode {
    id: string;
    type: 'file' | 'function' | 'class' | 'route' | 'model' | 'config';
    label: string;
    filePath: string;
    language: string;
    details: Record<string, unknown>;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label: string;
    type: 'import' | 'call' | 'extends' | 'route' | 'depends';
}
export interface AnalysisSummary {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    totalRoutes: number;
    totalImports: number;
}
export interface AnalysisResult {
    nodes: GraphNode[];
    edges: GraphEdge[];
    files: FileNode[];
    summary: AnalysisSummary;
}
