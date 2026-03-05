'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { BudgetVsActualEntry } from '@/types/cost-management'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const truncate = (str: string, maxLen: number) =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str

// Formata variacao percentual com sinal e cor
// Positivo = gasto acima do estimado (ruim) | Negativo = abaixo (bom)
const formatVariance = (pct: number) => {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function BudgetTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm max-w-[220px]">
      <p className="font-semibold mb-2 break-words">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="tabular-nums">
          {entry.name}: {formatBRL(entry.value)}
        </p>
      ))}
    </div>
  )
}

// Label customizado exibido acima de cada grupo de barras
interface VarianceLabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
}

function VarianceLabel({ x = 0, y = 0, width = 0, value = 0 }: VarianceLabelProps) {
  // Exibe apenas acima da segunda barra do grupo (actual_paid)
  if (value === 0) return null

  // Positivo (gasto acima) = vermelho | Negativo (abaixo) = verde
  const color = value > 0 ? '#ef4444' : '#22c55e'
  const text = formatVariance(value)

  return (
    <text
      x={x + width / 2}
      y={y - 4}
      textAnchor="middle"
      fill={color}
      fontSize={10}
      fontWeight={600}
    >
      {text}
    </text>
  )
}

interface Props {
  data: BudgetVsActualEntry[]
}

export function BudgetVsActualChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Orcado vs Real por Categoria
        </p>
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
        </div>
      </Card>
    )
  }

  // Preparar dados com nomes truncados para o eixo X
  const chartData = data.map(entry => ({
    ...entry,
    item_label: truncate(entry.item_name, 22),
  }))

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Orcado vs Real por Categoria
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 10, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="item_label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={value =>
              new Intl.NumberFormat('pt-BR', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(value)
            }
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<BudgetTooltip />} />
          <Legend
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 12 }}
          />

          {/* Barra azul: estimado/orcado */}
          <Bar dataKey="budgeted" name="Estimado" fill="#6366f1" radius={[4, 4, 0, 0]} />

          {/* Barra verde-teal: pago real, com label de variacao acima */}
          <Bar
            dataKey="actual_paid"
            name="Pago"
            fill="#14b8a6"
            radius={[4, 4, 0, 0]}
            label={<VarianceLabel />}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda de variancia */}
      <p className="mt-2 text-xs text-muted-foreground text-center">
        % acima do estimado:{' '}
        <span className="text-red-500 font-medium">vermelho</span>
        {' | '}
        abaixo:{' '}
        <span className="text-green-500 font-medium">verde</span>
      </p>
    </Card>
  )
}
