'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { TopVendorEntry } from '@/types/cost-management'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Trunca nome do fornecedor para caber no eixo
const truncate = (str: string, maxLen: number) =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str

// Paleta de cores para barras de fornecedores
const VENDOR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899',
  '#10b981', '#6366f1', '#f97316', '#14b8a6', '#a855f7',
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: TopVendorEntry & { _color: string } }>
  label?: string
}

function VendorTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload

  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm max-w-[260px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry._color }} />
        <p className="font-semibold break-words">{entry.vendor_name}</p>
      </div>
      <p className="tabular-nums text-base font-bold">{formatBRL(entry.total)}</p>
      <p className="text-muted-foreground mt-0.5">
        {entry.items_count} item(s) &middot; {entry.pct_of_total.toFixed(1)}% do total
      </p>
    </div>
  )
}

interface Props {
  data: TopVendorEntry[]
}

export function TopVendorsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Top 10 Fornecedores
        </p>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
        </div>
      </Card>
    )
  }

  // Limitar a 10 fornecedores e preparar dados com nome truncado para eixo
  const chartData = data.slice(0, 10).map((entry, i) => ({
    ...entry,
    vendor_label: truncate(entry.vendor_name, 25),
    _color: VENDOR_COLORS[i % VENDOR_COLORS.length],
  }))

  // Altura dinamica proporcional ao numero de itens
  const height = Math.max(220, chartData.length * 44)

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Top 10 Fornecedores
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="hsl(var(--border))"
            opacity={0.5}
          />
          <XAxis
            type="number"
            tickFormatter={value =>
              new Intl.NumberFormat('pt-BR', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(value)
            }
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="vendor_label"
            width={160}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<VendorTooltip />} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry._color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
