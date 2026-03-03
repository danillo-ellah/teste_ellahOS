'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useCheckApproval, useRequestApproval, useDecideApproval } from '@/hooks/usePaymentApprovals'
import { useUserRole } from '@/hooks/useUserRole'
import {
  PAYMENT_APPROVAL_STATUS_CONFIG,
  APPROVAL_ROLE_LABELS,
  type PaymentApprovalStatus,
  type CostItem,
} from '@/types/cost-management'
import { formatCurrency } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

// Hierarquia de roles para verificar se usuario pode decidir
const ROLE_HIERARCHY: Record<string, number> = {
  freelancer: 0,
  diretor: 1,
  produtor: 1,
  financeiro: 2,
  admin: 3,
  cfo: 4,
  ceo: 5,
}

// Roles que podem solicitar aprovacao
const REQUEST_ALLOWED_ROLES = ['financeiro', 'admin', 'ceo']

interface PaymentApprovalSectionProps {
  item: CostItem
  // Aprovacao pendente mais recente (se houver) — carregada pelo drawer
  approval?: {
    id: string
    status: 'pending' | 'approved' | 'rejected'
    amount: number
    requested_at: string
    decided_at: string | null
    decision_notes: string | null
    required_role?: string | null
    requester?: { full_name: string; email: string } | null
    decider?: { full_name: string; email: string } | null
    payment_approval_rules?: { required_role: string } | null
  } | null
  onApprovalChanged?: () => void
}

/**
 * Secao colapsavel de "Aprovacao de Pagamento" para uso no CostItemDrawer.
 *
 * Exibe:
 * - not_required: nada (secao oculta)
 * - pending: badge amber + info do solicitante + botoes de decisao para quem tem role
 * - approved: badge green + quem aprovou + quando
 * - rejected: badge red + motivo + botao para re-solicitar
 */
export function PaymentApprovalSection({
  item,
  approval,
  onApprovalChanged,
}: PaymentApprovalSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [decideDialogOpen, setDecideDialogOpen] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<'approved' | 'rejected' | null>(null)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [requestConfirmOpen, setRequestConfirmOpen] = useState(false)

  const { role } = useUserRole()
  const approvalStatus = (item.payment_approval_status ?? 'not_required') as PaymentApprovalStatus

  const amount = item.total_with_overtime ?? 0

  // Verificar se requer aprovacao (para itens not_required — pode mudar com regras)
  const { data: checkResult, isLoading: isChecking } = useCheckApproval(
    item.id,
    amount,
  )

  const { mutateAsync: requestApproval, isPending: isRequesting } = useRequestApproval()
  const { mutateAsync: decideApproval, isPending: isDeciding } = useDecideApproval()

  // Nao exibir secao se status e not_required E nao requer aprovacao
  const requiresApproval = checkResult?.requires_approval ?? false
  if (approvalStatus === 'not_required' && !requiresApproval) {
    return null
  }

  // Verificar se usuario pode solicitar aprovacao
  const canRequest = !!role && REQUEST_ALLOWED_ROLES.includes(role) && approvalStatus === 'not_required'

  // Verificar se usuario pode decidir (role >= required_role)
  const requiredRole = approval?.payment_approval_rules?.required_role ?? checkResult?.required_role
  const canDecide = (() => {
    if (!role || !requiredRole) return false
    if (approvalStatus !== 'pending') return false
    const userLevel = ROLE_HIERARCHY[role] ?? 0
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99
    return userLevel >= requiredLevel
  })()

  const cfg = PAYMENT_APPROVAL_STATUS_CONFIG[approvalStatus]

  // Formatar data de forma legivel
  function formatDate(isoDate: string | null): string {
    if (!isoDate) return '—'
    return new Date(isoDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function handleRequest() {
    try {
      await requestApproval(item.id)
      toast.success('Solicitacao de aprovacao enviada')
      setRequestConfirmOpen(false)
      onApprovalChanged?.()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  function openDecideDialog(decision: 'approved' | 'rejected') {
    setPendingDecision(decision)
    setDecisionNotes('')
    setDecideDialogOpen(true)
  }

  async function handleDecide() {
    if (!pendingDecision || !approval) return

    if (pendingDecision === 'rejected' && !decisionNotes.trim()) {
      toast.error('Informe o motivo da rejeicao')
      return
    }

    try {
      await decideApproval({
        approvalId: approval.id,
        decision: pendingDecision,
        notes: decisionNotes.trim() || undefined,
      })
      const label = pendingDecision === 'approved' ? 'Pagamento aprovado' : 'Pagamento rejeitado'
      toast.success(label)
      setDecideDialogOpen(false)
      setPendingDecision(null)
      onApprovalChanged?.()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <>
      <div className="border border-border rounded-md">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/50 rounded-md"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            Aprovacao de Pagamento
            {/* Dot indicador de status */}
            {approvalStatus !== 'not_required' && (
              <span className={cn('h-2 w-2 rounded-full', cfg.dotClass)} />
            )}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* not_required mas requer aprovacao (ainda nao solicitado) */}
            {approvalStatus === 'not_required' && requiresApproval && (
              <div className="space-y-3">
                {isChecking ? (
                  <Skeleton className="h-4 w-3/4" />
                ) : (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Este item ({formatCurrency(amount)}) requer aprovacao de{' '}
                      <strong>{APPROVAL_ROLE_LABELS[checkResult?.required_role ?? 'admin'] ?? checkResult?.required_role}</strong>{' '}
                      antes do pagamento.
                    </span>
                  </div>
                )}
                {canRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRequestConfirmOpen(true)}
                    disabled={isRequesting || isChecking}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    {isRequesting ? 'Enviando...' : 'Solicitar Aprovacao'}
                  </Button>
                )}
              </div>
            )}

            {/* pending */}
            {approvalStatus === 'pending' && (
              <div className="space-y-3">
                <div className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', cfg.badgeClass)}>
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">{cfg.label}</p>
                    {approval?.requester && (
                      <p className="text-xs opacity-80">
                        Solicitado por {approval.requester.full_name} em {formatDate(approval.requested_at)}
                      </p>
                    )}
                    {approval?.amount && (
                      <p className="text-xs opacity-80">
                        Valor: {formatCurrency(Number(approval.amount))}
                      </p>
                    )}
                    {requiredRole && (
                      <p className="text-xs opacity-80">
                        Requer aprovacao: {APPROVAL_ROLE_LABELS[requiredRole as keyof typeof APPROVAL_ROLE_LABELS] ?? requiredRole}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botoes de decisao para quem tem permissao */}
                {canDecide && approval && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                      onClick={() => openDecideDialog('approved')}
                      disabled={isDeciding}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => openDecideDialog('rejected')}
                      disabled={isDeciding}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* approved */}
            {approvalStatus === 'approved' && (
              <div className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', cfg.badgeClass)}>
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">{cfg.label}</p>
                  {approval?.decider && (
                    <p className="text-xs opacity-80">
                      Aprovado por {approval.decider.full_name} em {formatDate(approval.decided_at)}
                    </p>
                  )}
                  {approval?.decision_notes && (
                    <p className="text-xs opacity-80">
                      Observacao: {approval.decision_notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* rejected */}
            {approvalStatus === 'rejected' && (
              <div className="space-y-3">
                <div className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', cfg.badgeClass)}>
                  <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">{cfg.label}</p>
                    {approval?.decider && (
                      <p className="text-xs opacity-80">
                        Rejeitado por {approval.decider.full_name} em {formatDate(approval.decided_at)}
                      </p>
                    )}
                    {approval?.decision_notes && (
                      <p className="text-xs opacity-80">
                        Motivo: {approval.decision_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Permitir re-solicitar apos rejeicao */}
                {canRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRequestConfirmOpen(true)}
                    disabled={isRequesting}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    {isRequesting ? 'Enviando...' : 'Solicitar novamente'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AlertDialog: confirmar solicitacao */}
      <AlertDialog open={requestConfirmOpen} onOpenChange={setRequestConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar aprovacao de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O item <strong>{item.service_description}</strong> ({formatCurrency(amount)}) sera enviado para aprovacao.
              {requiredRole && (
                <> Um usuario com papel <strong>{APPROVAL_ROLE_LABELS[requiredRole as keyof typeof APPROVAL_ROLE_LABELS] ?? requiredRole}</strong> ou superior sera notificado.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequest} disabled={isRequesting}>
              {isRequesting ? 'Enviando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: decisao de aprovacao/rejeicao */}
      <AlertDialog open={decideDialogOpen} onOpenChange={setDecideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDecision === 'approved' ? 'Aprovar pagamento?' : 'Rejeitar pagamento?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision === 'approved'
                ? `Voce esta aprovando o pagamento de ${formatCurrency(amount)} para "${item.service_description}".`
                : `Voce esta rejeitando o pagamento de ${formatCurrency(amount)} para "${item.service_description}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Campo de observacao (obrigatorio para rejeicao) */}
          <div className="space-y-2 px-0">
            <Label htmlFor="decision-notes">
              {pendingDecision === 'rejected' ? (
                <>
                  Motivo da rejeicao <span className="text-destructive">*</span>
                </>
              ) : (
                'Observacao (opcional)'
              )}
            </Label>
            <Textarea
              id="decision-notes"
              placeholder={
                pendingDecision === 'rejected'
                  ? 'Informe o motivo da rejeicao...'
                  : 'Observacoes opcionais...'
              }
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDecideDialogOpen(false)
                setPendingDecision(null)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecide}
              disabled={isDeciding || (pendingDecision === 'rejected' && !decisionNotes.trim())}
              className={
                pendingDecision === 'rejected'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {isDeciding
                ? 'Processando...'
                : pendingDecision === 'approved'
                ? 'Confirmar Aprovacao'
                : 'Confirmar Rejeicao'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
