'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { PipelineItem } from '@/hooks/use-dashboard'

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  briefing_recebido: { label: 'Briefing', color: '#8B5CF6' },
  orcamento_elaboracao: { label: 'Orc. Elabor.', color: '#F59E0B' },
  orcamento_enviado: { label: 'Orc. Enviado', color: '#FBBF24' },
  aguardando_aprovacao: { label: 'Ag. Aprovacao', color: '#EAB308' },
  aprovado_selecao_diretor: { label: 'Aprovado', color: '#22C55E' },
  cronograma_planejamento: { label: 'Cronograma', color: '#60A5FA' },
  pre_producao: { label: 'Pre-Producao', color: '#3B82F6' },
  producao_filmagem: { label: 'Producao', color: '#06B6D4' },
  pos_producao: { label: 'Pos-Producao', color: '#A855F7' },
  aguardando_aprovacao_final: { label: 'Aprov. Final', color: '#F59E0B' },
  entregue: { label: 'Entregue', color: '#10B981' },
  finalizado: { label: 'Finalizado', color: '#6B7280' },
  cancelado: { label: 'Cancelado', color: '#EF4444' },
  pausado: { label: 'Pausado', color: '#9CA3AF' },
}

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? { label: status, color: '#6B7280' }
  )
}

interface RechartsTooltipPayload {
  name?: string
  value?: number
  payload?: Record<string, unknown>
}

interface RechartsTooltipProps {
  active?: boolean
  payload?: RechartsTooltipPayload[]
}

function CustomTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const pct = item.payload?.percent as number | undefined
  return (
    <div className="rounded-lg border border-border bg-popover p-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground">
        {item.value} {Number(item.value) === 1 ? 'job' : 'jobs'}
        {pct != null ? ` (${(pct * 100).toFixed(1)}%)` : ''}
      </p>
    </div>
  )
}

interface StatusDonutProps {
  data: PipelineItem[] | undefined
  isLoading: boolean
}

export function StatusDonut({ data, isLoading }: StatusDonutProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Distribuicao de jobs por status"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-6">
          <Skeleton className="size-40 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const activeItems = (data ?? []).filter((item) => item.count > 0)
  const total = activeItems.reduce((acc, item) => acc + item.count, 0)

  const chartData = activeItems.map((item) => {
    const config = getStatusConfig(item.status)
    return {
      name: config.label,
      value: item.count,
      color: config.color,
      status: item.status,
      percent: total > 0 ? item.count / total : 0,
    }
  })

  return (
    <section
      aria-label="Distribuicao de jobs por status"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">
          Jobs por Status
        </h2>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum job no periodo</p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Grafico de donut com ${total} jobs distribuidos por status`}
          tabIndex={0}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
        >
          {/* Donut */}
          <div className="relative mx-auto shrink-0" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx={75}
                  cy={75}
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Total no centro */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground leading-none">
                {total}
              </span>
              <span className="text-[11px] text-muted-foreground">total</span>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex-1 space-y-0">
            {chartData.map((item) => (
              <div
                key={item.status}
                className="flex cursor-default items-center gap-2 py-1.5 group"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 truncate text-[13px] text-foreground">
                  {item.name}
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {item.value}
                </span>
                <span className="w-10 text-right text-[12px] text-muted-foreground">
                  {(item.percent * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
