'use client'

import { useState } from 'react'
import { Plus, ExternalLink, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCutVersions } from '@/hooks/usePosProducao'
import { useUserRole } from '@/hooks/useUserRole'
import {
  CUT_VERSION_STATUS_LABELS,
  CUT_VERSION_STATUS_COLORS,
} from '@/types/pos-producao'
import type { CutVersion, CutVersionType } from '@/types/pos-producao'
import { AddCutVersionDialog } from './AddCutVersionDialog'
import { ApproveRejectDialog } from './ApproveRejectDialog'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const CAN_APPROVE_ROLES = ['admin', 'ceo', 'produtor_executivo', 'atendimento']

interface CutVersionHistoryProps {
  deliverableId: string
  jobId: string
}

export function CutVersionHistory({ deliverableId, jobId }: CutVersionHistoryProps) {
  const { data: versions, isLoading, isError } = useCutVersions(deliverableId)
  const { role } = useUserRole()
  const [addOpen, setAddOpen] = useState(false)
  const [reviewVersion, setReviewVersion] = useState<CutVersion | null>(null)

  const canApprove = role !== null && CAN_APPROVE_ROLES.includes(role)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <AlertCircle className="size-3.5 shrink-0" />
        Erro ao carregar versoes de corte.
      </div>
    )
  }

  const list = versions ?? []
  const offlineVersions = list.filter((v) => v.version_type === 'offline')
  const onlineVersions = list.filter((v) => v.version_type === 'online')

  const groups: Array<{ type: CutVersionType; label: string; items: CutVersion[] }> = [
    { type: 'offline', label: 'Offline', items: offlineVersions },
    { type: 'online', label: 'Online', items: onlineVersions },
  ]

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Versoes de Corte
            {list.length > 0 && (
              <span className="ml-1.5 text-muted-foreground font-normal">({list.length})</span>
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3" />
            Nova Versao
          </Button>
        </div>

        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Nenhuma versao de corte registrada.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map(({ type, label, items }) => {
              if (items.length === 0) return null
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {items.map((v) => (
                      <VersionCard
                        key={v.id}
                        version={v}
                        canApprove={canApprove}
                        onReview={() => setReviewVersion(v)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddCutVersionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        jobId={jobId}
        deliverableId={deliverableId}
      />

      {reviewVersion && (
        <ApproveRejectDialog
          open={reviewVersion !== null}
          onOpenChange={(open) => { if (!open) setReviewVersion(null) }}
          jobId={jobId}
          deliverableId={deliverableId}
          version={reviewVersion}
        />
      )}
    </>
  )
}

// --- Card de versao individual ---

interface VersionCardProps {
  version: CutVersion
  canApprove: boolean
  onReview: () => void
}

function VersionCard({ version, canApprove, onReview }: VersionCardProps) {
  const colors = CUT_VERSION_STATUS_COLORS[version.status]
  const isApproved = version.status === 'aprovado'

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        isApproved
          ? 'border-green-500/40 dark:border-green-500/30 bg-green-50/50 dark:bg-green-950/20'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-2 justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={version.status} />
          <span className="text-xs font-semibold shrink-0">
            V{version.version_number}
          </span>
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0',
              colors.bg,
              colors.text,
            )}
          >
            {CUT_VERSION_STATUS_LABELS[version.status]}
          </span>
        </div>

        {version.review_url && (
          <a
            href={version.review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            title="Abrir link de review"
          >
            <ExternalLink className="size-3" />
            Review
          </a>
        )}
      </div>

      {version.revision_notes && (
        <p className="text-xs text-muted-foreground leading-relaxed">{version.revision_notes}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {version.created_by_profile && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {version.created_by_profile.full_name}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {formatDate(version.created_at)}
          </span>
        </div>

        {canApprove && version.status === 'enviado' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onReview}
          >
            Avaliar
          </Button>
        )}
      </div>

      {version.status === 'aprovado' && version.approved_by_profile && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-3" />
          Aprovado por {version.approved_by_profile.full_name}
          {version.approved_at && ` em ${formatDate(version.approved_at)}`}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: CutVersion['status'] }) {
  switch (status) {
    case 'aprovado':
      return <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
    case 'rejeitado':
      return <XCircle className="size-3.5 text-red-500 shrink-0" />
    case 'enviado':
      return <Clock className="size-3.5 text-amber-500 shrink-0" />
    default:
      return <AlertCircle className="size-3.5 text-muted-foreground shrink-0" />
  }
}
