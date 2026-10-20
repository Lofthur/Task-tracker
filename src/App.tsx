import { useCallback, useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { CustomersView } from '@/components/CustomersView'
import { EntriesView } from '@/components/EntriesView'
import { ReportsView } from '@/components/ReportsView'
import { TimerBar } from '@/components/TimerBar'
import { api, type Customer, type Entry, type Task } from '@/lib/api'

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [running, setRunning] = useState<Entry | null>(null)
  // Bumped after every mutation so views that fetch their own data reload.
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('entries')

  const refresh = useCallback(() => {
    Promise.all([api.customers(), api.tasks(), api.timer()])
      .then(([c, t, r]) => {
        setCustomers(c)
        setTasks(t)
        setRunning(r)
        setVersion((v) => {
          // First launch with an empty database: send the user to set up customers.
          if (v === 0 && c.length === 0) setTab('customers')
          return v + 1
        })
      })
      .catch((err) => toast.error(`Could not reach the server: ${err.message}`))
  }, [])

  useEffect(() => {
    refresh()
    // Keep multiple open tabs/devices roughly in sync.
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  return (
    <div className="mx-auto grid max-w-4xl gap-6 p-4 md:p-8">
      <header className="flex items-center gap-2">
        <Clock className="size-6" />
        <h1 className="text-xl font-semibold">Time Tracker</h1>
      </header>

      <TimerBar tasks={tasks} running={running} onChange={refresh} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="entries">Time entries</TabsTrigger>
          <TabsTrigger value="customers">Customers & tasks</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4">
          <EntriesView tasks={tasks} version={version} onChange={refresh} />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <CustomersView customers={customers} tasks={tasks} running={running} onChange={refresh} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsView version={version} />
        </TabsContent>
      </Tabs>

      <Toaster richColors />
    </div>
  )
}
