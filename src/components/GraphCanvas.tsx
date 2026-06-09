import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphNode, GraphEdge } from '../types'
import { FileCode, FunctionSquare, Route, Database, Box } from 'lucide-react'

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  onNodeSelect: (id: string | null) => void
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

function getNodeIcon(type: GraphNode['type']) {
  const icons: Record<GraphNode['type'], string> = {
    file: '📄',
    function: '🔧',
    class: '🏛️',
    route: '🔗',
    model: '🗄️',
    config: '⚙️',
  }
  return icons[type] ?? '📁'
}

function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3776ab',
  }
  return colors[lang] ?? '#64748b'
}

function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GraphNode
  const color = getNodeColor(nodeData.type)
  const langColor = getLanguageColor(nodeData.language)

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        selected ? 'shadow-lg scale-105' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderColor: selected ? color : '#334155',
        minWidth: 180,
        boxShadow: selected ? `0 0 20px ${color}40` : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 8, height: 8 }} />

      <div className="px-3 py-2.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{getNodeIcon(nodeData.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nodeData.label}</p>
            {nodeData.filePath && nodeData.type !== 'file' && (
              <p className="text-[10px] text-slate-500 truncate">{nodeData.filePath}</p>
            )}
          </div>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: langColor }}
            title={nodeData.language}
          />
        </div>

        {/* Details row for file nodes */}
        {nodeData.type === 'file' && nodeData.details && (
          <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
            <span>{nodeData.details.entityCount as number ?? 0} entities</span>
            <span>&middot;</span>
            <span>{nodeData.details.importCount as number ?? 0} imports</span>
          </div>
        )}

        {/* Route details */}
        {nodeData.type === 'route' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                background: `${color}20`,
                color,
              }}
            >
              {nodeData.details.method as string ?? 'GET'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 truncate">
              {nodeData.details.path as string ?? '/'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function FlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as { type?: string; label?: string }
  const edgeType = edgeData?.type ?? 'default'
  const color = edgeType === 'import' ? '#6366f1' : edgeType === 'route' ? '#ef4444' : edgeType === 'depends' ? '#22c55e' : '#64748b'

  const sourceControlX = sourceX + (sourcePosition === Position.Right ? 50 : -50)
  const targetControlX = targetX + (targetPosition === Position.Left ? -50 : 50)

  const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={selected ? color : `${color}60`}
        strokeWidth={selected ? 3 : 1.5}
        strokeDasharray={edgeType === 'depends' ? '4 4' : undefined}
        className="transition-all"
      />
      {selected && edgeData?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 8}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontFamily="monospace"
        >
          {edgeData.label}
        </text>
      )}
      <circle cx={targetX} cy={targetY} r={3} fill={color} />
    </g>
  )
}

const nodeTypes = { custom: FlowNode }
const edgeTypes = { custom: FlowEdge }

const DEFAULT_POSITION = { x: 0, y: 0 }

export function GraphCanvas({ nodes: rawNodes, edges: rawEdges, selectedNodeId, onNodeSelect }: Props) {
  const layoutedNodes = useMemo(() => {
    const layerOrder: GraphNode['type'][] = ['config', 'file', 'model', 'class', 'function', 'route']
    const sorted = [...rawNodes].sort((a, b) => {
      const ai = layerOrder.indexOf(a.type)
      const bi = layerOrder.indexOf(b.type)
      return ai - bi
    })

    const cols = 4
    const spacingX = 280
    const spacingY = 160
    const nodesByType: Record<string, GraphNode[]> = {}

    for (const n of sorted) {
      if (!nodesByType[n.type]) nodesByType[n.type] = []
      nodesByType[n.type]!.push(n)
    }

    const flowNodes: Node[] = []
    let maxY = 0

    for (const type of layerOrder) {
      const typeNodes = nodesByType[type] ?? []
      const row = maxY
      for (let i = 0; i < typeNodes.length; i++) {
        const col = i % cols
        const r = Math.floor(i / cols)
        flowNodes.push({
          id: typeNodes[i]!.id,
          type: 'custom',
          position: {
            x: col * spacingX + 40,
            y: row + r * spacingY + 20,
          },
          data: typeNodes[i]! as unknown as Record<string, unknown>,
        })
      }
      if (typeNodes.length > 0) {
        maxY += Math.ceil(typeNodes.length / cols) * spacingY + 40
      }
    }

    return flowNodes
  }, [rawNodes])

  const mappedEdges: Edge[] = useMemo(() => {
    return rawEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      animated: e.type === 'import',
      data: { type: e.type, label: e.label },
    }))
  }, [rawEdges])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(mappedEdges)

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id)
  }, [onNodeSelect])

  const onPaneClick = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.1}
      maxZoom={2}
      colorMode="dark"
    >
      <Background color="#1e293b" gap={24} />
      <Controls
        className="!bg-surface-800 !border-surface-700 [&_button]:!text-slate-300 [&_button]:hover:!bg-surface-600"
      />
      <MiniMap
        nodeColor={(node) => {
          const d = node.data as unknown as GraphNode
          return getNodeColor(d?.type)
        }}
        maskColor="#020617"
        className="!border-surface-700 !rounded-lg"
        style={{ background: '#0f172a' }}
      />
    </ReactFlow>
  )
}
