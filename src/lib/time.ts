export function entrySeconds(e: { startedAt: string; endedAt: string | null }, now = Date.now()) {
  const end = e.endedAt ? Date.parse(e.endedAt) : now
  return Math.max(0, Math.floor((end - Date.parse(e.startedAt)) / 1000))
}

/** 1:05:09 style clock, used for the running timer. */
export function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 2h 15m style duration, used in lists. */
export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Decimal hours (2.25), what invoices usually want. */
export function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(2)
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })
}

export function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Value for an <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

/** Weeks start on Monday. */
export function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  return addDays(startOfDay(d), -day)
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export type RangeKey = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month'

export const rangeLabels: Record<RangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'last-week': 'Last week',
  'this-month': 'This month',
  'last-month': 'Last month',
}

export function rangeFor(key: RangeKey, now = new Date()): { from: Date; to: Date } {
  switch (key) {
    case 'today':
      return { from: startOfDay(now), to: addDays(startOfDay(now), 1) }
    case 'this-week':
      return { from: startOfWeek(now), to: addDays(startOfWeek(now), 7) }
    case 'last-week':
      return { from: addDays(startOfWeek(now), -7), to: startOfWeek(now) }
    case 'this-month':
      return { from: startOfMonth(now), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    case 'last-month':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: startOfMonth(now) }
  }
}
