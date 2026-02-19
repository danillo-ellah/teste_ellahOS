'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { DriveSection } from '@/components/job-detail/tabs/DriveSection'
import { WhatsAppSection } from '@/components/job-detail/tabs/WhatsAppSection'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SyncIndicator } from '@/components/job-detail/SyncIndicator'
import type { SyncState } from '@/components/job-detail/SyncIndicator'
import { useUpdateJob } from '@/hooks/useUpdateJob'
import { ApiRequestError } from '@/lib/api'
import {
  PROJECT_TYPE_LABELS,
  POS_SUB_STATUS_LABELS,
} from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { POS_SUB_STATUSES } from '@/types/jobs'
import type { JobDetail, UpdateJobPayload, PosSubStatus } from '@/types/jobs'

interface TabGeralProps {
  job: JobDetail
}

export function TabGeral({ job }: TabGeralProps) {
  const { mutateAsync: updateJob } = useUpdateJob()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Cleanup timers on unmount (BUG-006 fix)
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const save = useCallback(
    async (payload: UpdateJobPayload) => {
      setSyncState('saving')
      clearTimeout(timerRef.current)
      try {
        await updateJob({ jobId: job.id, payload })
        setSyncState('saved')
        timerRef.current = setTimeout(() => setSyncState('idle'), 2000)
      } catch (err) {
        setSyncState('error')
        const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar'
        toast.error(msg)
        timerRef.current = setTimeout(() => setSyncState('idle'), 3000)
      }
    },
    [updateJob, job.id],
  )

  return (
    <div className="space-y-6">
      {/* Indicador de sync */}
      <div className="flex justify-end">
        <SyncIndicator state={syncState} />
      </div>

      {/* Secao 1: Info do Projeto */}
      <section className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Informacoes do Projeto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InfoField label="Cliente" value={job.clients?.name} />
          <InfoField label="Agencia" value={job.agencies?.name} />
          <InfoField label="Marca" value={job.brand} />
          <InfoField
            label="Tipo de projeto"
            value={job.job_type ? PROJECT_TYPE_LABELS[job.job_type] : null}
          />
          <InfoField label="Segmento" value={job.segment_type} />
          <InfoField
            label="Aprovacao"
            value={
              job.approval_type
                ? `${job.approval_type === 'internal' ? 'Interna' : 'Externa (cliente)'}${
                    job.approved_at ? ` em ${formatDate(job.approved_at)}` : ''
                  }${job.approved_by_name ? ` por ${job.approved_by_name}` : ''}`
                : null
            }
          />
          {job.is_parent_job && (
            <InfoField label="Job pai" value="Este job tem sub-jobs" />
          )}
          {job.parent_job_id && (
            <InfoField label="Job pai" value={job.parent_job_id} />
          )}
        </div>
      </section>

      {/* Secao: Google Drive */}
      <DriveSection job={job} />

      {/* Secao: WhatsApp */}
      <WhatsAppSection job={job} />

      {/* Secao 2: Datas */}
      <section className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Datas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* expected_start_date e actual_start_date sao read-only (nao aceitos pela API) */}
          <InfoField label="Inicio previsto" value={formatDate(job.expected_start_date)} />
          <DateField
            label="Entrega prevista"
            value={job.expected_delivery_date}
            onChange={(v) => save({ expected_delivery_date: v || null })}
          />
          <InfoField label="Inicio real" value={formatDate(job.actual_start_date)} />
          <DateField
            label="Entrega real"
            value={job.actual_delivery_date}
            onChange={(v) => save({ actual_delivery_date: v || null })}
          />
        </div>
      </section>

      {/* Secao 3: Sub-status (so pos-producao) */}
      {job.status === 'pos_producao' && (
        <section className="rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold mb-4">Sub-status da Pos-Producao</h3>
          <Select
            value={job.sub_status ?? ''}
            onValueChange={(v) => save({ sub_status: (v || null) as PosSubStatus | null })}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {POS_SUB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {POS_SUB_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      {/* Secao 4: Briefing e Notas */}
      <section className="rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Briefing e Notas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextAreaField
            label="Briefing"
            value={job.briefing}
            onChange={(v) => save({ briefing_text: v || null })}
          />
          <TextAreaField
            label="Notas internas"
            value={job.internal_notes}
            onChange={(v) => save({ internal_notes: v || null })}
          />
        </div>
      </section>

      {/* Sub-jobs */}
      {job.sub_jobs && job.sub_jobs.length > 0 && (
        <section className="rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold mb-4">Sub-jobs</h3>
          <div className="flex flex-wrap gap-2">
            {job.sub_jobs.map((sub) => (
              <Badge key={sub.id} variant="secondary">
                {sub.job_code} - {sub.title}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// --- Componentes auxiliares ---

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="mt-1">{value || '-'}</p>
    </div>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
}) {
  const [local, setLocal] = useState(value ?? '')

  // Sync local com prop quando valor externo muda (BUG-007 fix)
  useEffect(() => { setLocal(value ?? '') }, [value])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type="date"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== (value ?? '')) {
            onChange(local)
          }
        }}
        className="w-48"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
}) {
  const [local, setLocal] = useState(value ?? '')

  // Sync local com prop quando valor externo muda (BUG-007 fix)
  useEffect(() => { setLocal(value ?? '') }, [value])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== (value ?? '')) {
            onChange(local)
          }
        }}
        rows={5}
        placeholder={`Sem ${label.toLowerCase()}`}
        className="resize-y"
      />
    </div>
  )
}
