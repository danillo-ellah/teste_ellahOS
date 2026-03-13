'use client'

import { useState } from 'react'
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, RotateCcw, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useCostItemHistory } from '@/hooks/useCostItemHistory'
import { useUpdateCostItem, useCreateCostItem } from '@/hooks/useCostItems'
import { formatRelativeDate, formatDate, formatCurrency } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import type { CostItemHistoryEntry, CostItemChange, CostItemHistoryAction } from '@/types/cost-item-history'
import type { CreateCostItemPayload } from '@/types/cost-management'

// ============ Constantes ============

// Campos que podem ser restaurados com seguranca (excluir metadados imutaveis)
const RESTORABLE_FIELDS = new Set([
  'service_description',
  'unit_value',
  'quantity',
  'total_value',
  'overtime_hours',
  'overtime_rate',
  'overtime_value',
  'total_with_overtime',
  'vendor_id',
  'vendor_name_snapshot',
  'vendor_email_snapshot',
  'vendor_pix_snapshot',
  'vendor_bank_snapshot',
  'item_status',
  'payment_status',
  'payment_date',
  'payment_due_date',
  'payment_condition',
  'actual_paid_value',
  'nf_request_status',
  'nf_number',
  'nf_drive_url',
  'nf_validation_ok',
  'payment_proof_url',
  'notes',
  'sort_order',
])

// Campos monetarios para formatacao
const CURRENCY_FIELDS = new Set([
  'unit_value',
  'total_value',
  'overtime_value',
  'total_with_overtime',
  'actual_paid_value',
  'overtime_rate',
  'amount',
  'budget_value',
])

// Campos de data para formatacao
const DATE_FIELDS = new Set([
  'payment_due_date',
  'payment_date',
  'nf_requested_at',
  'created_at',
  'updated_at',
  'deleted_at',
])

// Campos booleanos para formatacao
const BOOLEAN_FIELDS = new Set([
  'is_category_header',
  'nf_validation_ok',
])

// ============ Config por tipo de acao ============

const ACTION_CONFIG: Record<
  CostItemHistoryAction,
  { verb: string; avatarClass: string; dotClass: string }
> = {
  INSERT: {
    verb: 'criou',
    avatarClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  UPDATE: {
    verb: 'editou',
    avatarClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  DELETE: {
    verb: 'removeu',
    avatarClass: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
}

const ACTION_FILTERS: Array<{ value: CostItemHistoryAction | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'INSERT', label: 'Criacao' },
  { value: 'UPDATE', label: 'Edicao' },
  { value: 'DELETE', label: 'Exclusao' },
]

// ============ Props ============

interface CostItemHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

// ============ Helpers de data ============

function parseSafe(dateStr: string): Date | null {
  try {
    const parsed = parseISO(dateStr)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Retorna o label do grupo de data (ex: "Hoje", "Ontem", "10 de marco")
function getDayGroupLabel(dateStr: string): string {
  const parsed = parseSafe(dateStr)
  if (!parsed) return 'Data desconhecida'
  if (isToday(parsed)) return 'Hoje'
  if (isYesterday(parsed)) return 'Ontem'
  return format(parsed, "d 'de' MMMM", { locale: ptBR })
}

// Chave de agrupamento por dia (YYYY-MM-DD)
function getDayKey(dateStr: string): string {
  const parsed = parseSafe(dateStr)
  if (!parsed) return 'unknown'
  return format(parsed, 'yyyy-MM-dd')
}

// Hora formatada para exibicao
function formatHour(dateStr: string): string {
  const parsed = parseSafe(dateStr)
  if (!parsed) return ''
  return format(parsed, 'HH:mm')
}

// ============ Helpers de formatacao de valores ============

function formatFieldValue(field: string, value: unknown): string {
  if (value == null || value === '') return '-'

  if (CURRENCY_FIELDS.has(field) && typeof value === 'number') {
    return formatCurrency(value)
  }

  if (DATE_FIELDS.has(field) && typeof value === 'string') {
    return formatDate(value)
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return value ? 'Sim' : 'Nao'
  }

  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR')
  }

  return String(value)
}

// Extrai inicial do nome para o avatar
function getInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed[0].toUpperCase()
}

// Cor determinista para avatar baseada no nome
function getAvatarColor(name: string): string {
  const colors = [
    'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % colors.length
  }
  return colors[Math.abs(hash) % colors.length]
}

// ============ Agrupamento por dia ============

interface DayGroup {
  dayKey: string
  label: string
  entries: CostItemHistoryEntry[]
}

function groupByDay(entries: CostItemHistoryEntry[]): DayGroup[] {
  const groups: Map<string, DayGroup> = new Map()

  for (const entry of entries) {
    const key = getDayKey(entry.created_at)
    if (!groups.has(key)) {
      groups.set(key, {
        dayKey: key,
        label: getDayGroupLabel(entry.created_at),
        entries: [],
      })
    }
    groups.get(key)!.entries.push(entry)
  }

  return Array.from(groups.values())
}

// ============ Restaurar payload a partir dos changes ============

// Reconstroi o payload de "versao anterior" a partir dos changes de um UPDATE
function buildRestorePayload(changes: CostItemChange[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const change of changes) {
    if (RESTORABLE_FIELDS.has(change.field)) {
      payload[change.field] = change.old_value
    }
  }
  return payload
}

// Reconstroi o payload de criacao a partir dos changes de um DELETE
function buildRecreatePayload(changes: CostItemChange[], jobId: string): Partial<CreateCostItemPayload> & { job_id: string } {
  const payload: Record<string, unknown> = { job_id: jobId }
  for (const change of changes) {
    if (RESTORABLE_FIELDS.has(change.field)) {
      payload[change.field] = change.old_value
    }
  }
  return payload as Partial<CreateCostItemPayload> & { job_id: string }
}

// ============ Componente principal ============

export function CostItemHistorySheet({
  open,
  onOpenChange,
  jobId,
}: CostItemHistorySheetProps) {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<CostItemHistoryAction | 'all'>('all')

  // Estado do dialog de confirmacao de restore
  const [restoreDialog, setRestoreDialog] = useState<{
    entry: CostItemHistoryEntry
    mode: 'restore' | 'recreate'
  } | null>(null)

  const updateItem = useUpdateCostItem()
  const createItem = useCreateCostItem()

  function handleActionFilter(value: CostItemHistoryAction | 'all') {
    setActionFilter(value)
    setPage(1)
  }

  const { data: entries, meta, isLoading, isError, refetch } = useCostItemHistory(jobId, {
    page,
    perPage: 20,
    action: actionFilter === 'all' ? undefined : actionFilter,
  })

  const list = entries ?? []
  const groups = groupByDay(list)

  // Executa o restore de uma versao anterior
  async function handleConfirmRestore() {
    if (!restoreDialog) return
    const { entry, mode } = restoreDialog

    try {
      if (mode === 'restore') {
        // UPDATE: aplicar old_data sobre o item atual
        const payload = buildRestorePayload(entry.changes)
        if (Object.keys(payload).length === 0) {
          toast.error('Nenhum campo restauravel encontrado nesta versao')
          setRestoreDialog(null)
          return
        }
        await updateItem.mutateAsync({ id: entry.record_id, ...payload })
        const dateLabel = formatDate(entry.created_at)
        toast.success(`Item restaurado para a versao de ${dateLabel}`)
      } else {
        // DELETE: recriar o item com os dados anteriores
        const payload = buildRecreatePayload(entry.changes, jobId)
        await createItem.mutateAsync(payload as CreateCostItemPayload)
        toast.success('Item recriado com os dados anteriores')
      }
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setRestoreDialog(null)
    }
  }

  const isConfirming = updateItem.isPending || createItem.isPending

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0">
          {/* Cabecalho fixo */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-base font-semibold">Historico de Alteracoes</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {meta
                ? `${meta.total} ${meta.total === 1 ? 'registro' : 'registros'} — auditoria completa dos itens de custo`
                : 'Carregando...'}
            </SheetDescription>

            {/* Filtros de acao */}
            <div className="flex gap-1.5 pt-1 flex-wrap">
              {ACTION_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleActionFilter(value)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                    actionFilter === value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </SheetHeader>

          {/* Conteudo com scroll */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isLoading && <HistorySkeleton />}

            {isError && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-muted-foreground">Erro ao carregar historico.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isLoading && !isError && list.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma alteracao registrada ainda
                </p>
                <p className="text-xs text-muted-foreground">
                  As mudancas nos itens de custo aparecerao aqui automaticamente.
                </p>
              </div>
            )}

            {!isLoading && !isError && groups.length > 0 && (
              <div className="space-y-6">
                {groups.map((group) => (
                  <DaySection
                    key={group.dayKey}
                    group={group}
                    onRestore={(entry) => setRestoreDialog({ entry, mode: 'restore' })}
                    onRecreate={(entry) => setRestoreDialog({ entry, mode: 'recreate' })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Paginacao fixada no rodape */}
          {meta && meta.total_pages > 1 && (
            <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4 mr-1" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} de {meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Proxima
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de confirmacao de restore */}
      {restoreDialog && (
        <RestoreConfirmDialog
          entry={restoreDialog.entry}
          mode={restoreDialog.mode}
          isLoading={isConfirming}
          onConfirm={handleConfirmRestore}
          onCancel={() => setRestoreDialog(null)}
        />
      )}
    </>
  )
}

// ============ Secao de um dia ============

function DaySection({
  group,
  onRestore,
  onRecreate,
}: {
  group: DayGroup
  onRestore: (entry: CostItemHistoryEntry) => void
  onRecreate: (entry: CostItemHistoryEntry) => void
}) {
  return (
    <div>
      {/* Separador de data */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          {group.label}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Entradas do dia */}
      <div className="space-y-2">
        {group.entries.map((entry) => (
          <HistoryEntryCard
            key={entry.id}
            entry={entry}
            onRestore={onRestore}
            onRecreate={onRecreate}
          />
        ))}
      </div>
    </div>
  )
}

// ============ Card de uma entrada ============

function HistoryEntryCard({
  entry,
  onRestore,
  onRecreate,
}: {
  entry: CostItemHistoryEntry
  onRestore: (entry: CostItemHistoryEntry) => void
  onRecreate: (entry: CostItemHistoryEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const config = ACTION_CONFIG[entry.action]
  const avatarColor = getAvatarColor(entry.user_name || 'Sistema')
  const hasChanges = entry.changes && entry.changes.length > 0

  // Filtrar mudancas que tem diferenca visual real
  const visibleChanges = hasChanges
    ? entry.changes.filter((c) => {
        const old = formatFieldValue(c.field, c.old_value)
        const next = formatFieldValue(c.field, c.new_value)
        return old !== next
      })
    : []

  const changeCount = visibleChanges.length

  const showRestoreButton = entry.action === 'UPDATE' && changeCount > 0
  const showRecreateButton = entry.action === 'DELETE' && hasChanges

  // Icone de acao para o badge ao lado do avatar
  const ActionIcon =
    entry.action === 'INSERT' ? Plus : entry.action === 'UPDATE' ? Pencil : Trash2

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      {/* Cabecalho da entrada */}
      <div className="flex items-start gap-2.5">
        {/* Avatar com inicial do usuario */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`size-8 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor}`}>
            {getInitial(entry.user_name || 'S')}
          </div>
          {/* Indicador de acao no canto inferior direito do avatar */}
          <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background flex items-center justify-center ${config.dotClass}`}>
            <ActionIcon className="size-2 text-white" />
          </div>
        </div>

        {/* Texto principal */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{entry.user_name || 'Sistema'}</span>
            {' '}
            <span className="text-muted-foreground">{config.verb}</span>
            {' '}
            <span className="font-medium text-foreground">{entry.item_label}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatHour(entry.created_at)}
            {' · '}
            {formatRelativeDate(entry.created_at)}
          </p>
        </div>

        {/* Botao de restaurar (UPDATE) ou recriar (DELETE) */}
        {showRestoreButton && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => onRestore(entry)}
          >
            <RotateCcw className="size-3" />
            Restaurar
          </Button>
        )}
        {showRecreateButton && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => onRecreate(entry)}
          >
            <PlusCircle className="size-3" />
            Recriar
          </Button>
        )}
      </div>

      {/* Resumo inline dos campos (UPDATE com changes) */}
      {entry.action === 'UPDATE' && changeCount > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded
              ? <ChevronUp className="size-3.5" />
              : <ChevronDown className="size-3.5" />
            }
            {changeCount === 1
              ? '1 campo alterado'
              : `${changeCount} campos alterados`}
          </button>

          {expanded && (
            <div className="mt-2">
              <ChangesTable changes={visibleChanges} />
            </div>
          )}
        </div>
      )}

      {/* Dados de INSERT: resumo do item criado */}
      {entry.action === 'INSERT' && hasChanges && (
        <InsertSummary changes={entry.changes} />
      )}

      {/* Dados de DELETE: mostra o que foi removido (collapsible) */}
      {entry.action === 'DELETE' && hasChanges && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded
              ? <ChevronUp className="size-3.5" />
              : <ChevronDown className="size-3.5" />
            }
            Ver dados do item removido
          </button>

          {expanded && (
            <div className="mt-2">
              <DeletedDataTable changes={entry.changes} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Tabela de diff (antes / depois) para UPDATE ============

function ChangesTable({ changes }: { changes: CostItemChange[] }) {
  return (
    <div className="rounded-md overflow-hidden border border-border text-xs">
      {/* Cabecalho da tabela */}
      <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/50">
        <div className="px-2.5 py-1.5 font-semibold text-muted-foreground">Campo</div>
        <div className="px-2.5 py-1.5 font-semibold text-muted-foreground border-l border-border">Antes</div>
        <div className="px-2.5 py-1.5 font-semibold text-muted-foreground border-l border-border">Depois</div>
      </div>

      {/* Linhas */}
      {changes.map((change, i) => {
        const oldFormatted = formatFieldValue(change.field, change.old_value)
        const newFormatted = formatFieldValue(change.field, change.new_value)
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1fr] border-t border-border"
          >
            <div className="px-2.5 py-1.5 text-muted-foreground font-medium truncate">
              {change.label}
            </div>
            <div className="px-2.5 py-1.5 border-l border-border bg-red-50/60 dark:bg-red-950/20">
              <span className="text-red-700 dark:text-red-400 line-through">
                {oldFormatted}
              </span>
            </div>
            <div className="px-2.5 py-1.5 border-l border-border bg-emerald-50/60 dark:bg-emerald-950/20">
              <span className="text-emerald-700 dark:text-emerald-400">
                {newFormatted}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============ Resumo de INSERT ============

// Campos prioritarios para exibir no resumo de criacao
const INSERT_SUMMARY_FIELDS = ['service_description', 'unit_value', 'quantity', 'total_value', 'item_status', 'payment_condition']

function InsertSummary({ changes }: { changes: CostItemChange[] }) {
  const summaryChanges = changes.filter((c) => INSERT_SUMMARY_FIELDS.includes(c.field))
  if (summaryChanges.length === 0) return null

  return (
    <div className="rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10 px-2.5 py-2 space-y-1">
      {summaryChanges.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-medium">{c.label}</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-right truncate max-w-[55%]">
            {formatFieldValue(c.field, c.new_value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============ Dados do item deletado ============

function DeletedDataTable({ changes }: { changes: CostItemChange[] }) {
  const visibleChanges = changes.filter((c) => {
    const val = formatFieldValue(c.field, c.old_value)
    return val !== '-'
  })

  if (visibleChanges.length === 0) return null

  return (
    <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10 px-2.5 py-2 space-y-1">
      {visibleChanges.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-medium">{c.label}</span>
          <span className="text-red-700 dark:text-red-400 font-medium text-right truncate max-w-[55%]">
            {formatFieldValue(c.field, c.old_value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============ Dialog de confirmacao de restore / recriar ============

function RestoreConfirmDialog({
  entry,
  mode,
  isLoading,
  onConfirm,
  onCancel,
}: {
  entry: CostItemHistoryEntry
  mode: 'restore' | 'recreate'
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dateLabel = formatDate(entry.created_at)
  const isRestore = mode === 'restore'

  // Campos que efetivamente serao restaurados (so os RESTORABLE com diferenca)
  const previewChanges = isRestore
    ? entry.changes.filter((c) => RESTORABLE_FIELDS.has(c.field) && c.old_value !== c.new_value)
    : entry.changes.filter((c) => RESTORABLE_FIELDS.has(c.field) && c.old_value != null)

  return (
    <AlertDialog open onOpenChange={(v) => { if (!v) onCancel() }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRestore ? `Restaurar versao de ${dateLabel}?` : 'Recriar item removido?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isRestore
                  ? `Os valores atuais de "${entry.item_label}" serao substituidos pelos valores anteriores listados abaixo.`
                  : `O item "${entry.item_label}" sera recriado com os dados que existiam antes da remocao.`
                }
              </p>

              {/* Preview das mudancas */}
              {previewChanges.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden text-xs">
                  <div className="grid grid-cols-[1fr_1fr] bg-muted/50">
                    <div className="px-2.5 py-1.5 font-semibold text-muted-foreground">Campo</div>
                    <div className="px-2.5 py-1.5 font-semibold text-muted-foreground border-l border-border">
                      {isRestore ? 'Valor que sera restaurado' : 'Valor'}
                    </div>
                  </div>
                  {previewChanges.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr] border-t border-border">
                      <div className="px-2.5 py-1.5 text-muted-foreground font-medium truncate">
                        {c.label}
                      </div>
                      <div className="px-2.5 py-1.5 border-l border-border">
                        <span className="text-foreground font-medium">
                          {formatFieldValue(c.field, isRestore ? c.old_value : c.old_value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={onConfirm}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isLoading
              ? 'Aguarde...'
              : isRestore
                ? 'Restaurar versao'
                : 'Recriar item'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============ Skeleton de carregamento ============

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Simulando 2 grupos de dia */}
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <Skeleton className="h-3 w-12" />
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: g === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
                {i % 2 === 0 && <Skeleton className="h-3 w-1/3" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
