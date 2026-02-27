'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCostCategories'
import type { CostCategory } from '@/types/cost-management'

const PRODUCTION_TYPE_LABELS: Record<string, string> = {
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
}

const PRODUCTION_TYPES = Object.keys(PRODUCTION_TYPE_LABELS)

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Categoria para edicao — se nulo, modo criacao */
  category?: CostCategory | null
  /** Tipo de producao pre-selecionado ao criar */
  defaultProductionType?: string
}

interface FormData {
  item_number: string
  display_name: string
  description: string
  sort_order: string
  production_type: string
}

function getEmptyForm(defaultProductionType = 'filme_publicitario'): FormData {
  return {
    item_number: '',
    display_name: '',
    description: '',
    sort_order: '',
    production_type: defaultProductionType,
  }
}

function categoryToForm(category: CostCategory): FormData {
  return {
    item_number: String(category.item_number),
    display_name: category.display_name,
    description: category.description ?? '',
    sort_order: String(category.sort_order),
    production_type: category.production_type,
  }
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  defaultProductionType,
}: CategoryDialogProps) {
  const isEditing = !!category

  // O form e inicializado a partir das props no mount — o componente pai passa
  // uma `key` diferente a cada abertura para forcar remount e reinicializar o estado.
  const [form, setForm] = useState<FormData>(
    category ? categoryToForm(category) : getEmptyForm(defaultProductionType),
  )

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const isPending = createMutation.isPending || updateMutation.isPending

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleClose(open: boolean) {
    onOpenChange(open)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const itemNumber = parseInt(form.item_number, 10)
    if (!form.item_number || isNaN(itemNumber) || itemNumber <= 0) {
      toast.error('Numero do item deve ser um inteiro positivo')
      return
    }
    if (!form.display_name.trim()) {
      toast.error('Nome da categoria e obrigatorio')
      return
    }
    if (!form.production_type) {
      toast.error('Tipo de producao e obrigatorio')
      return
    }

    const sortOrder = form.sort_order ? parseInt(form.sort_order, 10) : itemNumber * 10

    try {
      if (isEditing && category) {
        await updateMutation.mutateAsync({
          id: category.id,
          item_number: itemNumber,
          display_name: form.display_name.trim(),
          description: form.description.trim() || null,
          sort_order: sortOrder,
        })
        toast.success('Categoria atualizada')
      } else {
        await createMutation.mutateAsync({
          item_number: itemNumber,
          display_name: form.display_name.trim(),
          production_type: form.production_type,
          description: form.description.trim() || null,
          sort_order: sortOrder,
          is_active: true,
        })
        toast.success('Categoria criada')
      }
      handleClose(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg.includes('unique') ? 'Ja existe uma categoria com esse numero neste tipo' : msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de producao — somente na criacao */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="production_type">
                Tipo de Producao <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.production_type}
                onValueChange={(v) => setField('production_type', v)}
                disabled={isPending}
              >
                <SelectTrigger id="production_type">
                  <SelectValue placeholder="Selecione o tipo" />
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
          )}

          {/* Numero do item */}
          <div className="space-y-1.5">
            <Label htmlFor="item_number">
              Numero do Item <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item_number"
              type="number"
              min={1}
              placeholder="Ex: 1, 2, 3..."
              value={form.item_number}
              onChange={(e) => setField('item_number', e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="display_name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display_name"
              placeholder="Ex: Equipe Tecnica"
              value={form.display_name}
              onChange={(e) => setField('display_name', e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              placeholder="Descricao opcional da categoria"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          {/* Ordem de exibicao */}
          <div className="space-y-1.5">
            <Label htmlFor="sort_order">
              Ordem de Exibicao
              <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="sort_order"
              type="number"
              min={0}
              placeholder="Deixe em branco para usar o numero do item x10"
              value={form.sort_order}
              onChange={(e) => setField('sort_order', e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditing
                ? 'Salvar Alteracoes'
                : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
