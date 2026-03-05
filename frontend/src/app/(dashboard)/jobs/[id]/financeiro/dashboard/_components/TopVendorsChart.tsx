'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: TopVendorEntry }>
  label?: string
}

function VendorTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload

  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm max-w-[240px]">
      <p className="font-semibold mb-1 break-words">{entry.vendor_name}</p>
      <p className="tabular-nums">{formatBRL(entry.total)}</p>
      <p className="text-muted-foreground">
        {entry.items_count} item(s) &bull; {entry.pct_of_total.toFixed(1)}% do total
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
  const chartData = data.slice(0, 10).map(entry => ({
    ...entry,
    vendor_label: truncate(entry.vendor_name, 20),
  }))

  // Altura dinamica proporcional ao numero de itens
  const height = Math.max(200, chartData.length * 40)

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
            width={140}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<VendorTooltip />} />
          <Bar
            dataKey="total"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
