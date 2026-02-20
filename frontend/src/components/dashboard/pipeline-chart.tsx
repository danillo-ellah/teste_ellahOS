'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { PipelineItem } from '@/hooks/use-dashboard'

// Cores fixas por status (mesmo padrao das badges existentes)
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  briefing_recebido: {
    label: 'Briefing',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.15)',
    border: '#8B5CF6',
  },
  orcamento_elaboracao: {
    label: 'Orc. Elabor.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
    border: '#F59E0B',
  },
  orcamento_enviado: {
    label: 'Orc. Enviado',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
    border: '#F59E0B',
  },
  aguardando_aprovacao: {
    label: 'Ag. Aprovacao',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.15)',
    border: '#EAB308',
  },
  aprovado_selecao_diretor: {
    label: 'Aprovado',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
    border: '#22C55E',
  },
  cronograma_planejamento: {
    label: 'Cronograma',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
    border: '#3B82F6',
  },
  pre_producao: {
    label: 'Pre-Prod.',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
    border: '#3B82F6',
  },
  producao_filmagem: {
    label: 'Producao',
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.15)',
    border: '#06B6D4',
  },
  pos_producao: {
    label: 'Pos-Prod.',
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.15)',
    border: '#A855F7',
  },
  aguardando_aprovacao_final: {
    label: 'Aprov. Final',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.15)',
    border: '#EAB308',
  },
  entregue: {
    label: 'Entregue',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.15)',
    border: '#10B981',
  },
  finalizado: {
    label: 'Finalizado',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.15)',
    border: '#6B7280',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)',
    border: '#EF4444',
  },
  pausado: {
    label: 'Pausado',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.15)',
    border: '#6B7280',
  },
}

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      color: '#6B7280',
      bg: 'rgba(107,114,128,0.15)',
      border: '#6B7280',
    }
  )
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value}`
}

interface PipelineChartProps {
  data: PipelineItem[] | undefined
  isLoading: boolean
}

export function PipelineChart({ data, isLoading }: PipelineChartProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Pipeline de status dos jobs"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-end gap-2 h-16 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + Math.random() * 30}px` }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-3" />
          ))}
        </div>
      </section>
    )
  }

  // Filtrar apenas status com count > 0
  const activeItems = (data ?? []).filter((item) => item.count > 0)
  const total = activeItems.reduce((acc, item) => acc + item.count, 0)

  const isEmpty = activeItems.length === 0

  return (
    <section
      aria-label="Pipeline de status dos jobs"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Pipeline de Jobs</h2>
        <Link
          href="/jobs"
          className="text-sm text-rose-500 hover:underline transition-colors"
        >
          Ver todos
        </Link>
      </div>

      {isEmpty ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nenhum job no pipeline
        </div>
      ) : (
        <>
          {/* Barras proporcionais */}
          <div
            role="group"
            aria-label="Pipeline de status dos jobs"
            className="flex items-end gap-1 h-12 overflow-x-auto pb-1"
          >
            {activeItems.map((item) => {
              const config = getStatusConfig(item.status)
              const heightPct = total > 0 ? (item.count / total) * 100 : 0
              const minHeightPx = 8
              const maxHeightPx = 48
              const heightPx = Math.max(
                minHeightPx,
                Math.round((heightPct / 100) * maxHeightPx),
              )

              return (
                <Link
                  key={item.status}
                  href={`/jobs?status=${item.status}`}
                  role="button"
                  aria-label={`${item.count} jobs em ${config.label}, clique para filtrar`}
                  className={cn(
                    'group relative flex min-w-[32px] flex-1 cursor-pointer flex-col justify-end rounded-t-sm transition-all duration-150',
                    'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50',
                  )}
                  style={{
                    height: `${heightPx}px`,
                    backgroundColor: config.bg,
                    borderTop: `2px solid ${config.border}`,
                  }}
                  title={`${item.count} jobs em ${config.label} — ${formatCurrency(item.total_value)}`}
                />
              )
            })}
          </div>

          {/* Contagens e labels */}
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {activeItems.map((item) => {
              const config = getStatusConfig(item.status)
              return (
                <div
                  key={item.status}
                  className="flex min-w-[32px] flex-1 flex-col items-center"
                >
                  <span
                    className="text-[13px] font-semibold leading-tight"
                    style={{ color: config.color }}
                  >
                    {item.count}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground max-w-full px-0.5 text-center leading-tight mt-0.5">
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
