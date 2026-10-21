export type Customer = {
  id: number
  name: string
  hourlyRate: number | null
  totalSeconds: number
}

export type Task = {
  id: number
  name: string
  customerId: number
  customerName: string
  archived: boolean
  totalSeconds: number
}

export type Entry = {
  id: number
  taskId: number
  taskName: string
  customerId: number
  customerName: string
  hourlyRate: number | null
  startedAt: string
  endedAt: string | null
  note: string
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  customers: () => request<Customer[]>('GET', '/customers'),
  createCustomer: (data: { name: string; hourlyRate: number | null }) =>
    request<Customer>('POST', '/customers', data),
  updateCustomer: (id: number, data: { name?: string; hourlyRate?: number | null }) =>
    request<Customer>('PATCH', `/customers/${id}`, data),
  deleteCustomer: (id: number) => request<void>('DELETE', `/customers/${id}`),

  tasks: () => request<Task[]>('GET', '/tasks'),
  createTask: (data: { name: string; customerId: number }) => request<{ id: number }>('POST', '/tasks', data),
  updateTask: (id: number, data: { name?: string; archived?: boolean }) =>
    request<{ id: number }>('PATCH', `/tasks/${id}`, data),
  deleteTask: (id: number) => request<void>('DELETE', `/tasks/${id}`),

  entries: (params: { from?: Date; to?: Date } = {}) => {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from.toISOString())
    if (params.to) q.set('to', params.to.toISOString())
    return request<Entry[]>('GET', `/entries?${q}`)
  },
  createEntry: (data: { taskId: number; startedAt: string; endedAt: string; note: string }) =>
    request<Entry>('POST', '/entries', data),
  updateEntry: (id: number, data: Partial<{ taskId: number; startedAt: string; endedAt: string; note: string }>) =>
    request<Entry>('PATCH', `/entries/${id}`, data),
  deleteEntry: (id: number) => request<void>('DELETE', `/entries/${id}`),

  timer: () => request<Entry | null>('GET', '/timer'),
  startTimer: (taskId: number, note = '') => request<Entry>('POST', '/timer/start', { taskId, note }),
  stopTimer: (note?: string) => request<Entry | null>('POST', '/timer/stop', { note }),
  updateTimerNote: (note: string) => request<Entry | null>('PATCH', '/timer', { note }),
}
