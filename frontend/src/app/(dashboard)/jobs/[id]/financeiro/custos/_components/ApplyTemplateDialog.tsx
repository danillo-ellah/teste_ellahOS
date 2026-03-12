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
import { cn } from '@/lib/utils'
import { Loader2, Film, Smartphone, Wand2, Clapperboard, ChevronDown } from 'lucide-react'
import { useApplyTemplate } from '@/hooks/useCostItems'
import { TEMPLATE_OPTIONS, type TemplateOption } from '@/data/gg-template-preview'

interface ApplyTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  onSuccess: () => void
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  monstro: <Film className="size-5" />,
  digital: <Smartphone className="size-5" />,
  motion: <Wand2 className="size-5" />,
  gg: <Clapperboard className="size-5" />,
}

const TEMPLATE_BADGE_COLORS: Record<string, string> = {
  monstro: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  digital: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  motion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-all',
        'hover:border-primary/50 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-transparent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'mt-0.5 shrink-0 rounded-md p-1.5',
              selected
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {TEMPLATE_ICONS[template.id]}
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>
              {template.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {template.description}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 self-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
            TEMPLATE_BADGE_COLORS[template.id],
          )}
        >
          {template.total_items} itens
        </span>
      </div>
    </button>
  )
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  jobId,
  onSuccess,
}: ApplyTemplateDialogProps) {
  const applyTemplate = useApplyTemplate()
  const [isApplying, setIsApplying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)

  const selectedTemplate = TEMPLATE_OPTIONS.find((t) => t.id === selectedId) ?? null

  function handleSelect(id: string) {
    if (selectedId === id) {
      setShowCategories((prev) => !prev)
    } else {
      setSelectedId(id)
      setShowCategories(true)
    }
  }

  async function handleApply() {
    if (!selectedTemplate) return
    setIsApplying(true)
    try {
      await applyTemplate.mutateAsync({ jobId, template: selectedTemplate.id })
      toast.success(`Template aplicado: ${selectedTemplate.total_items} itens criados`)
      onOpenChange(false)
      setSelectedId(null)
      setShowCategories(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao aplicar template'
      if (
        message.includes('409') ||
        message.includes('CONFLICT') ||
        message.includes('ja possui')
      ) {
        toast.error(
          'Este job ja possui itens de custo. Template so pode ser aplicado em job vazio.',
        )
      } else {
        toast.error(message)
      }
    } finally {
      setIsApplying(false)
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setSelectedId(null)
      setShowCategories(false)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aplicar Template de Custos</DialogTitle>
          <DialogDescription>
            Escolha o template adequado para o job. As linhas serao criadas sem valores — preencha
            depois.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="space-y-2">
            {TEMPLATE_OPTIONS.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedId === template.id}
                onSelect={() => handleSelect(template.id)}
              />
            ))}
          </div>

          {selectedTemplate && (
            <div className="rounded-lg border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setShowCategories((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors"
              >
                <span>
                  {selectedTemplate.categories.length} categorias &middot;{' '}
                  {selectedTemplate.total_items} itens no total
                </span>
                <ChevronDown
                  className={cn('size-4 text-muted-foreground transition-transform', {
                    'rotate-180': showCategories,
                  })}
                />
              </button>

              {showCategories && (
                <ScrollArea className="max-h-[200px]">
                  <div className="px-3 pb-2 space-y-0.5">
                    {selectedTemplate.categories.map((cat) => (
                      <div
                        key={cat.item_number}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {String(cat.item_number).padStart(2, '0')}
                          </span>
                          {cat.name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {cat.items_count} {cat.items_count === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isApplying || !selectedTemplate}>
            {isApplying ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                {selectedTemplate && TEMPLATE_ICONS[selectedTemplate.id]}
                <span className="ml-1.5">
                  {selectedTemplate ? `Aplicar ${selectedTemplate.name}` : 'Selecione um template'}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
