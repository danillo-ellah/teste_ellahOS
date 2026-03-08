'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJobShootingDates } from '@/hooks/useJobShootingDates'

interface DiaryDatePickerProps {
  jobId: string
  value: string
  shootingDateId: string | null
  existingDiaryDates: Set<string>
  onChange: (date: string, shootingDateId: string | null, location: string | null) => void
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const MANUAL_VALUE = '__manual__'

export function DiaryDatePicker({
  jobId,
  value,
  shootingDateId,
  existingDiaryDates,
  onChange,
}: DiaryDatePickerProps) {
  const { data: shootingDates } = useJobShootingDates(jobId)

  // forceManual: true quando usuario clica explicitamente em "Outra data..."
  // Reseta automaticamente quando o componente desmonta (Dialog fecha/abre)
  const [forceManual, setForceManual] = useState(false)

  const hasDates = shootingDates && shootingDates.length > 0
  const isManual = !hasDates || forceManual

  if (!hasDates || isManual) {
    return (
      <div className="col-span-1 space-y-1.5">
        <Label>Data de filmagem *</Label>
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value, null, null)}
          className="h-10"
        />
        {hasDates && (
          <button
            type="button"
            className="text-xs text-primary hover:underline min-h-[36px] flex items-center"
            onClick={() => { setForceManual(false); onChange('', null, null) }}
          >
            Selecionar de diaria cadastrada
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="col-span-1 space-y-1.5">
      <Label>Data de filmagem *</Label>
      <Select
        value={shootingDateId ?? ''}
        onValueChange={(v) => {
          if (v === MANUAL_VALUE) {
            setForceManual(true)
            onChange('', null, null)
            return
          }
          const sd = shootingDates?.find(d => d.id === v)
          if (sd) {
            onChange(sd.shooting_date, sd.id, sd.location ?? null)
          }
        }}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Selecione a data..." />
        </SelectTrigger>
        <SelectContent>
          {shootingDates?.map((sd) => {
            const hasDiary = existingDiaryDates.has(sd.shooting_date)
            return (
              <SelectItem key={sd.id} value={sd.id}>
                <span className="flex items-center gap-2">
                  {hasDiary && (
                    <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  )}
                  <span>{formatDateBR(sd.shooting_date)}</span>
                  {sd.location && (
                    <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                      — {sd.location}
                    </span>
                  )}
                </span>
              </SelectItem>
            )
          })}
          <SelectItem value={MANUAL_VALUE}>
            <span className="text-muted-foreground">Outra data...</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
