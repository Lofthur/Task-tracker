import express, { type Request, type Response } from 'express'
import { db } from './db.ts'

export const app = express()
app.use(express.json())

type Row = Record<string, unknown>

const nowIso = () => new Date().toISOString()

function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function bad(res: Response, message: string) {
  res.status(400).json({ error: message })
}

const entrySelect = `
  SELECT e.id, e.task_id AS taskId, e.started_at AS startedAt, e.ended_at AS endedAt, e.note,
         t.name AS taskName, c.id AS customerId, c.name AS customerName, c.hourly_rate AS hourlyRate
  FROM time_entries e
  JOIN tasks t ON t.id = e.task_id
  JOIN customers c ON c.id = t.customer_id`

const getEntry = (id: number | bigint) => db.prepare(`${entrySelect} WHERE e.id = ?`).get(id)

// ---- Customers ----

app.get('/api/customers', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT c.id, c.name, c.hourly_rate AS hourlyRate,
                COALESCE(SUM(unixepoch(COALESCE(e.ended_at, ?)) - unixepoch(e.started_at)), 0) AS totalSeconds
         FROM customers c
         LEFT JOIN tasks t ON t.customer_id = c.id
         LEFT JOIN time_entries e ON e.task_id = t.id
         GROUP BY c.id ORDER BY c.name COLLATE NOCASE`,
      )
      .all(nowIso()),
  )
})

app.post('/api/customers', (req, res) => {
  const { name, hourlyRate } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim()) return bad(res, 'name is required')
  const rate = typeof hourlyRate === 'number' ? hourlyRate : null
  const { lastInsertRowid } = db
    .prepare('INSERT INTO customers (name, hourly_rate) VALUES (?, ?)')
    .run(name.trim(), rate)
  res.status(201).json({ id: Number(lastInsertRowid), name: name.trim(), hourlyRate: rate, totalSeconds: 0 })
})

app.patch('/api/customers/:id', (req, res) => {
  const { name, hourlyRate } = req.body ?? {}
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return bad(res, 'invalid name')
  if (hourlyRate !== undefined && hourlyRate !== null && typeof hourlyRate !== 'number')
    return bad(res, 'invalid hourlyRate')
  const id = Number(req.params.id)
  if (name !== undefined) db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name.trim(), id)
  if (hourlyRate !== undefined) db.prepare('UPDATE customers SET hourly_rate = ? WHERE id = ?').run(hourlyRate, id)
  res.json(db.prepare('SELECT id, name, hourly_rate AS hourlyRate FROM customers WHERE id = ?').get(id))
})

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

// ---- Tasks ----

app.get('/api/tasks', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT t.id, t.name, t.customer_id AS customerId, c.name AS customerName, t.archived,
                COALESCE(SUM(unixepoch(COALESCE(e.ended_at, ?)) - unixepoch(e.started_at)), 0) AS totalSeconds
         FROM tasks t
         JOIN customers c ON c.id = t.customer_id
         LEFT JOIN time_entries e ON e.task_id = t.id
         GROUP BY t.id ORDER BY t.archived, c.name COLLATE NOCASE, t.name COLLATE NOCASE`,
      )
      .all(nowIso())
      .map((t: Row) => ({ ...t, archived: Boolean(t.archived) })),
  )
})

app.post('/api/tasks', (req, res) => {
  const { name, customerId } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim()) return bad(res, 'name is required')
  if (!db.prepare('SELECT 1 FROM customers WHERE id = ?').get(Number(customerId)))
    return bad(res, 'unknown customer')
  const { lastInsertRowid } = db
    .prepare('INSERT INTO tasks (customer_id, name) VALUES (?, ?)')
    .run(Number(customerId), name.trim())
  res.status(201).json({ id: Number(lastInsertRowid) })
})

app.patch('/api/tasks/:id', (req, res) => {
  const { name, archived } = req.body ?? {}
  const id = Number(req.params.id)
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return bad(res, 'invalid name')
    db.prepare('UPDATE tasks SET name = ? WHERE id = ?').run(name.trim(), id)
  }
  if (archived !== undefined) db.prepare('UPDATE tasks SET archived = ? WHERE id = ?').run(archived ? 1 : 0, id)
  res.json({ id })
})

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

// ---- Time entries ----

app.get('/api/entries', (req: Request, res) => {
  const where: string[] = ['e.ended_at IS NOT NULL']
  const params: (string | number)[] = []
  const { from, to, customerId, taskId } = req.query
  if (isIso(from)) {
    where.push('e.started_at >= ?')
    params.push(new Date(from).toISOString())
  }
  if (isIso(to)) {
    where.push('e.started_at < ?')
    params.push(new Date(to).toISOString())
  }
  if (customerId) {
    where.push('c.id = ?')
    params.push(Number(customerId))
  }
  if (taskId) {
    where.push('t.id = ?')
    params.push(Number(taskId))
  }
  res.json(db.prepare(`${entrySelect} WHERE ${where.join(' AND ')} ORDER BY e.started_at DESC`).all(...params))
})

app.post('/api/entries', (req, res) => {
  const { taskId, startedAt, endedAt, note } = req.body ?? {}
  if (!isIso(startedAt) || !isIso(endedAt)) return bad(res, 'startedAt and endedAt are required')
  if (Date.parse(endedAt) <= Date.parse(startedAt)) return bad(res, 'end must be after start')
  if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(Number(taskId))) return bad(res, 'unknown task')
  const { lastInsertRowid } = db
    .prepare('INSERT INTO time_entries (task_id, started_at, ended_at, note) VALUES (?, ?, ?, ?)')
    .run(Number(taskId), new Date(startedAt).toISOString(), new Date(endedAt).toISOString(), String(note ?? ''))
  res.status(201).json(getEntry(lastInsertRowid))
})

app.patch('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id)
  const current = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as Row | undefined
  if (!current) return res.status(404).json({ error: 'not found' })
  const { taskId, startedAt, endedAt, note } = req.body ?? {}
  const next = {
    task_id: taskId !== undefined ? Number(taskId) : current.task_id,
    started_at: isIso(startedAt) ? new Date(startedAt).toISOString() : current.started_at,
    ended_at: isIso(endedAt) ? new Date(endedAt).toISOString() : current.ended_at,
    note: note !== undefined ? String(note) : current.note,
  }
  if (next.ended_at && Date.parse(String(next.ended_at)) <= Date.parse(String(next.started_at)))
    return bad(res, 'end must be after start')
  if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(next.task_id as number)) return bad(res, 'unknown task')
  db.prepare('UPDATE time_entries SET task_id = ?, started_at = ?, ended_at = ?, note = ? WHERE id = ?').run(
    next.task_id as number,
    next.started_at as string,
    next.ended_at as string | null,
    next.note as string,
    id,
  )
  res.json(getEntry(id))
})

app.delete('/api/entries/:id', (req, res) => {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

// ---- Running timer ----

const getRunning = () => db.prepare(`${entrySelect} WHERE e.ended_at IS NULL`).get() ?? null

app.get('/api/timer', (_req, res) => {
  res.json(getRunning())
})

app.post('/api/timer/start', (req, res) => {
  const { taskId, note } = req.body ?? {}
  if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(Number(taskId))) return bad(res, 'unknown task')
  const now = nowIso()
  db.exec('BEGIN')
  try {
    // Starting a new timer stops whatever was running.
    db.prepare('UPDATE time_entries SET ended_at = ? WHERE ended_at IS NULL').run(now)
    db.prepare('INSERT INTO time_entries (task_id, started_at, note) VALUES (?, ?, ?)').run(
      Number(taskId),
      now,
      String(note ?? ''),
    )
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  res.status(201).json(getRunning())
})

app.post('/api/timer/stop', (req, res) => {
  const running = getRunning() as Row | null
  if (!running) return res.json(null)
  const { note } = req.body ?? {}
  db.prepare('UPDATE time_entries SET ended_at = ?, note = COALESCE(?, note) WHERE id = ?').run(
    nowIso(),
    typeof note === 'string' ? note : null,
    running.id as number,
  )
  res.json(getEntry(running.id as number))
})

app.patch('/api/timer', (req, res) => {
  const { note } = req.body ?? {}
  db.prepare('UPDATE time_entries SET note = ? WHERE ended_at IS NULL').run(String(note ?? ''))
  res.json(getRunning())
})
