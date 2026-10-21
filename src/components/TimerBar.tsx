import { useEffect, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TaskSelect } from '@/components/TaskSelect'
import { useNow } from '@/hooks/useNow'
import { api, type Entry, type Task } from '@/lib/api'
import { entrySeconds, formatClock } from '@/lib/time'

type Props = {
  tasks: Task[]
  running: Entry | null
  onChange: () => void
}

export function TimerBar({ tasks, running, onChange }: Props) {
  const now = useNow(running !== null)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (running) {
      setTaskId(running.taskId)
      setNote(running.note)
    }
  }, [running])

  useEffect(() => {
    document.title = running ? `${formatClock(entrySeconds(running, now))} · ${running.taskName}` : 'Time Tracker'
  }, [running, now])

  async function start() {
    if (!taskId) return
    try {
      await api.startTimer(taskId, note)
      onChange()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function stop() {
    try {
      await api.stopTimer(note)
      setNote('')
      onChange()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function switchTask(id: number) {
    setTaskId(id)
    // Picking another task while the timer runs closes the current entry and starts a new one.
    if (running && running.taskId !== id) {
      try {
        await api.startTimer(id, '')
        setNote('')
        onChange()
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
  }

  return (
    <Card className={running ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
        <TaskSelect tasks={tasks} value={taskId} onChange={switchTask} className="w-full md:w-64" />
        <Input
          placeholder="What are you working on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => running && note !== running.note && api.updateTimerNote(note).then(onChange)}
          onKeyDown={(e) => e.key === 'Enter' && !running && start()}
          className="flex-1"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-24 text-right font-mono text-2xl tabular-nums">
            {formatClock(running ? entrySeconds(running, now) : 0)}
          </span>
          {running ? (
            <Button onClick={stop} variant="destructive" size="lg">
              <Square /> Stop
            </Button>
          ) : (
            <Button onClick={start} disabled={!taskId} size="lg">
              <Play /> Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
