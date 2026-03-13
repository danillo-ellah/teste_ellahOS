'use client'

import { LayoutTemplate, Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateWithActionsProps {
  onApplyTemplate: () => void
  onImportFromJob: () => void
  onAddNew: () => void
}

export function EmptyStateWithActions({
  onApplyTemplate,
  onImportFromJob,
  onAddNew,
}: EmptyStateWithActionsProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-20 px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-5">
        <LayoutTemplate className="size-10 text-muted-foreground/70" />
      </div>
      <h3 className="text-lg font-semibold mb-1.5">Nenhum item de custo</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        Comece aplicando o template padrao de producao audiovisual, importe a estrutura de outro
        job, ou adicione itens manualmente.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onApplyTemplate}>
          <LayoutTemplate className="size-4 mr-1.5" />
          Escolher Template
        </Button>
        <Button variant="outline" onClick={onImportFromJob}>
          <Copy className="size-4 mr-1.5" />
          Importar de Outro Job
        </Button>
        <Button variant="outline" onClick={onAddNew}>
          <Plus className="size-4 mr-1.5" />
          Adicionar Item
        </Button>
      </div>
    </div>
  )
}
