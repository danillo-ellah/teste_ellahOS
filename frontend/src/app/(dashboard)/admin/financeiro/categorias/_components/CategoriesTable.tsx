'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil } from 'lucide-react'
import {
  useCostCategories,
  useUpdateCategory,
  useToggleCategoryActive,
  useDeleteCategory,
} from '@/hooks/useCostCategories'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { CostCategory } from '@/types/cost-management'

interface CategoriesTableProps {
  productionType: string
  onEdit: (category: CostCategory) => void
}

interface InlineEditCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  disabled?: boolean
}

function InlineEditCell({ value, onSave, disabled }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setEditValue(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  async function handleSave() {
    const trimmed = editValue.trim()
    if (!trimmed) {
      toast.error('Nome nao pode ser vazio')
      return
    }
    if (trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch {
      // error toast handled by caller
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditValue(value)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={saving || disabled}
        className="h-7 py-0 text-sm w-full max-w-[280px]"
      />
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'group flex items-center gap-1.5 text-left font-medium text-sm hover:text-primary focus:text-primary focus:outline-none',
        disabled && 'pointer-events-none',
      )}
      onClick={() => !disabled && setEditing(true)}
      title="Clique para editar"
    >
      <span>{value}</span>
      <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

interface RowActionsProps {
  category: CostCategory
  onEdit: (category: CostCategory) => void
  onDelete: (category: CostCategory) => void
}

function RowActions({ category, onEdit, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acoes</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(category)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(category)}
        >
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CategoriesTable({ productionType, onEdit }: CategoriesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<CostCategory | null>(null)

  const { data: categories, isLoading, isError, refetch } = useCostCategories(productionType)
  const updateMutation = useUpdateCategory()
  const toggleMutation = useToggleCategoryActive()
  const deleteMutation = useDeleteCategory()

  async function handleInlineRename(category: CostCategory, display_name: string) {
    try {
      await updateMutation.mutateAsync({ id: category.id, display_name })
      toast.success('Nome atualizado')
    } catch {
      toast.error('Erro ao atualizar nome')
      throw new Error('rename failed')
    }
  }

  async function handleToggle(category: CostCategory, is_active: boolean) {
    try {
      await toggleMutation.mutateAsync({ id: category.id, is_active })
      toast.success(is_active ? 'Categoria ativada' : 'Categoria desativada')
    } catch {
      toast.error('Erro ao alterar status da categoria')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Categoria excluida')
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Carregando categorias...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar categorias</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria encontrada para este tipo de producao.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Item #</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descricao</TableHead>
              <TableHead className="w-24">Ativo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} className="group">
                {/* Item # */}
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {String(category.item_number).padStart(2, '0')}
                  </Badge>
                </TableCell>

                {/* Nome — inline edit */}
                <TableCell className="min-w-[180px]">
                  <InlineEditCell
                    value={category.display_name}
                    onSave={(val) => handleInlineRename(category, val)}
                    disabled={updateMutation.isPending}
                  />
                </TableCell>

                {/* Descricao */}
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                    {category.description ?? '-'}
                  </span>
                </TableCell>

                {/* Ativo */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={(checked) => handleToggle(category, checked)}
                      disabled={toggleMutation.isPending}
                      aria-label={`${category.is_active ? 'Desativar' : 'Ativar'} ${category.display_name}`}
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {category.is_active ? 'Sim' : 'Nao'}
                    </span>
                  </div>
                </TableCell>

                {/* Acoes */}
                <TableCell>
                  <RowActions
                    category={category}
                    onEdit={onEdit}
                    onDelete={(c) => setDeleteTarget(c)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteTarget?.display_name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
