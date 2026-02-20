'use client'

import { useState } from 'react'
import {
  Bell,
  ClipboardCheck,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { PortalApproval } from '@/types/portal'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function formatApprovalDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return ''
  }
}

// Componente de card de aprovacao individual
function ApprovalCard({
  approval,
  token,
  onResponded,
}: {
  approval: PortalApproval
  token: string
  onResponded: (id: string, action: 'approved' | 'rejected') => void
}) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responded, setResponded] = useState(false)
  const [respondedAction, setRespondedAction] = useState<'approved' | 'rejected' | null>(null)

  // Se ja respondido localmente, mostra estado de confirmacao
  if (responded && respondedAction) {
    const isApproved = respondedAction === 'approved'
    return (
      <div
        className={cn(
          'rounded-xl border-2 p-5 text-center transition-all',
          isApproved
            ? 'border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/5'
            : 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/5',
        )}
      >
        {isApproved ? (
          <>
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              Aprovacao registrada com sucesso
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Obrigado! A equipe de producao foi notificada.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-8 w-8 text-amber-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Solicitacao de alteracoes enviada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A equipe de producao foi notificada e entrara em contato.
            </p>
          </>
        )}
      </div>
    )
  }

  async function handleRespond(action: 'approved' | 'rejected', comment?: string) {
    setIsSubmitting(true)
    try {
      // Usa o token da approval (endpoint /approvals/public/:token/respond)
      const approvalToken = approval.token
      if (!approvalToken) throw new Error('Token de aprovacao nao disponivel')

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/approvals/public/${approvalToken}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, comment }),
        },
      )

      const json = await res.json()
      if (!res.ok || json?.error) {
        throw new Error(json?.error?.message ?? 'Erro ao registrar resposta')
      }

      setResponded(true)
      setRespondedAction(action)
      onResponded(approval.id, action)

      if (action === 'approved') {
        toast.success('Aprovacao registrada com sucesso!')
      } else {
        toast.success('Solicitacao de alteracoes enviada!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar sua resposta'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
      setShowApproveDialog(false)
      setShowRejectDialog(false)
    }
  }

  const isPending = approval.status === 'pending'
  const dateStr = formatApprovalDate(approval.created_at)

  return (
    <>
      <div
        className={cn(
          'rounded-xl border-2 p-5',
          isPending
            ? 'border-rose-300 dark:border-rose-500/40 bg-card'
            : 'border-border bg-card opacity-60',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div>
            <span
              className={cn(
                'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                approval.approval_type === 'interna'
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
              )}
            >
              {approval.approval_type === 'interna' ? 'Aprovacao Interna' : 'Aprovacao do Cliente'}
            </span>
            <h3 className="text-base font-semibold mt-2">{approval.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {approval.created_by_name
                ? `Enviado por ${approval.created_by_name}`
                : 'Enviado pela producao'}
              {dateStr && ` em ${dateStr}`}
            </p>
          </div>
        </div>

        {/* Descricao */}
        {approval.description && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg overflow-y-auto max-h-[120px]">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {approval.description}
            </p>
          </div>
        )}

        {/* Link do documento */}
        {approval.file_url && (
          <a
            href={approval.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm text-blue-500 hover:underline"
            aria-label={`Ver documento: ${approval.title} (abre em nova aba)`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Ver documento
          </a>
        )}

        {/* Botoes de acao (somente se pendente) */}
        {isPending && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 h-12 text-sm font-semibold gap-2"
              disabled={isSubmitting}
              onClick={() => setShowApproveDialog(true)}
              aria-label={`Aprovar ${approval.title}`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
              Aprovar
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 text-sm font-semibold gap-2 border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              disabled={isSubmitting}
              onClick={() => setShowRejectDialog(true)}
              aria-label={`Solicitar alteracoes em ${approval.title}`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
              Solicitar alteracoes
            </Button>
          </div>
        )}

        {/* Estado nao-pendente */}
        {!isPending && (
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium',
                approval.status === 'approved'
                  ? 'text-green-600 dark:text-green-400'
                  : approval.status === 'expired'
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-amber-600 dark:text-amber-400',
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {approval.status === 'approved'
                ? 'Aprovado'
                : approval.status === 'expired'
                  ? 'Expirado'
                  : 'Alteracoes solicitadas'}
            </span>
          </div>
        )}
      </div>

      {/* Dialog de confirmacao: Aprovar */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovacao</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, voce confirma que revisou e aprovou{' '}
              <strong>{approval.title}</strong>. Esta acao sera registrada e a
              equipe de producao sera notificada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={() => handleRespond('approved')}
              className="bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar aprovacao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Solicitar alteracoes */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar alteracoes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label
              htmlFor="reject-comment"
              className="text-sm font-medium text-foreground block"
            >
              Descreva as alteracoes necessarias:
            </label>
            <Textarea
              id="reject-comment"
              rows={4}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Ex: Ajustar o texto do segundo bloco, alterar a musica de fundo..."
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              disabled={isSubmitting || !rejectComment.trim()}
              onClick={() => handleRespond('rejected', rejectComment)}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface PortalApprovalsProps {
  approvals: PortalApproval[]
  token: string
}

export function PortalApprovals({ approvals, token }: PortalApprovalsProps) {
  const [localApprovals, setLocalApprovals] = useState(approvals)
  const pendingCount = localApprovals.filter((a) => a.status === 'pending').length

  function handleResponded(id: string, action: 'approved' | 'rejected') {
    setLocalApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: action === 'approved' ? 'approved' : 'rejected' } : a,
      ),
    )
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby="approvals-heading"
      id="approvals-section"
    >
      {/* Banner de atencao se houver pendentes */}
      {pendingCount > 0 && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 flex items-start gap-3">
          <Bell
            className="h-5 w-5 text-rose-500 shrink-0 mt-0.5"
            style={{ animation: 'bell-ring 2s ease-in-out infinite' }}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              AGUARDANDO SUA APROVACAO
            </p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-0.5">
              Por favor, revise e aprove ou solicite alteracoes.
              {pendingCount > 1 && ` Voce tem ${pendingCount} aprovacoes pendentes.`}
            </p>
          </div>
        </div>
      )}

      {/* Cabecalho da secao */}
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
        <h2 id="approvals-heading" className="text-base font-semibold">
          Aprovacoes
        </h2>
      </div>

      {/* Lista de aprovacoes ou estado vazio */}
      {localApprovals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" aria-hidden="true" />
          <p className="text-base font-medium">Nenhuma aprovacao pendente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Quando houver algo para aprovar, aparecera aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {localApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              token={token}
              onResponded={handleResponded}
            />
          ))}
        </div>
      )}
    </section>
  )
}
