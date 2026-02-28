'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, ExternalLink, FileText, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNfList } from '@/hooks/useNf'
import { useLinkNfToCostItem } from '@/hooks/useCostItems'
import { NfStatusBadge } from '@/app/(dashboard)/financeiro/nf-validation/_components/nf-status-badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { NfDocument } from '@/types/nf'

interface LinkNfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  costItemId: string
}

export function LinkNfDialog({
  open,
  onOpenChange,
  jobId,
  costItemId,
}: LinkNfDialogProps) {
  const [selectedNfId, setSelectedNfId] = useState<string | null>(null)

  const { data: nfDocuments, meta, isLoading } = useNfList({
    job_id: jobId,
    per_page: 100,
  })

  const { mutateAsync: linkNf, isPending } = useLinkNfToCostItem()

  async function handleConfirm() {
    if (!selectedNfId) {
      toast.error('Selecione uma nota fiscal')
      return
    }

    try {
      await linkNf({ nf_document_id: selectedNfId, cost_item_id: costItemId })
      toast.success('NF vinculada ao item de custo')
      onOpenChange(false)
      setSelectedNfId(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) setSelectedNfId(null)
    onOpenChange(value)
  }

  const totalNfs = meta?.total ?? nfDocuments?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular Nota Fiscal</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            Selecione uma NF deste job para vincular ao item de custo.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !nfDocuments || nfDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma NF encontrada</p>
              <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                Este job ainda nao possui notas fiscais processadas.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto space-y-1.5">
                {nfDocuments.map((nf: NfDocument) => {
                  const isSelected = selectedNfId === nf.id
                  return (
                    <button
                      key={nf.id}
                      type="button"
                      onClick={() => setSelectedNfId(nf.id)}
                      className={cn(
                        'w-full text-left rounded-md border p-3 transition-colors hover:bg-accent/50',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {nf.file_name}
                            </span>
                            <NfStatusBadge status={nf.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {nf.extracted_issuer_name && (
                              <span>{nf.extracted_issuer_name}</span>
                            )}
                            {nf.extracted_value != null && (
                              <span>{formatCurrency(nf.extracted_value)}</span>
                            )}
                            <span>{formatDate(nf.created_at)}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        ) : (
                          nf.drive_url && (
                            <a
                              href={nf.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              {totalNfs > nfDocuments.length && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Mostrando {nfDocuments.length} de {totalNfs} NFs.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !selectedNfId}
          >
            {isPending ? 'Vinculando...' : 'Vincular NF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
