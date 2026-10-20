import { useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CustomerDialog } from '@/components/CustomerDialog'
import { api, type Customer, type Entry, type Task } from '@/lib/api'
import { formatDuration } from '@/lib/time'

type Props = {
  customers: Customer[]
  tasks: Task[]
  running: Entry | null
  onChange: () => void
}

export function CustomersView({ customers, tasks, running, onChange }: Props) {
  const [editing, setEditing] = useState<Customer | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openDialog(customer: Customer | null) {
    setEditing(customer)
    setDialogOpen(true)
  }

  async function removeCustomer(c: Customer) {
    if (!confirm(`Delete ${c.name} and all of its tasks and tracked time?`)) return
    await api.deleteCustomer(c.id)
    onChange()
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog(null)}>
          <Plus /> New customer
        </Button>
      </div>

      {customers.length === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Add your first customer, then create the tasks you work on for them.
        </p>
      )}

      {customers.map((c) => (
        <Card key={c.id} className="gap-3">
          <CardHeader>
            <CardTitle>{c.name}</CardTitle>
            <CardDescription>
              {formatDuration(c.totalSeconds)} tracked
              {c.hourlyRate != null && ` · ${c.hourlyRate}/h`}
            </CardDescription>
            <CardAction className="flex">
              <Button size="icon" variant="ghost" title="Edit customer" onClick={() => openDialog(c)}>
                <Pencil />
              </Button>
              <Button size="icon" variant="ghost" title="Delete customer" onClick={() => removeCustomer(c)}>
                <Trash2 />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-1">
            {tasks
              .filter((t) => t.customerId === c.id)
              .map((t) => (
                <TaskRow key={t.id} task={t} isRunning={running?.taskId === t.id} onChange={onChange} />
              ))}
            <NewTaskForm customerId={c.id} onCreated={onChange} />
          </CardContent>
        </Card>
      ))}

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} onSaved={onChange} />
    </div>
  )
}

function TaskRow({ task, isRunning, onChange }: { task: Task; isRunning: boolean; onChange: () => void }) {
  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      onChange()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className={`flex items-center gap-2 rounded-md px-2 py-1 ${task.archived ? 'opacity-50' : ''}`}>
      <span className="flex-1 truncate">{task.name}</span>
      {isRunning && <Badge className="bg-emerald-600">Running</Badge>}
      {task.archived && <Badge variant="outline">Archived</Badge>}
      <span className="text-muted-foreground w-20 text-right font-mono text-sm tabular-nums">
        {formatDuration(task.totalSeconds)}
      </span>
      {!task.archived && (
        <Button
          size="icon"
          variant="ghost"
          title="Start timer"
          disabled={isRunning}
          onClick={() => run(() => api.startTimer(task.id))}
        >
          <Play />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        title={task.archived ? 'Restore' : 'Archive'}
        onClick={() => run(() => api.updateTask(task.id, { archived: !task.archived }))}
      >
        {task.archived ? <ArchiveRestore /> : <Archive />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Delete task"
        onClick={() => confirm(`Delete "${task.name}" and its tracked time?`) && run(() => api.deleteTask(task.id))}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function NewTaskForm({ customerId, onCreated }: { customerId: number; onCreated: () => void }) {
  const [name, setName] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    // Clear right away so typing the next task isn't wiped when this request finishes.
    setName('')
    try {
      await api.createTask({ name, customerId })
      onCreated()
    } catch (err) {
      setName(name)
      toast.error((err as Error).message)
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <Input placeholder="New task…" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" variant="outline" disabled={!name.trim()}>
        <Plus /> Add task
      </Button>
    </form>
  )
}
