import type { AnalysisSummary, FileNode } from '../types'
import {
  BarChart3,
  FileCode,
  FunctionSquare,
  Box,
  Route,
  GitBranch,
  Database,
  ArrowUpRight,
  Layers,
  Hash,
} from 'lucide-react'

interface Props {
  summary: AnalysisSummary
  files: FileNode[]
}

export function Sidebar({ summary, files }: Props) {
  const stats = [
    { label: 'Files', value: summary.totalFiles, icon: FileCode, color: '#6366f1' },
    { label: 'Functions', value: summary.totalFunctions, icon: FunctionSquare, color: '#22c55e' },
    { label: 'Classes', value: summary.totalClasses, icon: Box, color: '#f59e0b' },
    { label: 'API Routes', value: summary.totalRoutes, icon: Route, color: '#ef4444' },
    { label: 'Dependencies', value: summary.totalImports, icon: GitBranch, color: '#06b6d4' },
  ]

  const languages = files.reduce((acc, f) => {
    acc[f.language] = (acc[f.language] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topFiles = [...files]
    .sort((a, b) => b.entities.length - a.entities.length)
    .slice(0, 10)

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Summary stats */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" />
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div
              key={s.label}
              className="p-2.5 rounded-lg bg-surface-700/50 border border-surface-600/50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3 h-3" style={{ color: s.color }} />
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      {Object.keys(languages).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            Languages
          </h3>
          <div className="space-y-1.5">
            {Object.entries(languages).map(([lang, count]) => (
              <div key={lang} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / files.length) * 100}%`,
                      background: lang === 'python' ? '#3776ab' : lang === 'typescript' ? '#3178c6' : '#f7df1e',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400 capitalize w-16">{lang}</span>
                <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top files by complexity */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Hash className="w-3 h-3" />
          Most Complex Files
        </h3>
        <div className="space-y-1">
          {topFiles.map(f => {
            const name = f.path.split(/[/\\]/).pop() ?? f.path
            return (
              <div
                key={f.path}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-700/30 text-xs hover:bg-surface-700/50 transition-colors cursor-default"
              >
                <ArrowUpRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-300 truncate flex-1">{name}</span>
                <span className="text-slate-500 shrink-0">{f.entities.length} entities</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 text-center pt-4 border-t border-surface-700">
        Click a node to inspect details
      </div>
    </div>
  )
}
