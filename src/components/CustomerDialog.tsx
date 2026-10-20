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
import { api, type Customer } from '@/lib/api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSaved: () => void
}

export function CustomerDialog({ open, onOpenChange, customer, onSaved }: Props) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')

  useEffect(() => {
    if (!open) return
    setName(customer?.name ?? '')
    setRate(customer?.hourlyRate != null ? String(customer.hourlyRate) : '')
  }, [open, customer])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const data = { name, hourlyRate: rate.trim() === '' ? null : Number(rate) }
    try {
      if (customer) await api.updateCustomer(customer.id, data)
      else await api.createCustomer(data)
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
            <DialogTitle>{customer ? 'Edit customer' : 'New customer'}</DialogTitle>
            <DialogDescription>The hourly rate is optional and only used in reports.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-rate">Hourly rate</Label>
            <Input
              id="customer-rate"
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
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
