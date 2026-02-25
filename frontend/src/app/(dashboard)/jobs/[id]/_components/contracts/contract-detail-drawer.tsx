'use client'

import { toast } from 'sonner'
import {
  Download,
  Send,
  CheckCircle,
  Clock,
  Mail,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractStatusBadge } from './contract-status-badge'
import { useDocuSealSubmission, useResendDocuSeal, useDownloadDocuSeal } from '@/hooks/useDocuSealSubmissions'
import { ApiRequestError } from '@/lib/api'
import { formatDate, formatRelativeDate } from '@/lib/format'
import type { DocuSealSubmission } from '@/types/docuseal'

interface ContractDetailDrawerProps {
  submissionId: string | null
  jobId: string
  onClose: () => void
}

export function ContractDetailDrawer({
  submissionId,
  jobId,
  onClose,
}: ContractDetailDrawerProps) {
  const open = submissionId !== null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        {submissionId ? (
          <ContractDetailContent
            submissionId={submissionId}
            jobId={jobId}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// --- Conteudo interno do drawer (carregado apenas quando submissionId valido) ---

function ContractDetailContent({
  submissionId,
  jobId,
  onClose,
}: {
  submissionId: string
  jobId: string
  onClose: () => void
}) {
  const { data: submission, isLoading, isError, refetch } = useDocuSealSubmission(submissionId)
  const { mutateAsync: resend, isPending: isResending } = useResendDocuSeal()
  const { mutateAsync: download, isPending: isDownloading } = useDownloadDocuSeal()

  async function handleResend() {
    try {
      await resend({ submission_id: submissionId, job_id: jobId })
      toast.success('Email de assinatura reenviado')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao reenviar email'
      toast.error(msg)
    }
  }

  async function handleDownload() {
    try {
      const result = await download(submissionId)
      if (result?.download_url) {
        window.open(result.download_url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('URL de download nao disponivel')
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao baixar PDF'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <>
        <SheetHeader className="mb-6">
          <SheetTitle>Detalhes do contrato</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </>
    )
  }

  if (isError || !submission) {
    return (
      <>
        <SheetHeader className="mb-6">
          <SheetTitle>Detalhes do contrato</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Erro ao carregar detalhes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </>
    )
  }

  const canResend = ['pending', 'sent', 'opened'].includes(submission.docuseal_status)
  const canDownload = submission.docuseal_status === 'signed' && !!submission.signed_pdf_url

  return (
    <>
      <SheetHeader className="mb-6">
        <SheetTitle>Detalhes do contrato</SheetTitle>
        <SheetDescription>
          Submission DocuSeal #{submission.docuseal_submission_id ?? '—'}
        </SheetDescription>
      </SheetHeader>

      {/* Acoes principais */}
      <div className="flex gap-2 mb-6">
        {canResend && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
          >
            <Send className="size-4" />
            {isResending ? 'Reenviando...' : 'Reenviar email'}
          </Button>
        )}
        {canDownload && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="size-4" />
            {isDownloading ? 'Baixando...' : 'Baixar PDF'}
          </Button>
        )}
      </div>

      {/* Status atual */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
          Status
        </p>
        <ContractStatusBadge status={submission.docuseal_status} />
        {submission.error_message && (
          <div className="mt-2 rounded-md bg-destructive/10 p-3">
            <p className="text-xs font-medium text-destructive">Erro:</p>
            <p className="text-xs text-muted-foreground mt-0.5">{submission.error_message}</p>
          </div>
        )}
      </div>

      {/* Dados do signatario */}
      <div className="mb-6 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Signatario
        </p>
        <div className="rounded-lg border border-border p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{submission.person_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">{submission.person_email}</span>
          </div>
          {submission.person_cpf && (
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">CPF: {submission.person_cpf}</span>
            </div>
          )}
        </div>
      </div>

      {/* Template */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
          Template DocuSeal
        </p>
        <p className="text-sm font-mono text-muted-foreground">
          #{submission.docuseal_template_id}
        </p>
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
          Historico
        </p>
        <Timeline submission={submission} />
      </div>
    </>
  )
}

// --- Timeline de eventos da submission ---

function Timeline({ submission }: { submission: DocuSealSubmission }) {
  interface TimelineEvent {
    label: string
    date: string | null
    icon: typeof Clock
    done: boolean
  }

  const events: TimelineEvent[] = [
    {
      label: 'Criado',
      date: submission.created_at,
      icon: FileText,
      done: true,
    },
    {
      label: 'Enviado para assinatura',
      date: submission.sent_at,
      icon: Send,
      done: !!submission.sent_at,
    },
    {
      label: 'Aberto pelo signatario',
      date: submission.opened_at,
      icon: Mail,
      done: !!submission.opened_at,
    },
    {
      label: 'Assinado',
      date: submission.signed_at,
      icon: CheckCircle,
      done: !!submission.signed_at,
    },
  ]

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" aria-hidden="true" />

      <div className="space-y-4">
        {events.map((event) => {
          const Icon = event.icon
          return (
            <div key={event.label} className="flex gap-4 items-start relative pl-0">
              {/* Icone */}
              <div
                className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${
                  event.done
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <Icon className="size-4" />
              </div>

              {/* Texto */}
              <div className="pt-1 min-w-0">
                <p className={`text-sm font-medium ${event.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(event.date)} &middot; {formatRelativeDate(event.date)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
