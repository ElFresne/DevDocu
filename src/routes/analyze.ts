import { Router, type Request, type Response } from 'express'
import { scanDirectory, parseFiles } from '../parser/index.js'
import { buildGraph } from '../analyzer/graph-builder.js'

const router = Router()

router.post('/analyze/path', async (req: Request, res: Response) => {
  try {
    const { path: projectPath } = req.body

    if (!projectPath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    const files = await scanDirectory(projectPath)

    if (files.length === 0) {
      return res.status(404).json({ error: 'No supported source files found in the given path' })
    }

    const result = buildGraph(files, projectPath)

    return res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: `Analysis failed: ${message}` })
  }
})

router.post('/analyze/files', async (req: Request, res: Response) => {
  try {
    const { files: rawFiles, root } = req.body as {
      files: Array<{ path: string; content: string }>
      root?: string
    }

    if (!rawFiles || !Array.isArray(rawFiles) || rawFiles.length === 0) {
      return res.status(400).json({ error: 'Files array is required and must not be empty' })
    }

    const files = parseFiles(rawFiles)
    const projectRoot = root ?? '/project'
    const result = buildGraph(files, projectRoot)

    return res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: `Analysis failed: ${message}` })
  }
})

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
