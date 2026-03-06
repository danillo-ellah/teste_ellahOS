'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Plus, Pencil, CheckCircle2, X, Loader2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { safeErrorMessage } from '@/lib/api'
import { useClientLogistics, useCreateLogistics, useUpdateLogistics } from '@/hooks/useAttendance'
import type {
  ClientLogistics,
  LogisticsItemType,
  LogisticsStatus,
  CreateLogisticsPayload,
  UpdateLogisticsPayload,
} from '@/types/attendance'
import {
  LOGISTICS_TYPE_LABELS,
  LOGISTICS_STATUS_LABELS,
} from '@/types/attendance'

// ============ Constants ============

const LOGISTICS_ITEM_TYPE_OPTIONS = Object.entries(LOGISTICS_TYPE_LABELS) as [
  LogisticsItemType,
  string,
][]

const LOGISTICS_STATUS_OPTIONS = Object.entries(LOGISTICS_STATUS_LABELS) as [
  LogisticsStatus,
  string,
][]

const STATUS_BADGE_CLASS: Record<LogisticsStatus, string> = {
  pendente:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  confirmado:
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  cancelado:
    'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
}

// ============ Helpers ============

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// ============ Form state ============

interface LogisticsFormState {
  item_type: LogisticsItemType | ''
  description: string
  scheduled_date: string
  responsible_name: string
  notes: string
  // edit-only
  status: LogisticsStatus
  sent_to_client: boolean
}

const EMPTY_FORM: LogisticsFormState = {
  item_type: '',
  description: '',
  scheduled_date: '',
  responsible_name: '',
  notes: '',
  status: 'pendente',
  sent_to_client: false,
}

function formFromItem(item: ClientLogistics): LogisticsFormState {
  return {
    item_type: item.item_type,
    description: item.description,
    scheduled_date: item.scheduled_date ?? '',
    responsible_name: item.responsible_name ?? '',
    notes: item.notes ?? '',
    status: item.status,
    sent_to_client: item.sent_to_client,
  }
}

// ============ Skeleton ============

function LogisticsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 border-t border-border">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Mobile card ============

function LogisticsCard({
  item,
  onEdit,
}: {
  item: ClientLogistics
  onEdit: (item: ClientLogistics) => void
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {LOGISTICS_TYPE_LABELS[item.item_type]}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_BADGE_CLASS[item.status]}`}
          >
            {LOGISTICS_STATUS_LABELS[item.status]}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => onEdit(item)}
          aria-label="Editar item"
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>

      <p className="text-sm">{item.description}</p>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {item.scheduled_date && (
          <div>
            <span className="font-medium text-foreground">Data: </span>
            {formatDate(item.scheduled_date)}
          </div>
        )}
        {item.responsible_name && (
          <div>
            <span className="font-medium text-foreground">Responsavel: </span>
            {item.responsible_name}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">Enviado ao cliente: </span>
          {item.sent_to_client ? (
            <CheckCircle2 className="size-3.5 text-green-500" />
          ) : (
            <X className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {item.notes && (
        <p className="text-xs text-muted-foreground border-t pt-2">{item.notes}</p>
      )}
    </div>
  )
}

// ============ Dialog ============

interface LogisticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  form: LogisticsFormState
  onChange: (patch: Partial<LogisticsFormState>) => void
  onSave: () => void
  isSaving: boolean
}

function LogisticsDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  onChange,
  onSave,
  isSaving,
}: LogisticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar item de logistica' : 'Novo item de logistica'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label htmlFor="logistics-type">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.item_type}
              onValueChange={(v) => onChange({ item_type: v as LogisticsItemType })}
            >
              <SelectTrigger id="logistics-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {LOGISTICS_ITEM_TYPE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="logistics-desc">
              Descricao <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="logistics-desc"
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Descreva o item de logistica..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Data e Responsavel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="logistics-date">Data prevista</Label>
              <Input
                id="logistics-date"
                type="date"
                value={form.scheduled_date}
                onChange={(e) => onChange({ scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logistics-responsible">Responsavel</Label>
              <Input
                id="logistics-responsible"
                value={form.responsible_name}
                onChange={(e) => onChange({ responsible_name: e.target.value })}
                placeholder="Nome do responsavel"
              />
            </div>
          </div>

          {/* Status e Enviado ao cliente — somente no modo edicao */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="logistics-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => onChange({ status: v as LogisticsStatus })}
                >
                  <SelectTrigger id="logistics-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGISTICS_STATUS_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logistics-sent">Enviado ao cliente</Label>
                <div className="flex items-center h-10 gap-2">
                  <Switch
                    id="logistics-sent"
                    checked={form.sent_to_client}
                    onCheckedChange={(checked) => onChange({ sent_to_client: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.sent_to_client ? 'Sim' : 'Nao'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="logistics-notes">Observacoes</Label>
            <Textarea
              id="logistics-notes"
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Informacoes adicionais..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving || !form.item_type || !form.description.trim()}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? 'Salvar alteracoes' : 'Adicionar item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Main component ============

interface ClientLogisticsSectionProps {
  jobId: string
}

export function ClientLogisticsSection({ jobId }: ClientLogisticsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClientLogistics | null>(null)
  const [form, setForm] = useState<LogisticsFormState>(EMPTY_FORM)

  const { data, isLoading, isError, refetch } = useClientLogistics(jobId)
  const createMutation = useCreateLogistics()
  const updateMutation = useUpdateLogistics(jobId)

  const items: ClientLogistics[] = data?.data ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEditing = editingItem !== null

  // ---- Handlers ----

  function handleOpenCreate() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function handleOpenEdit(item: ClientLogistics) {
    setEditingItem(item)
    setForm(formFromItem(item))
    setDialogOpen(true)
  }

  function handleDialogChange(open: boolean) {
    if (!open) {
      setEditingItem(null)
      setForm(EMPTY_FORM)
    }
    setDialogOpen(open)
  }

  function handleFormChange(patch: Partial<LogisticsFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleSave() {
    if (!form.item_type || !form.description.trim()) return

    if (isEditing && editingItem) {
      const payload: UpdateLogisticsPayload & { id: string } = {
        id: editingItem.id,
        item_type: form.item_type as LogisticsItemType,
        description: form.description.trim(),
        scheduled_date: form.scheduled_date || null,
        responsible_name: form.responsible_name.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
        sent_to_client: form.sent_to_client,
      }
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Item de logistica atualizado')
          handleDialogChange(false)
        },
        onError: (err) => {
          toast.error(safeErrorMessage(err))
        },
      })
    } else {
      const payload: CreateLogisticsPayload = {
        job_id: jobId,
        item_type: form.item_type as LogisticsItemType,
        description: form.description.trim(),
        scheduled_date: form.scheduled_date || undefined,
        responsible_name: form.responsible_name.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Item de logistica adicionado')
          handleDialogChange(false)
        },
        onError: (err) => {
          toast.error(safeErrorMessage(err))
        },
      })
    }
  }

  // ---- Loading state ----

  if (isLoading) return <LogisticsSkeleton />

  // ---- Error state ----

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="size-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          Nao foi possivel carregar os itens de logistica.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Logistica do Cliente</h3>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              {items.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Adicionar item</span>
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <EmptyTabState
          icon={MapPin}
          title="Nenhum item de logistica"
          description="Adicione passagens, hospedagem, transfers e outros itens de logistica para este job."
          actionLabel="Adicionar item"
          onAction={handleOpenCreate}
        />
      )}

      {/* Desktop table */}
      {items.length > 0 && (
        <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-36">Tipo</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-36">Responsavel</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-16 text-center">Cliente</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => handleOpenEdit(item)}
                >
                  <TableCell>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {LOGISTICS_TYPE_LABELS[item.item_type]}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm max-w-[200px]">
                    <div className="flex items-start gap-1">
                      <span className="truncate">{item.description}</span>
                      {item.notes && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0 mt-0.5 size-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center cursor-default select-none">
                                i
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[240px] text-xs whitespace-pre-wrap"
                            >
                              {item.notes}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(item.scheduled_date)}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                    {item.responsible_name ?? '—'}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs whitespace-nowrap ${STATUS_BADGE_CLASS[item.status]}`}
                    >
                      {LOGISTICS_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    {item.sent_to_client ? (
                      <CheckCircle2 className="size-4 text-green-500 mx-auto" />
                    ) : (
                      <X className="size-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEdit(item)
                      }}
                      aria-label="Editar item"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile cards */}
      {items.length > 0 && (
        <div className="sm:hidden space-y-3">
          {items.map((item) => (
            <LogisticsCard key={item.id} item={item} onEdit={handleOpenEdit} />
          ))}
        </div>
      )}

      {/* Dialog */}
      <LogisticsDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        isEditing={isEditing}
        form={form}
        onChange={handleFormChange}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}
