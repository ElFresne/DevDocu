import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Upload, Folder, Code, FileWarning } from 'lucide-react'

interface Props {
  onPathAnalyze: (path: string) => void
  onFilesAnalyze: (files: Array<{ path: string; content: string }>, root?: string) => void
}

const SUPPORTED_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py'])

export function FileUploader({ onPathAnalyze, onFilesAnalyze }: Props) {
  const [path, setPath] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Array<{ path: string; content: string }> | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (path.trim()) {
      onPathAnalyze(path.trim())
    }
  }

  const readFile = (file: File): Promise<{ path: string; content: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({
        path: (file as any).webkitRelativePath || file.name,
        content: reader.result as string,
      })
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const processFiles = async (fileList: FileList) => {
    const files: Array<{ path: string; content: string }> = []
    const unsupported: string[] = []

    for (const file of Array.from(fileList)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!SUPPORTED_EXTS.has(ext)) {
        unsupported.push(file.name)
        continue
      }
      try {
        const result = await readFile(file)
        files.push(result)
      } catch {
        unsupported.push(file.name)
      }
    }

    if (files.length === 0) {
      setDragError('No supported source files found. Supported: .js, .ts, .jsx, .tsx, .py, .mjs, .cjs')
      return
    }

    setSelectedFiles(files)
    setDragError(unsupported.length > 0
      ? `Ignored ${unsupported.length} unsupported file(s)`
      : null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    setDragError(null)
    const items = e.dataTransfer.items
    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry?.isDirectory) {
            // Directory dropped - read recursively
            const reader = (entry as any).createReader()
            const allFiles: File[] = []
            const readEntries = (entries: any[]) => {
              for (const entry of entries) {
                if (entry.isFile) {
                  entry.file((file: File) => {
                    Object.defineProperty(file, 'webkitRelativePath', {
                      value: entry.fullPath.slice(1),
                    })
                    allFiles.push(file)
                  })
                } else if (entry.isDirectory) {
                  const dirReader = entry.createReader()
                  dirReader.readEntries((entries: any[]) => readEntries(entries))
                }
              }
            }
            reader.readEntries((entries: any[]) => {
              readEntries(entries)
              setTimeout(() => {
                if (allFiles.length > 0) {
                  const dt = new DataTransfer()
                  allFiles.forEach(f => dt.items.add(f))
                  processFiles(dt.files)
                }
              }, 100)
            })
            return
          }
        }
      }
    }
    if (e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    setDragError(null)
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files)
    }
  }

  const handleAnalyzeDropped = () => {
    if (selectedFiles) {
      onFilesAnalyze(selectedFiles)
    }
  }

  return (
    <div className="space-y-6">
      {/* Path input */}
      <form onSubmit={handlePathSubmit} className="space-y-2">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Local Project Path
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="e.g. C:\Projects\my-api or /home/user/project"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!path.trim()}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-700 disabled:text-slate-600 text-white text-sm font-medium transition-colors"
          >
            Analyze
          </button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-surface-900 text-slate-500">or</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-indigo-500 bg-indigo-500/5'
            : selectedFiles
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-surface-600 hover:border-surface-500 bg-surface-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.py"
          className="hidden"
          onChange={handleFileInput}
          /* @ts-ignore */
          webkitdirectory=""
        />

        {selectedFiles ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Code className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-green-400 font-medium">{selectedFiles.length} files loaded</p>
            <p className="text-xs text-slate-500">
              {selectedFiles.filter(f => f.path.endsWith('.py')).length} Python &middot;
              {selectedFiles.filter(f => !f.path.endsWith('.py')).length} JS/TS
            </p>
            <button
              onClick={e => { e.stopPropagation(); handleAnalyzeDropped() }}
              className="mt-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Analyze Files
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm text-slate-300 font-medium">
              Drop your project folder here
            </p>
            <p className="text-xs text-slate-500">
              or click to browse &middot; Supports .js, .ts, .jsx, .tsx, .py
            </p>
          </div>
        )}
      </div>

      {dragError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <FileWarning className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">{dragError}</p>
        </div>
      )}
    </div>
  )
}
