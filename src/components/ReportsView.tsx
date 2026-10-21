import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RangeSelect } from '@/components/RangeSelect'
import { api, type Entry } from '@/lib/api'
import { dayKey, entrySeconds, formatDuration, formatHours, rangeFor, type RangeKey } from '@/lib/time'

type TaskTotal = { taskName: string; seconds: number }
type CustomerTotal = { customerName: string; hourlyRate: number | null; seconds: number; tasks: TaskTotal[] }

function summarize(entries: Entry[]): CustomerTotal[] {
  const customers = new Map<number, CustomerTotal & { taskMap: Map<number, TaskTotal> }>()
  for (const e of entries) {
    const seconds = entrySeconds(e)
    let c = customers.get(e.customerId)
    if (!c) {
      c = { customerName: e.customerName, hourlyRate: e.hourlyRate, seconds: 0, tasks: [], taskMap: new Map() }
      customers.set(e.customerId, c)
    }
    c.seconds += seconds
    const t = c.taskMap.get(e.taskId) ?? { taskName: e.taskName, seconds: 0 }
    t.seconds += seconds
    c.taskMap.set(e.taskId, t)
  }
  return [...customers.values()]
    .map(({ taskMap, ...c }) => ({ ...c, tasks: [...taskMap.values()].sort((a, b) => b.seconds - a.seconds) }))
    .sort((a, b) => b.seconds - a.seconds)
}

const money = (seconds: number, rate: number | null) => (rate == null ? '' : ((seconds / 3600) * rate).toFixed(2))

function exportCsv(entries: Entry[], range: RangeKey) {
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`
  const rows = [
    ['Date', 'Customer', 'Task', 'Start', 'End', 'Hours', 'Amount', 'Note'],
    ...[...entries].reverse().map((e) => {
      const seconds = entrySeconds(e)
      return [
        dayKey(e.startedAt),
        e.customerName,
        e.taskName,
        new Date(e.startedAt).toLocaleTimeString(),
        e.endedAt ? new Date(e.endedAt).toLocaleTimeString() : '',
        formatHours(seconds),
        money(seconds, e.hourlyRate),
        e.note,
      ]
    }),
  ]
  const csv = rows.map((r) => r.map(quote).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `time-${range}-${dayKey(new Date().toISOString())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsView({ version }: { version: number }) {
  const [range, setRange] = useState<RangeKey>('this-month')
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    api.entries(rangeFor(range)).then(setEntries, (err) => toast.error(err.message))
  }, [range, version])

  const summary = useMemo(() => summarize(entries), [entries])
  const totalSeconds = summary.reduce((s, c) => s + c.seconds, 0)
  const totalAmount = summary.reduce((s, c) => s + (c.hourlyRate == null ? 0 : (c.seconds / 3600) * c.hourlyRate), 0)

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <RangeSelect value={range} onChange={setRange} />
        <Button variant="outline" onClick={() => exportCsv(entries, range)} disabled={entries.length === 0}>
          <Download /> Export CSV
        </Button>
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer / task</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    Nothing tracked in this period.
                  </TableCell>
                </TableRow>
              )}
              {summary.map((c) => [
                <TableRow key={c.customerName} className="bg-muted/40 font-medium">
                  <TableCell>{c.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(c.seconds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHours(c.seconds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.seconds, c.hourlyRate)}</TableCell>
                </TableRow>,
                ...c.tasks.map((t) => (
                  <TableRow key={`${c.customerName}/${t.taskName}`}>
                    <TableCell className="text-muted-foreground pl-6">{t.taskName}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatDuration(t.seconds)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatHours(t.seconds)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {money(t.seconds, c.hourlyRate)}
                    </TableCell>
                  </TableRow>
                )),
              ])}
            </TableBody>
            {summary.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(totalSeconds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHours(totalSeconds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totalAmount ? totalAmount.toFixed(2) : ''}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
