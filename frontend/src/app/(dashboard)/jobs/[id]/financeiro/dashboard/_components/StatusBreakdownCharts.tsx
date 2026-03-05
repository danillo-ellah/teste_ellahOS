'use client'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ITEM_STATUS_LABELS } from '@/types/cost-management'
import type { StatusBreakdownEntry, ItemStatus } from '@/types/cost-management'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Cores para payment_status_breakdown
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pendente: '#f59e0b',
  pago: '#22c55e',
  cancelado: '#ef4444',
}

// Cores para item_status_breakdown usando paleta coerente
const ITEM_STATUS_CHART_COLORS: Record<string, string> = {
  orcado: '#94a3b8',
  aguardando_nf: '#f59e0b',
  nf_pedida: '#3b82f6',
  nf_recebida: '#6366f1',
  nf_aprovada: '#10b981',
  pago: '#22c55e',
  cancelado: '#ef4444',
}

const DEFAULT_COLOR = '#cbd5e1'

// Label customizado no centro do donut
interface CenterLabelProps {
  cx?: number
  cy?: number
  total: number
}

function CenterLabel({ cx = 0, cy = 0, total }: CenterLabelProps) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(total)

  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize={11} fill="hsl(var(--muted-foreground))">
        Total
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize={13} fontWeight={600} fill="hsl(var(--foreground))">
        {formatted}
      </tspan>
    </text>
  )
}

interface PaymentPieTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: StatusBreakdownEntry }>
}

function PaymentPieTooltip({ active, payload }: PaymentPieTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold capitalize mb-1">{entry.name}</p>
      <p className="tabular-nums">{formatBRL(entry.value)}</p>
      <p className="text-muted-foreground">{entry.payload.count} item(s)</p>
    </div>
  )
}

interface ItemBarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: StatusBreakdownEntry }>
  label?: string
}

function ItemBarTooltip({ active, payload, label }: ItemBarTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="tabular-nums">{formatBRL(entry.value)}</p>
      <p className="text-muted-foreground">{entry.payload.count} item(s)</p>
    </div>
  )
}

interface Props {
  paymentStatusData: StatusBreakdownEntry[]
  itemStatusData: StatusBreakdownEntry[]
}

export function StatusBreakdownCharts({ paymentStatusData, itemStatusData }: Props) {
  const isEmpty = paymentStatusData.length === 0 && itemStatusData.length === 0

  if (isEmpty) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {['Status de Pagamento', 'Status dos Itens'].map(title => (
          <Card key={title} className="p-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {title}
            </p>
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Total para label central do donut
  const paymentTotal = paymentStatusData.reduce((acc, e) => acc + e.total, 0)

  // Mapear item_status_breakdown para labels traduzidos
  const itemDataMapped = itemStatusData.map(entry => ({
    ...entry,
    label: ITEM_STATUS_LABELS[entry.status as ItemStatus] ?? entry.status,
  }))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Donut: payment_status_breakdown */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Status de Pagamento
        </p>
        {paymentStatusData.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                dataKey="total"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {paymentStatusData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={PAYMENT_STATUS_COLORS[entry.status] ?? DEFAULT_COLOR}
                  />
                ))}
                {/* Label central com total */}
                <CenterLabel cx={undefined} cy={undefined} total={paymentTotal} />
              </Pie>
              <Tooltip content={<PaymentPieTooltip />} />
              <Legend
                formatter={(value: string) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Barras horizontais: item_status_breakdown */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Status dos Itens
        </p>
        {itemStatusData.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={itemDataMapped}
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
                dataKey="label"
                width={90}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ItemBarTooltip />} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {itemDataMapped.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={ITEM_STATUS_CHART_COLORS[entry.status] ?? DEFAULT_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
