'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Banknote,
  FileText,
  Lock,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { useCloseCashAdvance } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashAdvance, CashAdvanceStatus } from '@/types/cost-management'
import { ReceiptRow } from './ReceiptRow'
import { DepositDialog } from './DepositDialog'
import { SubmitReceiptDialog } from './SubmitReceiptDialog'
import { ApproveDialog } from './ApproveDialog'

// ============ Status badge ============

const STATUS_LABELS: Record<CashAdvanceStatus, string> = {
  aberta: 'Aberta',
  encerrada: 'Encerrada',
  aprovada: 'Aprovada',
}

function statusBadgeClass(status: CashAdvanceStatus): string {
  if (status === 'aprovada') return 'bg-green-100 text-green-700 border-green-200'
  if (status === 'encerrada') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

// ============ KPI Pill ============

interface KpiPillProps {
  label: string
  value: number
  variant?: 'default' | 'success' | 'danger' | 'muted'
}

function KpiPill({ label, value, variant = 'default' }: KpiPillProps) {
  return (
    <div className="flex flex-col items-center rounded-md border bg-background px-2.5 py-1.5 min-w-[80px]">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          variant === 'success' && 'text-green-600',
          variant === 'danger' && 'text-red-600',
          variant === 'muted' && 'text-muted-foreground',
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function balanceVariant(balance: number): KpiPillProps['variant'] {
  if (balance > 0) return 'success'
  if (balance < 0) return 'danger'
  return 'muted'
}

// ============ Close Advance Confirmation ============

interface CloseConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advance: CashAdvance
}

function CloseConfirmDialog({ open, onOpenChange, advance }: CloseConfirmProps) {
  const { mutateAsync, isPending } = useCloseCashAdvance()

  async function handleConfirm() {
    try {
      await mutateAsync(advance.id)
      toast.success('Verba encerrada com sucesso.')
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar verba a vista?</AlertDialogTitle>
          <AlertDialogDescription>
            A verba de <strong>{advance.recipient_name}</strong> sera encerrada. Esta acao nao pode
            ser desfeita. Certifique-se de que todos os comprovantes foram submetidos e revisados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Encerrando...' : 'Confirmar encerramento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============ CashAdvanceCard ============

interface CashAdvanceCardProps {
  advance: CashAdvance
  isFinanceiro: boolean
  isProdutor: boolean
  isCeoOrAdmin: boolean
}

export function CashAdvanceCard({
  advance,
  isFinanceiro,
  isProdutor,
  isCeoOrAdmin,
}: CashAdvanceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)

  const receipts = advance.expense_receipts ?? []
  const isEditable = advance.status === 'aberta'

  // Adiantamento excede 10% do orcamento e ainda nao foi aprovado
  const needsApproval = advance.threshold_exceeded && !advance.approved_by

  return (
    <>
      <div
        className={cn(
          'rounded-lg border bg-card shadow-sm overflow-hidden',
          // Destaque visual quando precisa de aprovacao CEO/CFO
          needsApproval && 'border-amber-300',
        )}
      >
        {/* Header — sempre visivel */}
        <button
          type="button"
          className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
          onClick={() => setExpanded(prev => !prev)}
          aria-expanded={expanded}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            {/* Identidade */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm truncate">{advance.recipient_name}</span>

                <Badge
                  variant="outline"
                  className={cn('text-xs shrink-0', statusBadgeClass(advance.status))}
                >
                  {STATUS_LABELS[advance.status]}
                </Badge>

                {/* Badge de threshold excedido */}
                {advance.threshold_exceeded && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0 gap-1',
                      advance.approved_by
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}
                  >
                    {advance.approved_by ? (
                      <>
                        <ShieldCheck className="h-3 w-3" />
                        Aprovado CEO/CFO
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        Aguarda aprovacao
                      </>
                    )}
                  </Badge>
                )}

                {advance.drive_folder_url && (
                  <a
                    href={advance.drive_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Pasta no Drive"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{advance.description}</p>
            </div>

            {/* KPI pills */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              <KpiPill label="Autorizado" value={advance.amount_authorized} />
              <KpiPill label="Depositado" value={advance.amount_deposited} />
              <KpiPill label="Comprovado" value={advance.amount_documented} />
              <KpiPill
                label="Saldo"
                value={advance.balance}
                variant={balanceVariant(advance.balance)}
              />
            </div>

            {/* Chevron */}
            <div className="shrink-0 self-center">
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t px-4 py-3 space-y-3">
            {/* Alerta de aprovacao pendente */}
            {needsApproval && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Este adiantamento excede 10% do orcamento fechado do job e precisa de aprovacao
                  do CEO ou CFO antes de ser executado.
                </span>
              </div>
            )}

            {/* Metadados de deposito (se preenchidos) */}
            {(advance.pix_key_used || advance.deposit_date) && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1 text-xs text-muted-foreground">
                {advance.deposit_date && (
                  <div className="flex justify-between">
                    <span>Data do deposito</span>
                    <span className="font-medium text-foreground">
                      {new Date(advance.deposit_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {advance.pix_key_used && (
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0">Chave PIX</span>
                    <span className="font-medium text-foreground truncate text-right">
                      {advance.pix_key_used}
                    </span>
                  </div>
                )}
                {advance.receipt_url && (
                  <div className="flex justify-between">
                    <span>Comprovante</span>
                    <a
                      href={advance.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Comprovantes de gasto */}
            {receipts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Comprovantes ({receipts.length})
                </p>
                <div className="space-y-1.5">
                  {receipts.map(receipt => (
                    <ReceiptRow
                      key={receipt.id}
                      receipt={receipt}
                      advanceId={advance.id}
                      isFinanceiro={isFinanceiro}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                Nenhum comprovante submetido ainda.
              </p>
            )}

            {/* Notas */}
            {advance.notes && (
              <p className="text-xs text-muted-foreground italic border-t pt-2">
                Obs: {advance.notes}
              </p>
            )}

            {/* Acoes — so se status=aberta */}
            {isEditable && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {/* Aprovacao CEO/CFO — visivel quando threshold excedido e ainda sem aprovacao */}
                  {isCeoOrAdmin && needsApproval && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => setApproveOpen(true)}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      Aprovar adiantamento
                    </Button>
                  )}

                  {isFinanceiro && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDepositOpen(true)}
                    >
                      <Banknote className="h-4 w-4 mr-1.5" />
                      Registrar Deposito
                    </Button>
                  )}

                  {isProdutor && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReceiptOpen(true)}
                    >
                      <FileText className="h-4 w-4 mr-1.5" />
                      Submeter Comprovante
                    </Button>
                  )}

                  {isFinanceiro && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-muted-foreground"
                      onClick={() => setCloseOpen(true)}
                    >
                      <Lock className="h-4 w-4 mr-1.5" />
                      Encerrar Verba
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        advance={advance}
      />

      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        advance={advance}
      />

      <SubmitReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        advanceId={advance.id}
      />

      <CloseConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        advance={advance}
      />
    </>
  )
}
