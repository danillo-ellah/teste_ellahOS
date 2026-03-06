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
import type { CashflowEntry } from '@/types/cashflow'

// Formata valor em BRL para tooltips
const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Formata valor resumido para eixo Y (50k, 1.2M, -500)
const formatAxisBRL = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`
  return value.toLocaleString('pt-BR')
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
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm min-w-[180px]">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="tabular-nums py-0.5">
          {entry.name}: {formatBRL(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface Props {
  data: CashflowEntry[]
}

export function CashflowChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Projecao de Fluxo de Caixa
        </p>
        <div className="flex h-[350px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum dado disponivel para o periodo.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Projecao de Fluxo de Caixa
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {/* Gradiente verde para entradas */}
            <linearGradient id="gradInflows" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            {/* Gradiente vermelho para saidas */}
            <linearGradient id="gradOutflows" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
            {/* Gradiente azul para saldo acumulado */}
            <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
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
            width={64}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Linha de referencia no zero (tracejada cinza) */}
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeWidth={1}
            strokeOpacity={0.6}
          />

          {/* Area de saidas (vermelha) — exibida atras */}
          <Area
            type="monotone"
            dataKey="outflows"
            name="Saidas"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#gradOutflows)"
          />

          {/* Area de entradas (verde) — exibida no meio */}
          <Area
            type="monotone"
            dataKey="inflows"
            name="Entradas"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#gradInflows)"
          />

          {/* Linha de saldo acumulado (azul) — exibida na frente */}
          <Area
            type="monotone"
            dataKey="cumulative_balance"
            name="Saldo Acumulado"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
