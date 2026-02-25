'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Send, MoreHorizontal, FileSignature } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { ContractStatusBadge } from './contract-status-badge'
import { ContractDetailDrawer } from './contract-detail-drawer'
import { useDocuSealSubmissions, useResendDocuSeal, useDownloadDocuSeal } from '@/hooks/useDocuSealSubmissions'
import { ApiRequestError } from '@/lib/api'
import { formatDate, formatRelativeDate } from '@/lib/format'
import type { DocuSealSubmission } from '@/types/docuseal'

interface ContractsListProps {
  jobId: string
  onCreateClick: () => void
}

export function ContractsList({ jobId, onCreateClick }: ContractsListProps) {
  const { data: submissions, isLoading, isError, refetch } = useDocuSealSubmissions(jobId)
  const { mutateAsync: resend } = useResendDocuSeal()
  const { mutateAsync: download } = useDownloadDocuSeal()

  // ID da submission aberta no drawer de detalhes
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function handleResend(submission: DocuSealSubmission) {
    try {
      await resend({ submission_id: submission.id, job_id: jobId })
      toast.success('Email de assinatura reenviado')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao reenviar email'
      toast.error(msg)
    }
  }

  async function handleDownload(submission: DocuSealSubmission) {
    try {
      const result = await download(submission.id)
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
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar contratos.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const list = submissions ?? []

  if (list.length === 0) {
    return (
      <EmptyTabState
        icon={FileSignature}
        title="Nenhum contrato gerado"
        description="Gere contratos DocuSeal para os membros da equipe deste job."
        actionLabel="Gerar contratos"
        onAction={onCreateClick}
      />
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead>Assinado em</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((submission) => {
              const canResend = ['pending', 'sent', 'opened'].includes(submission.docuseal_status)
              const canDownload = submission.docuseal_status === 'signed'

              return (
                <TableRow
                  key={submission.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedId(submission.id)}
                >
                  <TableCell className="font-medium">
                    {submission.person_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {submission.person_email}
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={submission.docuseal_status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {submission.sent_at
                      ? formatRelativeDate(submission.sent_at)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {submission.signed_at
                      ? formatDate(submission.signed_at)
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(canResend || canDownload) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canResend && (
                            <DropdownMenuItem onClick={() => handleResend(submission)}>
                              <Send className="size-4" />
                              Reenviar email
                            </DropdownMenuItem>
                          )}
                          {canDownload && (
                            <DropdownMenuItem onClick={() => handleDownload(submission)}>
                              <Download className="size-4" />
                              Baixar PDF
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Drawer de detalhes */}
      <ContractDetailDrawer
        submissionId={selectedId}
        jobId={jobId}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
