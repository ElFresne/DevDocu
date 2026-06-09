import type { AnalysisResult } from './types'

const API_BASE = '/api'

export async function analyzePath(path: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze/path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Analysis failed')
  }
  return res.json()
}

export async function analyzeFiles(
  files: Array<{ path: string; content: string }>,
  root?: string
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, root }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Analysis failed')
  }
  return res.json()
}
