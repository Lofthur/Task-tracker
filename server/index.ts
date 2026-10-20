import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { app } from './app.ts'

const dist = path.join(import.meta.dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`Time tracker API listening on http://localhost:${port}`))
