import { useEffect, useState } from 'react'
import { Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EntryDialog } from '@/components/EntryDialog'
import { RangeSelect } from '@/components/RangeSelect'
import { api, type Entry, type Task } from '@/lib/api'
import { dayKey, entrySeconds, formatDay, formatDuration, formatTime, rangeFor, type RangeKey } from '@/lib/time'

type Props = {
  tasks: Task[]
  version: number
  onChange: () => void
}

export function EntriesView({ tasks, version, onChange }: Props) {
  const [range, setRange] = useState<RangeKey>('this-week')
  const [entries, setEntries] = useState<Entry[]>([])
  const [editing, setEditing] = useState<Entry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    api.entries(rangeFor(range)).then(setEntries, (err) => toast.error(err.message))
  }, [range, version])

  const days = new Map<string, Entry[]>()
  for (const e of entries) days.set(dayKey(e.startedAt), [...(days.get(dayKey(e.startedAt)) ?? []), e])
  const total = entries.reduce((sum, e) => sum + entrySeconds(e), 0)

  async function remove(entry: Entry) {
    if (!confirm('Delete this time entry?')) return
    await api.deleteEntry(entry.id)
    onChange()
  }

  async function resume(entry: Entry) {
    await api.startTimer(entry.taskId, entry.note)
    onChange()
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <RangeSelect value={range} onChange={setRange} />
          <span className="text-muted-foreground text-sm">Total {formatDuration(total)}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          disabled={tasks.length === 0}
        >
          <Plus /> Add time
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">No time tracked in this period yet.</p>
      )}

      {[...days].map(([key, items]) => (
        <Card key={key} className="gap-2 py-4">
          <CardHeader>
            <CardTitle>{formatDay(new Date(items[0].startedAt))}</CardTitle>
            <CardAction className="text-muted-foreground text-sm">
              {formatDuration(items.reduce((s, e) => s + entrySeconds(e), 0))}
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y">
            {items.map((e) => (
              <div key={e.id} className="group flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {e.taskName} <span className="text-muted-foreground font-normal">· {e.customerName}</span>
                  </div>
                  {e.note && <CardDescription className="truncate">{e.note}</CardDescription>}
                </div>
                <span className="text-muted-foreground hidden text-sm tabular-nums sm:inline">
                  {formatTime(e.startedAt)} – {e.endedAt && formatTime(e.endedAt)}
                </span>
                <span className="w-16 text-right font-mono text-sm tabular-nums">{formatDuration(entrySeconds(e))}</span>
                <div className="flex opacity-60 group-hover:opacity-100">
                  <Button size="icon" variant="ghost" title="Continue this task" onClick={() => resume(e)}>
                    <Play />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Edit"
                    onClick={() => {
                      setEditing(e)
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(e)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <EntryDialog open={dialogOpen} onOpenChange={setDialogOpen} tasks={tasks} entry={editing} onSaved={onChange} />
    </div>
  )
}
