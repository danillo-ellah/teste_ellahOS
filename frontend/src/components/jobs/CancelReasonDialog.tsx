'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CancelReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  isPending?: boolean
}

export function CancelReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: CancelReasonDialogProps) {
  const [reason, setReason] = useState('')

  function handleConfirm() {
    if (reason.trim().length === 0) return
    onConfirm(reason.trim())
    // Nao limpar reason aqui - o pai fecha o dialog (que limpa via handleOpenChange)
    // Se o pai falhar, o usuario ainda ve o motivo digitado para tentar novamente
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setReason('')
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar job</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. Este campo e obrigatorio.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento..."
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
          disabled={isPending}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length === 0}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
