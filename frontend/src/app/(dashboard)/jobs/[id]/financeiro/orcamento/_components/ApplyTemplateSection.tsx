'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Layers, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useApplyTemplate } from '@/hooks/useCostItems'
import { safeErrorMessage } from '@/lib/api'
import type { CostItem } from '@/types/cost-management'

interface ApplyTemplateSectionProps {
  jobId: string
  onApplied?: () => void
}

export function ApplyTemplateSection({ jobId, onApplied }: ApplyTemplateSectionProps) {
  const [lastResult, setLastResult] = useState<{ created: number } | null>(null)
  const { mutate, isPending } = useApplyTemplate()

  function handleApply() {
    mutate(jobId, {
      onSuccess: res => {
        const items = (res?.data as CostItem[] | undefined) ?? []
        const created = items.length
        setLastResult({ created })
        if (created > 0) {
          toast.success(`${created} categoria(s) criada(s) com sucesso`)
        } else {
          toast.info('Todas as categorias ja existem neste job')
        }
        onApplied?.()
      },
      onError: err => {
        toast.error(safeErrorMessage(err) || 'Erro ao aplicar template')
      },
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          Template de Categorias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Aplica as categorias padrao de custo (linhas de cabecalho) no job com base no tipo de
          producao. Itens que ja existem nao sao duplicados.
        </p>

        {lastResult !== null && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {lastResult.created > 0
              ? `${lastResult.created} categoria(s) criada(s)`
              : 'Todas as categorias ja existem neste job'}
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              {isPending ? 'Aplicando...' : 'Aplicar Template'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aplicar template de categorias?</AlertDialogTitle>
              <AlertDialogDescription>
                As categorias padrao do tipo de producao deste job serao criadas como itens de
                cabecalho. Itens que ja existem nao serao duplicados. Esta acao nao pode ser
                desfeita automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleApply} disabled={isPending}>
                Aplicar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
