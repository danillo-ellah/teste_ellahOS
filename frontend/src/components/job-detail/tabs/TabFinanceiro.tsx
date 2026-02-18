'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { DollarSign, TrendingUp, Percent, Receipt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SyncIndicator } from '@/components/job-detail/SyncIndicator'
import type { SyncState } from '@/components/job-detail/SyncIndicator'
import { useUpdateJob } from '@/hooks/useUpdateJob'
import { ApiRequestError } from '@/lib/api'
import { formatCurrency, formatPercentage, formatBRNumber, parseBRNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobDetail, UpdateJobPayload } from '@/types/jobs'

interface TabFinanceiroProps {
  job: JobDetail
}

export function TabFinanceiro({ job }: TabFinanceiroProps) {
  const { mutateAsync: updateJob } = useUpdateJob()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Cleanup timers on unmount (BUG-006 fix)
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const save = useCallback(
    async (payload: UpdateJobPayload) => {
      setSyncState('saving')
      clearTimeout(timerRef.current)
      try {
        await updateJob({ jobId: job.id, payload })
        setSyncState('saved')
        timerRef.current = setTimeout(() => setSyncState('idle'), 2000)
      } catch (err) {
        setSyncState('error')
        const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar'
        toast.error(msg)
        timerRef.current = setTimeout(() => setSyncState('idle'), 3000)
      }
    },
    [updateJob, job.id],
  )

  const marginIsPositive = (job.margin_percentage ?? 0) >= 0

  return (
    <div className="space-y-6">
      {/* Indicador de sync */}
      <div className="flex justify-end">
        <SyncIndicator state={syncState} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Valor fechado"
          value={formatCurrency(job.closed_value)}
          className="text-foreground"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Lucro bruto"
          value={formatCurrency(job.gross_profit)}
          className={marginIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        />
        <SummaryCard
          icon={Percent}
          label="Margem"
          value={formatPercentage(job.margin_percentage)}
          className={marginIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        />
        <SummaryCard
          icon={Receipt}
          label="Impostos"
          value={formatCurrency(job.tax_value)}
          className="text-muted-foreground"
        />
      </div>

      {/* Campos editaveis - somente os que a API aceita */}
      <section className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Valores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CurrencyField
            label="Valor fechado"
            value={job.closed_value}
            onChange={(v) => save({ closed_value: v })}
          />
          <CurrencyField
            label="Custo de producao"
            value={job.production_cost}
            onChange={(v) => save({ production_cost: v })}
          />
          <CurrencyField
            label="Outros custos"
            value={job.other_costs}
            onChange={(v) => save({ other_costs: v })}
          />
          <PercentField
            label="% Impostos"
            value={job.tax_percentage}
            onChange={(v) => save({ tax_percentage: v })}
          />
        </div>
      </section>

      {/* Campos somente-leitura (nao aceitos pela API ou calculados) */}
      <section className="rounded-lg border border-border p-6 bg-muted/30">
        <h3 className="text-sm font-semibold mb-4">Valores calculados e de referencia</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Calculados automaticamente pelo banco de dados ou definidos em outros fluxos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Valor dos impostos</span>
            <p className="mt-1 font-medium">{formatCurrency(job.tax_value)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Lucro bruto</span>
            <p className={cn('mt-1 font-medium', marginIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {formatCurrency(job.gross_profit)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Margem</span>
            <p className={cn('mt-1 font-medium', marginIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {formatPercentage(job.margin_percentage)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Orcamento estimado</span>
            <p className="mt-1 font-medium">{formatCurrency(job.budget_estimated)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Orcamento aprovado</span>
            <p className="mt-1 font-medium">{formatCurrency(job.budget_approved)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Comissao agencia</span>
            <p className="mt-1 font-medium">{formatPercentage(job.agency_commission_percentage)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// --- Componentes auxiliares ---

function SummaryCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('text-xl font-semibold', className)}>{value}</p>
    </div>
  )
}

function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}) {
  const [local, setLocal] = useState(formatBRNumber(value))
  const [editing, setEditing] = useState(false)

  // Sync local com prop quando nao esta editando
  useEffect(() => {
    if (!editing) setLocal(formatBRNumber(value))
  }, [value, editing])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          R$
        </span>
        <Input
          type="text"
          inputMode="decimal"
          value={local}
          onFocus={() => setEditing(true)}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            setEditing(false)
            const num = parseBRNumber(local)
            // Formatar para exibicao BR
            setLocal(formatBRNumber(num))
            if (num !== (value ?? null)) {
              onChange(num)
            }
          }}
          className="pl-9"
          placeholder="0,00"
        />
      </div>
    </div>
  )
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}) {
  const [local, setLocal] = useState(formatBRNumber(value, 1))
  const [editing, setEditing] = useState(false)

  // Sync local com prop quando nao esta editando
  useEffect(() => {
    if (!editing) setLocal(formatBRNumber(value, 1))
  }, [value, editing])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          value={local}
          onFocus={() => setEditing(true)}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            setEditing(false)
            const num = parseBRNumber(local)
            setLocal(formatBRNumber(num, 1))
            if (num !== (value ?? null)) {
              onChange(num)
            }
          }}
          className="pr-8"
          placeholder="0,0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          %
        </span>
      </div>
    </div>
  )
}
