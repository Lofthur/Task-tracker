import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { rangeLabels, type RangeKey } from '@/lib/time'

export function RangeSelect({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RangeKey)}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(rangeLabels).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
