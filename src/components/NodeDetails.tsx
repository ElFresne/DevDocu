import type { GraphNode, GraphEdge } from '../types'
import {
  X,
  FileCode,
  FunctionSquare,
  Route,
  Database,
  Box,
  GitBranch,
  ExternalLink,
  Hash,
  Code2,
} from 'lucide-react'

interface Props {
  node: GraphNode
  allNodes: GraphNode[]
  allEdges: GraphEdge[]
}

function getNodeIcon(type: GraphNode['type']) {
  switch (type) {
    case 'file': return FileCode
    case 'function': return FunctionSquare
    case 'class': return Box
    case 'route': return Route
    case 'model': return Database
    case 'config': return Code2
  }
}

function getNodeColor(type: GraphNode['type']): string {
  const colors: Record<GraphNode['type'], string> = {
    file: '#6366f1',
    function: '#22c55e',
    class: '#f59e0b',
    route: '#ef4444',
    model: '#06b6d4',
    config: '#8b5cf6',
  }
  return colors[type] ?? '#64748b'
}

export function NodeDetails({ node, allNodes, allEdges }: Props) {
  const Icon = getNodeIcon(node.type)
  const color = getNodeColor(node.type)

  const connectedEdges = allEdges.filter(e => e.source === node.id || e.target === node.id)
  const dependencies = connectedEdges
    .filter(e => e.source === node.id)
    .map(e => ({ node: allNodes.find(n => n.id === e.target), edge: e }))
    .filter(d => d.node)
  const dependents = connectedEdges
    .filter(e => e.target === node.id)
    .map(e => ({ node: allNodes.find(n => n.id === e.source), edge: e }))
    .filter(d => d.node)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{node.label}</h3>
          <p className="text-xs text-slate-500 truncate">{node.filePath}</p>
        </div>
      </div>

      {/* Type & Language badges */}
      <div className="flex gap-2">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
          style={{ background: `${color}20`, color }}
        >
          {node.type}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
          {node.language}
        </span>
      </div>

      {/* Details */}
      {node.details && Object.keys(node.details).length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</h4>
          <div className="space-y-1">
            {Object.entries(node.details).map(([key, value]) => {
              if (key === 'entityCount' || key === 'importCount' || key === 'fullPath' || key === 'language') return null
              const displayValue = Array.isArray(value)
                ? value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
                : typeof value === 'object'
                  ? JSON.stringify(value, null, 1)
                  : String(value)
              return (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 capitalize shrink-0 min-w-[60px]">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-slate-300 font-mono text-[10px] break-all leading-relaxed">
                    {displayValue.length > 120 ? displayValue.slice(0, 120) + '...' : displayValue}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dependencies (outgoing edges) */}
      {dependencies.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" />
            Depends on ({dependencies.length})
          </h4>
          <div className="space-y-1">
            {dependencies.map(({ node: depNode, edge }) => (
              <div
                key={edge.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-700/50 text-xs"
              >
                <span className="text-slate-500 text-[10px] font-mono">{edge.label}</span>
                <span className="text-slate-300 truncate">{depNode!.label}</span>
                <span className="text-slate-600 text-[10px] shrink-0 ml-auto">{depNode!.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependents (incoming edges) */}
      {dependents.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Used by ({dependents.length})
          </h4>
          <div className="space-y-1">
            {dependents.map(({ node: depNode, edge }) => (
              <div
                key={edge.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-700/50 text-xs"
              >
                <span className="text-slate-300 truncate">{depNode!.label}</span>
                <span className="text-slate-600 text-[10px] shrink-0 ml-auto">{depNode!.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line number */}
      {(node.details?.line as number) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-surface-700">
          <Hash className="w-3 h-3" />
          Line {(node.details.line as number)}
        </div>
      )}
    </div>
  )
}
