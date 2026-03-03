'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Shirt,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { apiGet, apiMutate, ApiRequestError } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { JobDetail } from '@/types/jobs'

// --- Tipos ---

type WardrobeItemType = 'figurino' | 'arte' | 'cenografia' | 'objeto_cena'
type WardrobeStatus = 'planejado' | 'comprado' | 'alugado' | 'emprestado' | 'devolvido' | 'descartado'

interface WardrobeItem {
  id: string
  job_id: string
  character_name: string
  scene_numbers: string | null
  item_description: string
  item_type: WardrobeItemType
  status: WardrobeStatus
  cost: number | null
  cost_item_id: string | null
  supplier: string | null
  photo_url: string | null
  reference_url: string | null
  notes: string | null
  created_at: string
}

interface WardrobeFormData {
  character_name: string
  scene_numbers: string
  item_description: string
  item_type: WardrobeItemType
  status: WardrobeStatus
  cost: string
  supplier: string
  photo_url: string
  reference_url: string
  notes: string
}

// --- Labels ---

const ITEM_TYPE_LABELS: Record<WardrobeItemType, string> = {
  figurino: 'Figurino',
  arte: 'Arte',
  cenografia: 'Cenografia',
  objeto_cena: 'Objeto de Cena',
}

const STATUS_LABELS: Record<WardrobeStatus, string> = {
  planejado: 'Planejado',
  comprado: 'Comprado',
  alugado: 'Alugado',
  emprestado: 'Emprestado',
  devolvido: 'Devolvido',
  descartado: 'Descartado',
}

const STATUS_COLORS: Record<WardrobeStatus, string> = {
  planejado: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  comprado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  alugado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  emprestado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  devolvido: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  descartado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const TYPE_COLORS: Record<WardrobeItemType, string> = {
  figurino: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  arte: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cenografia: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  objeto_cena: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
}

const EMPTY_FORM: WardrobeFormData = {
  character_name: '',
  scene_numbers: '',
  item_description: '',
  item_type: 'figurino',
  status: 'planejado',
  cost: '',
  supplier: '',
  photo_url: '',
  reference_url: '',
  notes: '',
}

// --- Hooks ---

function useWardrobeItems(jobId: string) {
  return useQuery({
    queryKey: ['wardrobe', jobId],
    queryFn: async () => {
      const res = await apiGet<WardrobeItem[]>('wardrobe', { job_id: jobId })
      return res.data
    },
    staleTime: 30_000,
  })
}

function useCreateWardrobeItem(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiMutate<WardrobeItem>('wardrobe', 'POST', body)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe', jobId] }),
  })
}

function useUpdateWardrobeItem(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await apiMutate<WardrobeItem>('wardrobe', 'PATCH', body, id)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe', jobId] }),
  })
}

function useDeleteWardrobeItem(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiMutate('wardrobe', 'DELETE', undefined, id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe', jobId] }),
  })
}

// --- Componente principal ---

interface TabWardrobeProps {
  job: JobDetail
}

export function TabWardrobe({ job }: TabWardrobeProps) {
  const { data: items, isLoading, isError, refetch } = useWardrobeItems(job.id)
  const { mutateAsync: createItem, isPending: isCreating } = useCreateWardrobeItem(job.id)
  const { mutateAsync: updateItem, isPending: isUpdating } = useUpdateWardrobeItem(job.id)
  const { mutateAsync: deleteItem, isPending: isDeleting } = useDeleteWardrobeItem(job.id)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<WardrobeItem | null>(null)
  const [form, setForm] = useState<WardrobeFormData>(EMPTY_FORM)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function handleOpenAdd() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function handleOpenEdit(item: WardrobeItem) {
    setEditingItem(item)
    setForm({
      character_name: item.character_name,
      scene_numbers: item.scene_numbers ?? '',
      item_description: item.item_description,
      item_type: item.item_type,
      status: item.status,
      cost: item.cost != null ? String(item.cost) : '',
      supplier: item.supplier ?? '',
      photo_url: item.photo_url ?? '',
      reference_url: item.reference_url ?? '',
      notes: item.notes ?? '',
    })
    setDialogOpen(true)
  }

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!form.character_name.trim()) {
      toast.error('Nome do personagem e obrigatorio')
      return
    }
    if (!form.item_description.trim()) {
      toast.error('Descricao do item e obrigatoria')
      return
    }

    const body: Record<string, unknown> = {
      character_name: form.character_name.trim(),
      scene_numbers: form.scene_numbers.trim() || null,
      item_description: form.item_description.trim(),
      item_type: form.item_type,
      status: form.status,
      cost: form.cost ? Number(form.cost) : null,
      supplier: form.supplier.trim() || null,
      photo_url: form.photo_url.trim() || null,
      reference_url: form.reference_url.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, body })
        toast.success('Ficha atualizada')
      } else {
        await createItem({ ...body, job_id: job.id })
        toast.success('Ficha criada')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar ficha'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deletingItem) return
    try {
      await deleteItem(deletingItem.id)
      toast.success('Ficha removida')
      setDeletingItem(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao remover ficha'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar fichas de figurino/arte.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const itemList = items ?? []

  if (itemList.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Shirt}
          title="Nenhuma ficha de figurino/arte"
          description="Adicione itens de figurino, arte, cenografia e objetos de cena para este job."
          actionLabel="Adicionar ficha"
          onAction={handleOpenAdd}
        />
        <WardrobeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          onFormChange={setForm}
          onSubmit={handleSubmit}
          isPending={isCreating || isUpdating}
          isEditing={!!editingItem}
        />
      </>
    )
  }

  // Agrupar por personagem
  const grouped = itemList.reduce<Record<string, WardrobeItem[]>>((acc, item) => {
    const key = item.character_name
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const groupNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  // Calcular custo total dos itens com custo definido
  const totalCost = itemList.reduce((sum, item) => sum + (item.cost ?? 0), 0)
  const itemsWithCost = itemList.filter((i) => i.cost != null).length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">
            Figurino / Arte ({itemList.length} {itemList.length === 1 ? 'item' : 'itens'})
          </h3>
          {itemsWithCost > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Custo orcado: {formatCurrency(totalCost)}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleOpenAdd}>
          <Plus className="size-4" />
          Adicionar ficha
        </Button>
      </div>

      {/* Grupos por personagem */}
      <div className="space-y-4">
        {groupNames.map((characterName) => {
          const groupItems = grouped[characterName]
          const isCollapsed = collapsedGroups.has(characterName)
          const groupCost = groupItems.reduce((sum, item) => sum + (item.cost ?? 0), 0)

          return (
            <div key={characterName} className="rounded-lg border border-border overflow-hidden">
              {/* Header do grupo */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                onClick={() => toggleGroup(characterName)}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed
                    ? <ChevronRight className="size-4 text-muted-foreground" />
                    : <ChevronDown className="size-4 text-muted-foreground" />
                  }
                  <span className="text-sm font-medium">{characterName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'})
                  </span>
                </div>
                {groupCost > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(groupCost)}
                  </span>
                )}
              </button>

              {/* Tabela do grupo */}
              {!isCollapsed && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Cenas</TableHead>
                      <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Custo</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]" title={item.item_description}>
                              {item.item_description}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5" title={item.notes}>
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.item_type]}`}>
                            {ITEM_TYPE_LABELS[item.item_type]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <WardrobeStatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {item.scene_numbers || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={item.supplier ?? ''}>
                            {item.supplier || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {item.cost != null ? formatCurrency(item.cost) : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Acoes para ${item.item_description}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )
        })}
      </div>

      {/* Dialog add/edit */}
      <WardrobeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isPending={isCreating || isUpdating}
        isEditing={!!editingItem}
      />

      {/* Confirm delete */}
      <AlertDialog open={deletingItem !== null} onOpenChange={(open) => { if (!open) setDeletingItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ficha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{deletingItem?.item_description}&quot;? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Badge de status ---

function WardrobeStatusBadge({ status }: { status: WardrobeStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// --- Dialog de criacao/edicao ---

interface WardrobeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: WardrobeFormData
  onFormChange: (form: WardrobeFormData) => void
  onSubmit: () => void
  isPending: boolean
  isEditing: boolean
}

function WardrobeDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isPending,
  isEditing,
}: WardrobeDialogProps) {
  function update<K extends keyof WardrobeFormData>(key: K, value: WardrobeFormData[K]) {
    onFormChange({ ...form, [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar ficha' : 'Nova ficha de figurino/arte'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Personagem */}
          <div className="space-y-1.5">
            <Label htmlFor="wrd-character">Personagem / Categoria <span className="text-destructive">*</span></Label>
            <Input
              id="wrd-character"
              placeholder="Ex: Protagonista, Personagem A, Cenario Principal"
              value={form.character_name}
              onChange={(e) => update('character_name', e.target.value)}
            />
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="wrd-description">Descricao do item <span className="text-destructive">*</span></Label>
            <Input
              id="wrd-description"
              placeholder="Ex: Camisa branca manga longa, Cadeira vintage, Coroa dourada"
              value={form.item_description}
              onChange={(e) => update('item_description', e.target.value)}
            />
          </div>

          {/* Tipo e Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wrd-type">Tipo</Label>
              <Select
                value={form.item_type}
                onValueChange={(v) => update('item_type', v as WardrobeItemType)}
              >
                <SelectTrigger id="wrd-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="figurino">Figurino</SelectItem>
                  <SelectItem value="arte">Arte</SelectItem>
                  <SelectItem value="cenografia">Cenografia</SelectItem>
                  <SelectItem value="objeto_cena">Objeto de Cena</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wrd-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update('status', v as WardrobeStatus)}
              >
                <SelectTrigger id="wrd-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="comprado">Comprado</SelectItem>
                  <SelectItem value="alugado">Alugado</SelectItem>
                  <SelectItem value="emprestado">Emprestado</SelectItem>
                  <SelectItem value="devolvido">Devolvido</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cenas e Custo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wrd-scenes">Cenas</Label>
              <Input
                id="wrd-scenes"
                placeholder="Ex: 1, 3, 5A"
                value={form.scene_numbers}
                onChange={(e) => update('scene_numbers', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wrd-cost">Custo (R$)</Label>
              <Input
                id="wrd-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.cost}
                onChange={(e) => update('cost', e.target.value)}
              />
            </div>
          </div>

          {/* Fornecedor */}
          <div className="space-y-1.5">
            <Label htmlFor="wrd-supplier">Fornecedor / Loja</Label>
            <Input
              id="wrd-supplier"
              placeholder="Nome da loja ou fornecedor"
              value={form.supplier}
              onChange={(e) => update('supplier', e.target.value)}
            />
          </div>

          {/* URL de referencia */}
          <div className="space-y-1.5">
            <Label htmlFor="wrd-ref-url">URL de referencia</Label>
            <Input
              id="wrd-ref-url"
              type="url"
              placeholder="https://pinterest.com/... ou loja online"
              value={form.reference_url}
              onChange={(e) => update('reference_url', e.target.value)}
            />
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="wrd-notes">Observacoes</Label>
            <Textarea
              id="wrd-notes"
              rows={3}
              placeholder="Detalhes adicionais, tamanho, cor exata, instrucoes de cuidado..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar alteracoes' : 'Criar ficha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
