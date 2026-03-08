'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DayStatus } from '@/types/production-diary'

interface BulletinSectionProps {
  dayStatus: DayStatus | null
  executiveSummary: string
  nextSteps: string
  directorSignature: string
  onChange: (field: string, value: unknown) => void
}

const DAY_STATUS_OPTIONS: { value: DayStatus; label: string }[] = [
  { value: 'no_cronograma', label: 'No cronograma' },
  { value: 'adiantado', label: 'Adiantado' },
  { value: 'atrasado', label: 'Atrasado' },
]

export function BulletinSection({
  dayStatus,
  executiveSummary,
  nextSteps,
  directorSignature,
  onChange,
}: BulletinSectionProps) {
  return (
    <div className="space-y-4">
      {/* Status do dia */}
      <div>
        <Label>Status do dia</Label>
        <Select
          value={dayStatus ?? ''}
          onValueChange={(v) => onChange('day_status', v || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {DAY_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo executivo */}
      <div>
        <Label>Resumo executivo</Label>
        <Textarea
          rows={3}
          maxLength={2000}
          placeholder="Resumo do dia de filmagem para o boletim de producao..."
          value={executiveSummary}
          onChange={(e) => onChange('executive_summary', e.target.value)}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {executiveSummary.length}/2000
        </p>
      </div>

      {/* Proximos passos */}
      <div>
        <Label>Proximos passos</Label>
        <Textarea
          rows={2}
          placeholder="O que precisa ser feito no proximo dia de filmagem..."
          value={nextSteps}
          onChange={(e) => onChange('next_steps', e.target.value)}
          className="resize-none"
        />
      </div>

      {/* Assinatura do diretor */}
      <div>
        <Label>Assinatura do diretor de producao</Label>
        <Input
          placeholder="Nome completo do DP responsavel"
          value={directorSignature}
          onChange={(e) => onChange('director_signature', e.target.value)}
        />
      </div>
    </div>
  )
}
