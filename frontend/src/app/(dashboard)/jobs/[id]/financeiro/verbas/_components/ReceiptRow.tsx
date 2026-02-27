'use client'

import { useState } from 'react'
import { Check, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useReviewReceipt } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ExpenseReceipt, ReceiptType, ReceiptStatus } from '@/types/cost-management'

// ============ Labels ============

const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  nf: 'NF',
  recibo: 'Recibo',
  ticket: 'Ticket',
  outros: 'Outros',
}

const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

function receiptStatusClass(status: ReceiptStatus): string {
  if (status === 'aprovado') return 'bg-green-100 text-green-700 border-green-200'
  if (status === 'rejeitado') return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

// ============ Review Dialog ============

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advanceId: string
  receiptId: string
  action: 'aprovado' | 'rejeitado'
}

function ReviewDialog({ open, onOpenChange, advanceId, receiptId, action }: ReviewDialogProps) {
  const [note, setNote] = useState('')
  const { mutateAsync, isPending } = useReviewReceipt()

  async function handleSubmit() {
    if (action === 'rejeitado' && !note.trim()) {
      toast.error('Informe o motivo da rejeicao.')
      return
    }

    try {
      await mutateAsync({
        advanceId,
        receiptId,
        status: action,
        review_note: note.trim() || undefined,
      })
      toast.success(action === 'aprovado' ? 'Comprovante aprovado.' : 'Comprovante rejeitado.')
      setNote('')
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {action === 'aprovado' ? 'Aprovar comprovante' : 'Rejeitar comprovante'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="review-note">
              {action === 'rejeitado' ? 'Motivo da rejeicao *' : 'Observacao (opcional)'}
            </Label>
            <Textarea
              id="review-note"
              placeholder={
                action === 'rejeitado'
                  ? 'Descreva o motivo da rejeicao...'
                  : 'Observacao opcional...'
              }
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant={action === 'rejeitado' ? 'destructive' : 'default'}
          >
            {isPending
              ? 'Salvando...'
              : action === 'aprovado'
                ? 'Confirmar aprovacao'
                : 'Confirmar rejeicao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ ReceiptRow ============

interface ReceiptRowProps {
  receipt: ExpenseReceipt
  advanceId: string
  isFinanceiro: boolean
}

export function ReceiptRow({ receipt, advanceId, isFinanceiro }: ReceiptRowProps) {
  const [reviewDialog, setReviewDialog] = useState<'aprovado' | 'rejeitado' | null>(null)

  return (
    <>
      <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
        {/* Valor */}
        <span className="tabular-nums font-semibold text-sm shrink-0">
          {formatCurrency(receipt.amount)}
        </span>

        {/* Descricao */}
        <span className="flex-1 text-sm text-foreground truncate" title={receipt.description}>
          {receipt.description}
        </span>

        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-xs">
            {RECEIPT_TYPE_LABELS[receipt.receipt_type]}
          </Badge>

          {receipt.expense_date && (
            <span className="text-xs text-muted-foreground">
              {formatDate(receipt.expense_date)}
            </span>
          )}

          <Badge
            variant="outline"
            className={cn('text-xs', receiptStatusClass(receipt.status))}
          >
            {RECEIPT_STATUS_LABELS[receipt.status]}
          </Badge>

          {receipt.document_url && (
            <a
              href={receipt.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Ver documento"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Acoes de review (role financeiro, status pendente) */}
          {isFinanceiro && receipt.status === 'pendente' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => setReviewDialog('aprovado')}
              >
                <Check className="h-3 w-3 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => setReviewDialog('rejeitado')}
              >
                <X className="h-3 w-3 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>

        {/* Nota de review (se rejeitado) */}
        {receipt.review_note && (
          <p className="w-full text-xs text-muted-foreground italic sm:col-span-full">
            Obs: {receipt.review_note}
          </p>
        )}
      </div>

      {/* Dialogs de review inline */}
      {reviewDialog && (
        <ReviewDialog
          open={reviewDialog !== null}
          onOpenChange={open => !open && setReviewDialog(null)}
          advanceId={advanceId}
          receiptId={receipt.id}
          action={reviewDialog}
        />
      )}
    </>
  )
}
