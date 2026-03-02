'use client'

import { toast } from 'sonner'
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
import { useApproveCashAdvance } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { CashAdvance } from '@/types/cost-management'

interface ApproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advance: CashAdvance
}

// Dialog de confirmacao para aprovacao de adiantamento acima do threshold (10% do orcamento)
// Apenas CEO e CFO (admin) chegam aqui — o botao e escondido para outros roles
export function ApproveDialog({ open, onOpenChange, advance }: ApproveDialogProps) {
  const { mutateAsync, isPending } = useApproveCashAdvance()

  async function handleConfirm() {
    try {
      await mutateAsync(advance.id)
      toast.success('Adiantamento aprovado com sucesso.')
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar adiantamento acima do limite?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                O adiantamento de <strong>{advance.recipient_name}</strong> no valor de{' '}
                <strong className="text-foreground">
                  {formatCurrency(advance.amount_authorized)}
                </strong>{' '}
                excede o limite automatico de 10% do orcamento fechado do job.
              </p>
              <p>
                Ao confirmar, voce (como CEO/CFO) esta autorizando explicitamente este
                adiantamento. Esta acao fica registrada no historico do job.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Aprovando...' : 'Confirmar aprovacao'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
