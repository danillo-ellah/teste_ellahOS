'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { usePendingExtras, useDecideScopeItem } from '@/hooks/useAttendance'
import { ApiRequestError } from '@/lib/api'
import { CHANNEL_LABELS } from '@/types/attendance'
import type { PendingExtra, ExtraStatus } from '@/types/attendance'

// ============ Tipos internos ============

type DecideAction = 'aprovado_gratuito' | 'cobrar_aditivo' | 'recusado'

interface PendingDecision {
  item: PendingExtra
  action: DecideAction
}

// ============ Helpers de cor dos dias pendentes ============

function daysPendingClass(days: number): string {
  if (days > 3) return 'text-red-600 dark:text-red-400 font-semibold'
  if (days > 1) return 'text-amber-600 dark:text-amber-400 font-medium'
  return 'text-muted-foreground'
}

function daysPendingLabel(days: number): string {
  if (days === 0) return 'Hoje'
  if (days === 1) return '1 dia'
  return `${days} dias`
}

// ============ Dialog de decisao inline ============

interface DecideDialogProps {
  pending: PendingDecision | null
  onClose: () => void
}

const ACTION_LABELS: Record<DecideAction, string> = {
  aprovado_gratuito: 'Aprovar (gratuito)',
  cobrar_aditivo: 'Cobrar aditivo',
  recusado: 'Recusar',
}

const ACTION_CONFIRM_LABELS: Record<DecideAction, string> = {
  aprovado_gratuito: 'Confirmar aprovacao',
  cobrar_aditivo: 'Confirmar cobranca',
  recusado: 'Confirmar recusa',
}

function DecideDialog({ pending, onClose }: DecideDialogProps) {
  return pending ? (
    <DecideDialogInner pending={pending} onClose={onClose} />
  ) : null
}

// Componente interno separado para poder instanciar useDecideScopeItem com o jobId correto
function DecideDialogInner({
  pending,
  onClose,
}: {
  pending: PendingDecision
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  const { mutateAsync: decide, isPending } = useDecideScopeItem(pending.item.job_id)

  async function handleConfirm() {
    try {
      await decide({
        id: pending.item.id,
        extra_status: pending.action as ExtraStatus,
        ceo_notes: notes.trim() || undefined,
      })
      toast.success('Decisao registrada com sucesso')
      onClose()
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao registrar decisao'
      toast.error(msg)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ACTION_LABELS[pending.action]}</DialogTitle>
          <DialogDescription>
            Revise o extra antes de confirmar a decisao.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Resumo do item */}
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-mono text-muted-foreground">
              {pending.item.job_code} — {pending.item.job_title}
            </p>
            <p className="text-sm font-medium">{pending.item.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {pending.item.estimated_value != null && (
                <span>Valor est.: {formatCurrency(pending.item.estimated_value)}</span>
              )}
              {pending.item.origin_channel && (
                <span>Canal: {CHANNEL_LABELS[pending.item.origin_channel]}</span>
              )}
              <span className={cn(daysPendingClass(pending.item.days_pending))}>
                Pendente ha {daysPendingLabel(pending.item.days_pending)}
              </span>
            </div>
          </div>

          {/* Observacoes do CEO */}
          <div className="space-y-2">
            <Label htmlFor="decide-notes">Observacoes (opcional)</Label>
            <Textarea
              id="decide-notes"
              rows={3}
              placeholder="Justificativa ou instrucoes para a equipe..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className={cn(
              pending.action === 'aprovado_gratuito' &&
                'bg-green-600 hover:bg-green-700 text-white',
              pending.action === 'cobrar_aditivo' &&
                'bg-blue-600 hover:bg-blue-700 text-white',
              pending.action === 'recusado' &&
                'bg-red-600 hover:bg-red-700 text-white',
            )}
          >
            {isPending ? 'Salvando...' : ACTION_CONFIRM_LABELS[pending.action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Componente de acoes por linha ============
// Separado para instanciar useDecideScopeItem com o jobId correto de cada item

interface RowActionsProps {
  item: PendingExtra
  onDecide: (item: PendingExtra, action: DecideAction) => void
}

function RowActions({ item, onDecide }: RowActionsProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
        onClick={() => onDecide(item, 'aprovado_gratuito')}
      >
        Aprovar
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
        onClick={() => onDecide(item, 'cobrar_aditivo')}
      >
        Cobrar
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        onClick={() => onDecide(item, 'recusado')}
      >
        Recusar
      </Button>
    </div>
  )
}

// ============ Linha da tabela (desktop) ============

interface TableRowItemProps {
  item: PendingExtra
  onDecide: (item: PendingExtra, action: DecideAction) => void
}

function TableRowItem({ item, onDecide }: TableRowItemProps) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Job */}
      <td className="py-3 px-4 align-top">
        <span className="font-mono text-[11px] text-muted-foreground block">
          {item.job_code}
        </span>
        <span className="text-[13px] font-medium leading-snug line-clamp-1">
          {item.job_title}
        </span>
      </td>

      {/* Descricao */}
      <td className="py-3 px-4 align-top max-w-[220px]">
        <span className="text-[13px] leading-snug line-clamp-2">{item.description}</span>
      </td>

      {/* Valor estimado */}
      <td className="py-3 px-4 align-top whitespace-nowrap">
        <span className="text-[13px] text-muted-foreground">
          {item.estimated_value != null ? formatCurrency(item.estimated_value) : '—'}
        </span>
      </td>

      {/* Dias pendente */}
      <td className="py-3 px-4 align-top whitespace-nowrap">
        <span className={cn('text-[13px]', daysPendingClass(item.days_pending))}>
          {daysPendingLabel(item.days_pending)}
        </span>
      </td>

      {/* Canal */}
      <td className="py-3 px-4 align-top whitespace-nowrap">
        <span className="text-[13px] text-muted-foreground">
          {item.origin_channel ? CHANNEL_LABELS[item.origin_channel] : '—'}
        </span>
      </td>

      {/* Acoes */}
      <td className="py-3 px-4 align-top">
        <RowActions item={item} onDecide={onDecide} />
      </td>
    </tr>
  )
}

// ============ Card mobile por item ============

interface MobileCardItemProps {
  item: PendingExtra
  onDecide: (item: PendingExtra, action: DecideAction) => void
}

function MobileCardItem({ item, onDecide }: MobileCardItemProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {/* Job + dias */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-[11px] text-muted-foreground block">{item.job_code}</span>
          <span className="text-[13px] font-medium line-clamp-1">{item.job_title}</span>
        </div>
        <span className={cn('text-xs shrink-0', daysPendingClass(item.days_pending))}>
          {daysPendingLabel(item.days_pending)}
        </span>
      </div>

      {/* Descricao */}
      <p className="text-[13px] leading-snug text-foreground">{item.description}</p>

      {/* Metadados */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {item.estimated_value != null && (
          <span>{formatCurrency(item.estimated_value)}</span>
        )}
        {item.origin_channel && (
          <span>{CHANNEL_LABELS[item.origin_channel]}</span>
        )}
      </div>

      {/* Acoes */}
      <RowActions item={item} onDecide={onDecide} />
    </div>
  )
}

// ============ Componente principal ============

export function CeoPendingExtras() {
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
  const { data: response, isLoading } = usePendingExtras()

  // Nao renderiza nada enquanto carrega ou se nao ha itens
  if (isLoading) return null

  const items: PendingExtra[] = response?.data ?? []
  if (items.length === 0) return null

  // Ordenar por days_pending DESC (mais urgente primeiro)
  const sorted = [...items].sort((a, b) => b.days_pending - a.days_pending)

  function handleDecide(item: PendingExtra, action: DecideAction) {
    setPendingDecision({ item, action })
  }

  function handleCloseDialog() {
    setPendingDecision(null)
  }

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-800/60 shadow-sm">
        {/* Header */}
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-[18px] text-amber-500 shrink-0" />
            <CardTitle className="text-base font-semibold text-foreground">
              Extras Aguardando Decisao
            </CardTitle>
            <span className="ml-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 text-xs font-bold">
              {sorted.length}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-3 px-5 pb-4">
          {/* Tabela — visivel apenas em md+ */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Job
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Descricao do extra
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Valor est.
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Pendente ha
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Canal
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <TableRowItem key={item.id} item={item} onDecide={handleDecide} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — visivel apenas em mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {sorted.map((item) => (
              <MobileCardItem key={item.id} item={item} onDecide={handleDecide} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmacao de decisao */}
      <DecideDialog pending={pendingDecision} onClose={handleCloseDialog} />
    </>
  )
}
