import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TaskSelect } from '@/components/TaskSelect'
import { api, type Entry, type Task } from '@/lib/api'
import { toLocalInput } from '@/lib/time'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  /** Entry to edit; when absent the dialog creates a new manual entry. */
  entry?: Entry | null
  onSaved: () => void
}

export function EntryDialog({ open, onOpenChange, tasks, entry, onSaved }: Props) {
  const [taskId, setTaskId] = useState<number | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (entry) {
      setTaskId(entry.taskId)
      setStart(toLocalInput(entry.startedAt))
      setEnd(entry.endedAt ? toLocalInput(entry.endedAt) : '')
      setNote(entry.note)
    } else {
      const now = new Date()
      setStart(toLocalInput(new Date(now.getTime() - 60 * 60 * 1000).toISOString()))
      setEnd(toLocalInput(now.toISOString()))
      setNote('')
    }
  }, [open, entry])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!taskId) return toast.error('Choose a task')
    const data = {
      taskId,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(end).toISOString(),
      note,
    }
    try {
      if (entry) await api.updateEntry(entry.id, data)
      else await api.createEntry(data)
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{entry ? 'Edit time entry' : 'Add time manually'}</DialogTitle>
            <DialogDescription>For when you forgot to start the timer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="entry-task">Task</Label>
            <TaskSelect id="entry-task" tasks={tasks} value={taskId} onChange={setTaskId} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="entry-start">Start</Label>
              <Input id="entry-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-end">End</Label>
              <Input id="entry-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="entry-note">Note</Label>
            <Textarea id="entry-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
