'use client'

import { useState } from 'react'
import {
  FileCheck,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatRelativeDate, formatDate } from '@/lib/format'
import {
  useApprovalDocVersions,
  useApproveInternalDoc,
} from '@/hooks/useApprovalPdf'
import type { ApprovalDocVersion } from '@/hooks/useApprovalPdf'
import { APPROVAL_PDF_ROLES } from '@/hooks/useUserRole'

interface ApprovalPdfHistoryProps {
  jobId: string
  userRole: string
  /** Exibe apenas a versao ativa (sem historico completo) */
  compact?: boolean
}

// Retorna label e cor para o status de aprovacao
function getStatusConfig(status: string | null): {
  label: string
  className: string
  icon: typeof Clock
} {
  switch (status) {
    case 'aprovado':
      return {
        label: 'Aprovado',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
      }
    case 'rejeitado':
      return {
        label: 'Rejeitado',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
      }
    default:
      return {
        label: 'Pendente',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: Clock,
      }
  }
}

function ApprovalStatusBadge({ status }: { status: string | null }) {
  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

// --- Item individual de versao ---

function VersionItem({
  file,
  canApprove,
  onApprove,
  onReject,
}: {
  file: ApprovalDocVersion
  canApprove: boolean
  onApprove: (file: ApprovalDocVersion) => void
  onReject: (file: ApprovalDocVersion) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = !file.approval_status

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Linha principal */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <FileCheck className="size-4 shrink-0 text-muted-foreground" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {file.file_name}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              v{file.version}
            </span>
            {file.is_active && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary shrink-0">
                Atual
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <ApprovalStatusBadge status={file.approval_status} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(file.created_at)}
            </span>
          </div>
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-1.5 shrink-0">
          {file.file_url && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              asChild
              title="Abrir no Drive"
            >
              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}

          {canApprove && isPending && file.is_active && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => onApprove(file)}
              >
                <CheckCircle className="size-3.5" />
                Aprovar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onReject(file)}
              >
                <XCircle className="size-3.5" />
                Rejeitar
              </Button>
            </>
          )}

          {/* Expandir para ver detalhes do comentario/data de aprovacao */}
          {(file.approval_comment || file.approved_at) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Fechar detalhes' : 'Ver detalhes'}
            >
              {expanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-3 py-3 rounded-b-lg space-y-2">
          {file.approved_at && (
            <p className="text-xs text-muted-foreground">
              {file.approval_status === 'aprovado' ? 'Aprovado' : 'Respondido'} em{' '}
              <span className="font-medium">{formatDate(file.approved_at)}</span>
            </p>
          )}
          {file.approval_comment && (
            <div className="rounded-md bg-background border border-border p-2.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {file.approval_status === 'rejeitado' ? 'Motivo da rejeicao:' : 'Comentario:'}
              </p>
              <p className="text-sm">{file.approval_comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Componente principal ---

export function ApprovalPdfHistory({
  jobId,
  userRole,
  compact = false,
}: ApprovalPdfHistoryProps) {
  const { data, isLoading, isError, refetch } = useApprovalDocVersions(jobId)
  const { mutateAsync: approveDoc, isPending: isApproving } = useApproveInternalDoc()

  const [rejectTarget, setRejectTarget] = useState<ApprovalDocVersion | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  const canApprove = APPROVAL_PDF_ROLES.includes(userRole as never)
  const files = data?.files ?? []
  // No modo compact, exibe apenas a versao ativa
  const displayFiles = compact ? files.filter((f) => f.is_active) : files

  async function handleApprove(file: ApprovalDocVersion) {
    try {
      await approveDoc({
        jobId,
        action: 'approve',
        jobFileId: file.id,
      })
      toast.success(`Documento v${file.version} aprovado com sucesso.`)
    } catch {
      // erro ja tratado pelo hook
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget || !rejectComment.trim()) return
    try {
      await approveDoc({
        jobId,
        action: 'reject',
        comment: rejectComment.trim(),
        jobFileId: rejectTarget.id,
      })
      toast.success(`Documento v${rejectTarget.version} rejeitado.`)
      setRejectTarget(null)
      setRejectComment('')
    } catch {
      // erro ja tratado pelo hook
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
        <AlertCircle className="size-4 shrink-0" />
        <span>Erro ao carregar versoes.</span>
        <Button variant="ghost" size="sm" className="h-7 ml-auto" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (displayFiles.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <FileCheck className="size-4 shrink-0 opacity-40" />
        <span>Nenhum documento de aprovacao interna gerado.</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {displayFiles.map((file) => (
          <VersionItem
            key={file.id}
            file={file}
            canApprove={canApprove}
            onApprove={handleApprove}
            onReject={(f) => {
              setRejectTarget(f)
              setRejectComment('')
            }}
          />
        ))}
      </div>

      {/* Dialog de rejeicao com comentario obrigatorio */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectComment('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar documento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeicao do documento de aprovacao interna
              {rejectTarget ? ` v${rejectTarget.version}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-comment-pdf">Motivo *</Label>
            <Textarea
              id="reject-comment-pdf"
              rows={3}
              placeholder="Descreva o motivo da rejeicao..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isApproving || !rejectComment.trim()}
              onClick={handleRejectConfirm}
            >
              {isApproving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  Rejeitar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
