import express from 'express'
import cors from 'cors'
import analyzeRouter from './routes/analyze.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use('/api', analyzeRouter)

app.get('/', (_req, res) => {
  res.json({
    name: 'DevDocu Backend',
    version: '1.0.0',
    description: 'Code architecture analyzer & graph generator',
    endpoints: {
      'POST /api/analyze/path': 'Analyze a local directory path',
      'POST /api/analyze/files': 'Analyze provided file contents',
      'GET /api/health': 'Health check',
    },
  })
})

app.listen(PORT, () => {
  console.log(`DevDocu backend running on http://localhost:${PORT}`)
})
