import { useState, useCallback } from 'react'
import type { AnalysisResult } from './types'
import { analyzePath, analyzeFiles } from './api'
import { FileUploader } from './components/FileUploader'
import { GraphCanvas } from './components/GraphCanvas'
import { Sidebar } from './components/Sidebar'
import { NodeDetails } from './components/NodeDetails'
import { FileCode, GitBranch, Loader2, Network } from 'lucide-react'

type ViewMode = 'upload' | 'result'

export default function App() {
  const [view, setView] = useState<ViewMode>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const handlePathAnalyze = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzePath(path)
      setResult(data)
      setView('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFilesAnalyze = useCallback(async (files: Array<{ path: string; content: string }>, root?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeFiles(files, root)
      setResult(data)
      setView('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    setView('upload')
    setResult(null)
    setSelectedNodeId(null)
    setError(null)
  }, [])

  const selectedNode = selectedNodeId && result
    ? result.nodes.find(n => n.id === selectedNodeId) ?? null
    : null

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-700 bg-surface-800/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Network className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">DevDocu</h1>
            <p className="text-xs text-slate-400 -mt-0.5">Architecture Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {view === 'result' && result && (
            <>
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" />
                  {result.summary.totalFiles} files
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {result.summary.totalImports} deps
                </span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs px-3 py-1.5 rounded-md bg-surface-700 hover:bg-surface-600 text-slate-300 transition-colors"
              >
                New Analysis
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {view === 'upload' ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Visualize Your Code Architecture</h2>
                <p className="text-slate-400 text-sm">
                  Upload your project or enter a local path to generate an interactive dependency graph
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center gap-4 py-16">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-slate-400 text-sm">Analyzing project structure...</p>
                  <div className="w-48 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-indigo-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                  </div>
                </div>
              ) : (
                <FileUploader onPathAnalyze={handlePathAnalyze} onFilesAnalyze={handleFilesAnalyze} />
              )}
            </div>
          </div>
        ) : result ? (
          <>
            <div className="flex-1 relative">
              <GraphCanvas
                nodes={result.nodes}
                edges={result.edges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            </div>
            <aside className="w-80 border-l border-surface-700 bg-surface-800/50 overflow-y-auto hidden lg:block">
              {selectedNode ? (
                <NodeDetails node={selectedNode} allNodes={result.nodes} allEdges={result.edges} />
              ) : (
                <Sidebar summary={result.summary} files={result.files} />
              )}
            </aside>
          </>
        ) : null}
      </main>
    </div>
  )
}
