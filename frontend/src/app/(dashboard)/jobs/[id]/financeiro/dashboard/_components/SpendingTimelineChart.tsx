'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { SpendingTimelineEntry } from '@/types/cost-management'

// Formata valor em BRL para exibicao nos eixos e tooltips
const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Formata valor resumido para o eixo Y (ex: 50k, 1,2M)
const formatAxisBRL = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="tabular-nums">
          {entry.name}: {formatBRL(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface Props {
  data: SpendingTimelineEntry[]
  budgetLine: number
}

export function SpendingTimelineChart({ data, budgetLine }: Props) {
  // Estado vazio quando nao ha dados
  if (data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Timeline de Gastos
        </p>
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Timeline de Gastos
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {/* Gradiente para area estimada */}
            <linearGradient id="gradEstimated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
            </linearGradient>
            {/* Gradiente para area paga */}
            <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />

          <XAxis
            dataKey="period_label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatAxisBRL}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Linha de referencia do orcamento */}
          {budgetLine > 0 && (
            <ReferenceLine
              y={budgetLine}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: 'OC',
                position: 'right',
                fill: '#ef4444',
                fontSize: 11,
              }}
            />
          )}

          {/* Area estimada (cinza) — exibida atras */}
          <Area
            type="monotone"
            dataKey="estimated_cumulative"
            name="Estimado Acumulado"
            stroke="#94a3b8"
            strokeWidth={1.5}
            fill="url(#gradEstimated)"
          />

          {/* Area paga (verde) — exibida na frente */}
          <Area
            type="monotone"
            dataKey="paid_cumulative"
            name="Pago Acumulado"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradPaid)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
