import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Task } from '@/lib/api'

type Props = {
  tasks: Task[]
  value: number | null
  onChange: (taskId: number) => void
  className?: string
  id?: string
}

/** Task picker grouped by customer. Archived tasks are hidden unless currently selected. */
export function TaskSelect({ tasks, value, onChange, className, id }: Props) {
  const visible = tasks.filter((t) => !t.archived || t.id === value)
  const groups = new Map<string, Task[]>()
  for (const t of visible) groups.set(t.customerName, [...(groups.get(t.customerName) ?? []), t])

  return (
    <Select value={value ? String(value) : ''} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={tasks.length ? 'Choose a task…' : 'Add a task first'} />
      </SelectTrigger>
      <SelectContent>
        {[...groups].map(([customer, items]) => (
          <SelectGroup key={customer}>
            <SelectLabel>{customer}</SelectLabel>
            {items.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
