'use client'

import React from 'react'
import { Clapperboard, XCircle } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, JOB_STATUS_EMOJI, STATUS_PIPELINE_ORDER } from '@/lib/constants'
import { PROJECT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PortalJob } from '@/types/portal'
import type { JobStatus, ProjectType } from '@/types/jobs'

// Etapas simplificadas para o pipeline visual do portal
const PIPELINE_STEPS: { status: JobStatus; label: string }[] = [
  { status: 'briefing_recebido', label: 'Briefing' },
  { status: 'orcamento_elaboracao', label: 'Orcamento' },
  { status: 'aprovado_selecao_diretor', label: 'Aprovado' },
  { status: 'pre_producao', label: 'Pre-Prod.' },
  { status: 'producao_filmagem', label: 'Producao' },
  { status: 'pos_producao', label: 'Pos-Prod.' },
  { status: 'entregue', label: 'Entrega' },
  { status: 'finalizado', label: 'Concluido' },
]

// Formato especial para portal: "5 de fev, 14:30" (diferente do formatDate padrao)
function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, "d 'de' MMM', ' HH:mm", { locale: ptBR })
  } catch {
    return ''
  }
}

interface PortalStatusHeroProps {
  job: PortalJob
}

export function PortalStatusHero({ job }: PortalStatusHeroProps) {
  const status = job.status as JobStatus
  const isCancelled = status === 'cancelado'
  const statusColor = JOB_STATUS_COLORS[status] ?? '#6B7280'
  const statusLabel = JOB_STATUS_LABELS[status] ?? status
  const statusEmoji = JOB_STATUS_EMOJI[status] ?? ''
  const projectTypeLabel =
    PROJECT_TYPE_LABELS[job.project_type as ProjectType] ?? job.project_type

  // Calcular progresso no pipeline
  const currentIndex = STATUS_PIPELINE_ORDER.indexOf(status)
  const totalSteps = STATUS_PIPELINE_ORDER.length
  const progressPercent =
    currentIndex >= 0
      ? Math.round(((currentIndex + 1) / totalSteps) * 100)
      : 0

  const updatedAt = formatDateBR(job.updated_at)

  // Estado de cancelado: banner especial
  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 p-6 text-center">
        <XCircle className="h-12 w-12 text-zinc-400 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-muted-foreground">Projeto Cancelado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Este projeto foi cancelado.
          {updatedAt && ` Ultima atualizacao: ${updatedAt}.`}
          {' '}Em caso de duvidas, entre em contato com a producao.
        </p>
      </div>
    )
  }

  // Encontrar indice do status atual no pipeline simplificado
  const pipelineCurrentIdx = PIPELINE_STEPS.findIndex((s) => s.status === status)

  return (
    <section
      className="rounded-2xl border border-border bg-gradient-to-b from-background to-muted/30 dark:to-zinc-900/50 p-6"
      aria-label="Status do projeto"
    >
      {/* Titulo */}
      <h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
        {job.title || 'Projeto sem titulo'}
      </h1>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
        {job.client_name && (
          <span className="text-sm text-muted-foreground">{job.client_name}</span>
        )}
        {job.client_name && job.project_type && (
          <span className="text-muted-foreground/40 text-xs">|</span>
        )}
        {job.project_type && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />
            {projectTypeLabel}
          </span>
        )}
        {updatedAt && (
          <>
            <span className="text-muted-foreground/40 text-xs">|</span>
            <span className="text-xs text-muted-foreground">Atualizado {updatedAt}</span>
          </>
        )}
      </div>

      {/* Badge de status grande */}
      <div className="mt-4">
        <span
          className="inline-flex items-center gap-2 px-4 h-8 rounded-full text-[13px] font-semibold"
          style={{
            backgroundColor: `${statusColor}1A`,
            color: statusColor,
          }}
          aria-label={`Status atual: ${statusLabel}`}
        >
          <span aria-hidden="true">{statusEmoji}</span>
          {statusLabel}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mt-5" aria-label={`Progresso: ${progressPercent}%`}>
        <p className="text-xs text-muted-foreground mb-2">Progresso estimado</p>
        <div className="h-2.5 rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: statusColor,
            }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
          <span className="text-xs text-muted-foreground">
            {currentIndex >= 0 ? currentIndex + 1 : '?'} de {totalSteps} etapas
          </span>
        </div>
      </div>

      {/* Pipeline visual horizontal */}
      <div
        className="mt-5 overflow-x-auto pb-1"
        style={{ scrollSnapType: 'x mandatory' }}
        aria-label="Pipeline de producao"
      >
        <div className="flex items-center gap-0 min-w-max">
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = pipelineCurrentIdx > idx
            const isCurrent = pipelineCurrentIdx === idx
            const stepColor = JOB_STATUS_COLORS[step.status] ?? '#6B7280'

            return (
              <div key={step.status} className="flex items-center">
                {/* Etapa */}
                <div
                  className={cn(
                    'flex flex-col items-center min-w-[72px] text-center px-1 transition-all',
                    isCurrent && 'scale-105',
                    !isDone && !isCurrent && 'opacity-40',
                  )}
                  title={JOB_STATUS_LABELS[step.status]}
                >
                  <span
                    className={cn(
                      'text-base leading-none',
                      isCurrent && 'ring-2 ring-offset-2 rounded-full ring-offset-background',
                    )}
                    style={isCurrent ? { '--tw-ring-color': stepColor } as React.CSSProperties : undefined}
                    aria-hidden="true"
                  >
                    {JOB_STATUS_EMOJI[step.status] ?? '○'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] mt-1 truncate max-w-[68px] font-medium',
                      isCurrent
                        ? 'text-foreground font-bold'
                        : isDone
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60',
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Seta entre etapas */}
                {idx < PIPELINE_STEPS.length - 1 && (
                  <span
                    className="text-muted-foreground/40 text-xs mx-0.5 select-none"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
