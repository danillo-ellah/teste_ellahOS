'use client'

import { LayoutTemplate, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateWithActionsProps {
  onApplyTemplate: () => void
  onAddNew: () => void
}

export function EmptyStateWithActions({
  onApplyTemplate,
  onAddNew,
}: EmptyStateWithActionsProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <LayoutTemplate className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Nenhum item de custo</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Comece aplicando o template padrao de producao audiovisual com 140 itens pre-configurados,
        ou adicione itens manualmente.
      </p>
      <div className="flex gap-3">
        <Button onClick={onApplyTemplate}>
          <LayoutTemplate className="size-4 mr-1.5" />
          Aplicar Template GG
        </Button>
        <Button variant="outline" onClick={onAddNew}>
          <Plus className="size-4 mr-1.5" />
          Adicionar Item
        </Button>
      </div>
    </div>
  )
}
