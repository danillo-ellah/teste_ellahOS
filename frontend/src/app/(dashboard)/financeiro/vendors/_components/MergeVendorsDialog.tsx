'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Merge } from 'lucide-react'
import { useMergeVendors } from '@/hooks/useVendors'
import { safeErrorMessage } from '@/lib/api'
import type { Vendor } from '@/types/cost-management'

interface MergeVendorsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceVendor: Vendor | null
  targetVendor: Vendor | null
  onMerged?: () => void
}

export function MergeVendorsDialog({
  open,
  onOpenChange,
  sourceVendor,
  targetVendor,
  onMerged,
}: MergeVendorsDialogProps) {
  const mergeMutation = useMergeVendors()

  async function handleConfirm() {
    if (!sourceVendor || !targetVendor) return

    try {
      const result = await mergeMutation.mutateAsync({
        sourceId: sourceVendor.id,
        targetId: targetVendor.id,
      })
      const data = result.data
      toast.success(
        `Merge concluido: ${data?.cost_items_moved ?? 0} itens e ${data?.bank_accounts_moved ?? 0} contas movidos`
      )
      onOpenChange(false)
      onMerged?.()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  const isPending = mergeMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="size-5" />
            Mesclar Fornecedores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {sourceVendor && targetVendor ? (
            <>
              <div className="rounded-md border bg-muted/40 p-4 space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Origem (sera desativado):</span>
                  <p className="font-medium">{sourceVendor.full_name}</p>
                  {sourceVendor.email && (
                    <p className="text-muted-foreground text-xs">{sourceVendor.email}</p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <span className="text-muted-foreground">Destino (permanece ativo):</span>
                  <p className="font-medium">{targetVendor.full_name}</p>
                  {targetVendor.email && (
                    <p className="text-muted-foreground text-xs">{targetVendor.email}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Todos os itens de custo e contas bancarias serao movidos para{' '}
                <strong>{targetVendor.full_name}</strong>. O fornecedor de origem sera desativado e
                nao aparecera em novas selecoes.
              </p>

              <p className="text-sm font-medium text-destructive">
                Esta acao nao pode ser desfeita.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione os fornecedores para mesclar.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !sourceVendor || !targetVendor}
          >
            {isPending ? 'Mesclando...' : 'Confirmar Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
