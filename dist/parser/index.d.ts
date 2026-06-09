import type { FileNode } from '../types.js';
export declare function scanDirectory(dirPath: string): Promise<FileNode[]>;
export declare function parseFiles(files: Array<{
    path: string;
    content: string;
}>): FileNode[];
