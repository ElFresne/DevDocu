import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { glob } from 'glob';
import { parseJavaScriptFile } from './javascript-parser.js';
import { parsePythonFile } from './python-parser.js';
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py'];
function detectLanguage(ext) {
    const langMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.py': 'python',
    };
    return langMap[ext] ?? 'unknown';
}
export async function scanDirectory(dirPath) {
    const patterns = SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`);
    const ignoreDirs = ['node_modules', 'dist', 'build', '.git', '__pycache__', 'venv', '.venv', '.next', '.cache'];
    const files = [];
    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: dirPath,
            ignore: ignoreDirs.map(d => `**/${d}/**`),
            nodir: true,
            absolute: true,
        });
        for (const filePath of matches) {
            try {
                const content = readFileSync(filePath, 'utf-8');
                const ext = extname(filePath);
                const language = detectLanguage(ext);
                let parsed;
                if (language === 'python') {
                    parsed = parsePythonFile(filePath, content);
                }
                else {
                    parsed = parseJavaScriptFile(filePath, content);
                }
                files.push(parsed);
            }
            catch {
                // Skip files we can't read
            }
        }
    }
    return files;
}
export function parseFiles(files) {
    return files.map(({ path, content }) => {
        const ext = extname(path);
        const language = detectLanguage(ext);
        if (language === 'python') {
            return parsePythonFile(path, content);
        }
        return parseJavaScriptFile(path, content);
    });
}
//# sourceMappingURL=index.js.map