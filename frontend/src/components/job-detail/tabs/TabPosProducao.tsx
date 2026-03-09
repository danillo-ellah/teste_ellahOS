'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Scissors, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { DeliverableStageCard } from './pos-producao/DeliverableStageCard'
import { useJobDeliverables } from '@/hooks/useJobDeliverables'
import { useUpdatePosStage } from '@/hooks/usePosProducao'
import { ApiRequestError } from '@/lib/api'
import type { JobDetail, JobDeliverable } from '@/types/jobs'
import type { PosStage, PosBriefing } from '@/types/pos-producao'

interface TabPosProducaoProps {
  job: JobDetail
}

// JobDeliverable com campos de pos-producao (esses campos existem no banco apos a migration,
// mas o tipo base ainda nao os inclui — fazemos um cast seguro)
interface DeliverableWithPos extends JobDeliverable {
  pos_stage?: PosStage | null
  pos_assignee_id?: string | null
  pos_drive_url?: string | null
  pos_briefing?: PosBriefing | null
}

export function TabPosProducao({ job }: TabPosProducaoProps) {
  const { data: rawDeliverables, isLoading, isError, refetch } = useJobDeliverables(job.id)
  const { mutateAsync: updateStage, isPending: isStarting } = useUpdatePosStage(job.id)
  const [startingId, setStartingId] = useState<string | null>(null)

  const deliverables = (rawDeliverables ?? []) as DeliverableWithPos[]

  // Separa entregaveis com pos em andamento dos que ainda nao tem etapa
  const posDeliverables = deliverables.filter((d) => d.pos_stage != null)
  const noStageDeliverables = deliverables.filter((d) => d.pos_stage == null)

  async function handleStartPos(deliverableId: string) {
    setStartingId(deliverableId)
    try {
      await updateStage({ deliverableId, posStage: 'ingest' })
      toast.success('Pos-producao iniciada')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao iniciar pos-producao'
      toast.error(msg)
    } finally {
      setStartingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar entregaveis.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (deliverables.length === 0) {
    return (
      <EmptyTabState
        icon={Scissors}
        title="Nenhum entregavel cadastrado"
        description="Adicione entregaveis na aba Entregaveis para iniciar o workflow de pos-producao."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Entregaveis em pos-producao */}
      {posDeliverables.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Em Pos-Producao
            </h3>
            <span className="text-xs text-muted-foreground">({posDeliverables.length})</span>
          </div>
          <div className="space-y-2">
            {posDeliverables.map((d, idx) => (
              <DeliverableStageCard
                key={d.id}
                deliverable={{
                  id: d.id,
                  job_id: d.job_id,
                  description: d.description,
                  format: d.format ?? null,
                  delivery_date: d.delivery_date ?? null,
                  pos_stage: d.pos_stage ?? null,
                  pos_assignee_id: d.pos_assignee_id ?? null,
                  pos_drive_url: d.pos_drive_url ?? null,
                  pos_briefing: d.pos_briefing ?? null,
                }}
                jobId={job.id}
                jobDriveFolderUrl={job.drive_folder_url}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Entregaveis que ainda nao iniciaram pos */}
      {noStageDeliverables.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Aguardando Inicio
            </h3>
            <span className="text-xs text-muted-foreground">({noStageDeliverables.length})</span>
          </div>
          <div className="space-y-2">
            {noStageDeliverables.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground truncate block">
                    {d.description}
                  </span>
                  {d.format && (
                    <span className="text-xs text-muted-foreground">{d.format}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0 gap-1"
                  onClick={() => handleStartPos(d.id)}
                  disabled={isStarting && startingId === d.id}
                >
                  <Play className="size-3" />
                  {isStarting && startingId === d.id ? 'Iniciando...' : 'Iniciar Pos'}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
