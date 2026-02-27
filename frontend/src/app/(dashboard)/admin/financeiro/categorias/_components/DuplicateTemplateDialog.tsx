'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { useCostCategories, useDuplicateTemplate } from '@/hooks/useCostCategories'

const PRODUCTION_TYPE_LABELS: Record<string, string> = {
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
}

const PRODUCTION_TYPES = Object.keys(PRODUCTION_TYPE_LABELS)

interface DuplicateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DuplicateTemplateDialog({ open, onOpenChange }: DuplicateTemplateDialogProps) {
  const [fromType, setFromType] = useState(PRODUCTION_TYPES[0])
  const [toType, setToType] = useState(PRODUCTION_TYPES[1])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: sourceCategories, isLoading: loadingPreview } = useCostCategories(fromType)
  const duplicateMutation = useDuplicateTemplate()

  const sourceCount = sourceCategories?.length ?? 0
  const sameType = fromType === toType

  function handleRequestConfirm() {
    if (sameType) {
      toast.error('Origem e destino nao podem ser iguais')
      return
    }
    if (sourceCount === 0) {
      toast.error('Nao ha categorias no tipo de origem')
      return
    }
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    try {
      const result = await duplicateMutation.mutateAsync({ fromType, toType })
      toast.success(
        `${result.count} ${result.count === 1 ? 'categoria copiada' : 'categorias copiadas'} com sucesso`,
      )
      setConfirmOpen(false)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao duplicar template'
      toast.error(msg)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Template de Categorias</DialogTitle>
            <DialogDescription>
              Copia todas as categorias de um tipo de producao para outro.
              Categorias ja existentes no destino nao serao substituidas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Origem */}
            <div className="space-y-1.5">
              <Label htmlFor="from_type">Tipo de Origem</Label>
              <Select value={fromType} onValueChange={setFromType}>
                <SelectTrigger id="from_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRODUCTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2 text-center">
                {loadingPreview ? (
                  <span className="text-xs text-muted-foreground">Carregando...</span>
                ) : (
                  <>
                    <p className="text-lg font-semibold leading-none">{sourceCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sourceCount === 1 ? 'categoria' : 'categorias'}
                    </p>
                  </>
                )}
              </div>
              <ArrowRight className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">{PRODUCTION_TYPE_LABELS[toType]}</p>
              </div>
            </div>

            {/* Destino */}
            <div className="space-y-1.5">
              <Label htmlFor="to_type">Tipo de Destino</Label>
              <Select value={toType} onValueChange={setToType}>
                <SelectTrigger id="to_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRODUCTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sameType && (
                <p className="text-xs text-destructive">
                  Origem e destino nao podem ser iguais
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={duplicateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRequestConfirm}
              disabled={sameType || sourceCount === 0 || loadingPreview || duplicateMutation.isPending}
            >
              Duplicar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmacao final */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar duplicacao</AlertDialogTitle>
            <AlertDialogDescription>
              Serao copiadas {sourceCount}{' '}
              {sourceCount === 1 ? 'categoria' : 'categorias'} de{' '}
              <strong>{PRODUCTION_TYPE_LABELS[fromType]}</strong> para{' '}
              <strong>{PRODUCTION_TYPE_LABELS[toType]}</strong>.
              Esta acao nao substitui categorias ja existentes no destino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicateMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? 'Duplicando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
