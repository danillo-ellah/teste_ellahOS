'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, LayoutTemplate } from 'lucide-react'
import { useApplyTemplate } from '@/hooks/useCostItems'
import {
  GG_TEMPLATE_PREVIEW,
  GG_TEMPLATE_TOTAL_ITEMS,
  GG_TEMPLATE_NAME,
} from '@/data/gg-template-preview'

interface ApplyTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  onSuccess: () => void
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  jobId,
  onSuccess,
}: ApplyTemplateDialogProps) {
  const applyTemplate = useApplyTemplate()
  const [isApplying, setIsApplying] = useState(false)

  async function handleApply() {
    setIsApplying(true)
    try {
      await applyTemplate.mutateAsync(jobId)
      toast.success(`Template aplicado: ${GG_TEMPLATE_TOTAL_ITEMS} itens criados`)
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao aplicar template'
      if (message.includes('409') || message.includes('CONFLICT') || message.includes('ja possui')) {
        toast.error('Este job ja possui itens de custo. Template so pode ser aplicado em job vazio.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-5" />
            Aplicar Template GG
          </DialogTitle>
          <DialogDescription>
            Template: <strong>{GG_TEMPLATE_NAME}</strong>
            <br />
            {GG_TEMPLATE_PREVIEW.length} categorias, {GG_TEMPLATE_TOTAL_ITEMS} itens no total.
            Linhas serao criadas sem valores — preencha depois.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[340px] pr-3">
          <div className="space-y-1">
            {GG_TEMPLATE_PREVIEW.map((cat) => (
              <div
                key={cat.item_number}
                className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                <span>
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {String(cat.item_number).padStart(2, '0')}
                  </span>
                  {cat.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cat.items_count} {cat.items_count === 1 ? 'item' : 'itens'}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Apos aplicar, delete as categorias que nao se aplicam ao seu job.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isApplying}>
            {isApplying ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <LayoutTemplate className="size-4 mr-1.5" />
                Aplicar Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
