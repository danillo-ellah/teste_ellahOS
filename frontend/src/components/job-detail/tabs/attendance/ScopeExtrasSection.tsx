'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { useScopeItems, useCreateScopeItem, useDecideScopeItem } from '@/hooks/useAttendance'
import { ApiRequestError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import {
  EXTRA_STATUS_LABELS,
  CHANNEL_LABELS,
} from '@/types/attendance'
import type {
  ScopeItem,
  ExtraStatus,
  CommunicationChannel,
} from '@/types/attendance'

interface ScopeExtrasSectionProps {
  jobId: string
}

// ============ Status badge ============

const STATUS_COLORS: Record<ExtraStatus, string> = {
  pendente_ceo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  aprovado_gratuito: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cobrar_aditivo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  recusado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  resolvido_atendimento: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

function ExtraStatusBadge({ status }: { status: ExtraStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {EXTRA_STATUS_LABELS[status]}
    </span>
  )
}

// ============ CEO Decision Dialog ============

interface CeoDecideDialogProps {
  item: ScopeItem
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CeoDecideDialog({ item, jobId, open, onOpenChange }: CeoDecideDialogProps) {
  const [decision, setDecision] = useState<ExtraStatus>('aprovado_gratuito')
  const [notes, setNotes] = useState('')
  const { mutateAsync: decide, isPending } = useDecideScopeItem(jobId)

  async function handleSubmit() {
    try {
      await decide({ id: item.id, extra_status: decision, ceo_notes: notes || undefined })
      toast.success('Decisao registrada')
      onOpenChange(false)
      setDecision('aprovado_gratuito')
      setNotes('')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao registrar decisao'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decisao do CEO</DialogTitle>
          <DialogDescription>
            Defina o que fazer com este item extra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">{item.description}</p>
            {item.origin_channel && (
              <p className="text-xs text-muted-foreground mt-1">
                Canal: {CHANNEL_LABELS[item.origin_channel]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Decisao *</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as ExtraStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado_gratuito">
                  {EXTRA_STATUS_LABELS.aprovado_gratuito}
                </SelectItem>
                <SelectItem value="cobrar_aditivo">
                  {EXTRA_STATUS_LABELS.cobrar_aditivo}
                </SelectItem>
                <SelectItem value="recusado">
                  {EXTRA_STATUS_LABELS.recusado}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ceo-notes">Observacoes do CEO</Label>
            <Textarea
              id="ceo-notes"
              rows={3}
              placeholder="Justificativa ou instrucoes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Confirmar decisao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Extra Item Card ============

interface ExtraItemCardProps {
  item: ScopeItem
  jobId: string
}

function ExtraItemCard({ item, jobId }: ExtraItemCardProps) {
  const [decideOpen, setDecideOpen] = useState(false)
  const isPendente = item.extra_status === 'pendente_ceo'

  return (
    <>
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-medium leading-snug">{item.description}</p>

              <div className="flex flex-wrap items-center gap-2">
                {item.extra_status && (
                  <ExtraStatusBadge status={item.extra_status} />
                )}
                {item.origin_channel && (
                  <Badge variant="secondary" className="text-xs">
                    {CHANNEL_LABELS[item.origin_channel]}
                  </Badge>
                )}
                {item.estimated_value != null && (
                  <span className="text-xs text-muted-foreground">
                    R$ {item.estimated_value.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {item.requested_at && (
                  <span>Solicitado em {formatDate(item.requested_at)}</span>
                )}
                {item.created_by_name && (
                  <span>por {item.created_by_name}</span>
                )}
              </div>

              {item.ceo_decision_at && (
                <div className="rounded-md bg-muted/50 p-2 space-y-0.5">
                  <p className="text-xs font-medium">Decisao CEO — {formatDate(item.ceo_decision_at)}</p>
                  {item.ceo_notes && (
                    <p className="text-xs text-muted-foreground">{item.ceo_notes}</p>
                  )}
                </div>
              )}
            </div>

            {isPendente && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDecideOpen(true)}>
                    Decidir (CEO)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      <CeoDecideDialog
        item={item}
        jobId={jobId}
        open={decideOpen}
        onOpenChange={setDecideOpen}
      />
    </>
  )
}

// ============ Add Scope Item Dialog ============

interface AddScopeItemDialogProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AddScopeItemDialog({ jobId, open, onOpenChange }: AddScopeItemDialogProps) {
  const [description, setDescription] = useState('')
  const [isExtra, setIsExtra] = useState(false)
  const [channel, setChannel] = useState<CommunicationChannel | ''>('')
  const [requestedAt, setRequestedAt] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')

  const { mutateAsync: create, isPending } = useCreateScopeItem()

  function resetForm() {
    setDescription('')
    setIsExtra(false)
    setChannel('')
    setRequestedAt('')
    setEstimatedValue('')
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm()
    onOpenChange(open)
  }

  async function handleSubmit() {
    if (!description.trim()) return

    try {
      await create({
        job_id: jobId,
        description: description.trim(),
        is_extra: isExtra,
        origin_channel: isExtra && channel ? channel : undefined,
        requested_at: isExtra && requestedAt ? requestedAt : undefined,
        estimated_value: isExtra && estimatedValue ? Number(estimatedValue) : undefined,
      })
      toast.success(isExtra ? 'Extra adicionado' : 'Item de escopo adicionado')
      handleOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao adicionar item'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo item de escopo</DialogTitle>
          <DialogDescription>
            Adicione um item ao escopo ou registre um extra solicitado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="scope-description">Descricao *</Label>
            <Textarea
              id="scope-description"
              rows={3}
              placeholder="Descreva o item de escopo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="scope-is-extra"
              checked={isExtra}
              onCheckedChange={setIsExtra}
            />
            <Label htmlFor="scope-is-extra" className="cursor-pointer">
              Este item e um extra (nao estava no escopo original)
            </Label>
          </div>

          {isExtra && (
            <>
              <div className="space-y-2">
                <Label>Canal de origem</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as CommunicationChannel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CHANNEL_LABELS) as [CommunicationChannel, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-requested-at">Data da solicitacao</Label>
                <Input
                  id="scope-requested-at"
                  type="date"
                  value={requestedAt}
                  onChange={(e) => setRequestedAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-estimated-value">Valor estimado (R$)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="scope-estimated-value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-9"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !description.trim()}>
            {isPending ? 'Salvando...' : 'Adicionar item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Main Component ============

export function ScopeExtrasSection({ jobId }: ScopeExtrasSectionProps) {
  const [addOpen, setAddOpen] = useState(false)
  const { data: items, isLoading, isError, refetch } = useScopeItems(jobId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar itens de escopo.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const allItems: ScopeItem[] = items?.data ?? []
  const scopeItems = allItems.filter((i) => !i.is_extra)
  const extraItems = allItems.filter((i) => i.is_extra)
  const isEmpty = allItems.length === 0

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Escopo e Extras</h3>
          {allItems.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {allItems.length}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Adicionar item
        </Button>
      </div>

      {isEmpty ? (
        <EmptyTabState
          icon={ClipboardList}
          title="Nenhum item de escopo"
          description="Adicione os itens do escopo original ou registre extras solicitados pelo cliente."
          actionLabel="Adicionar item"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="space-y-6 mt-4">
          {/* Escopo Original */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Itens do Escopo
              </p>
              <Badge variant="outline" className="text-xs">
                {scopeItems.length}
              </Badge>
            </div>

            {scopeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum item no escopo original.
              </p>
            ) : (
              <ul className="space-y-2">
                {scopeItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm py-2 px-3 rounded-md border border-border bg-background"
                  >
                    <span className="mt-0.5 size-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
                    <span className="leading-snug">{item.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Extras */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Extras
              </p>
              <Badge variant="outline" className="text-xs">
                {extraItems.length}
              </Badge>
              {extraItems.filter((i) => i.extra_status === 'pendente_ceo').length > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                  {extraItems.filter((i) => i.extra_status === 'pendente_ceo').length} aguardando CEO
                </Badge>
              )}
            </div>

            {extraItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum extra registrado.
              </p>
            ) : (
              <div className="space-y-3">
                {extraItems.map((item) => (
                  <ExtraItemCard key={item.id} item={item} jobId={jobId} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddScopeItemDialog jobId={jobId} open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
