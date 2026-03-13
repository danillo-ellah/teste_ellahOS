'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  CheckCircle2,
  FileText,
  FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { safeErrorMessage } from '@/lib/api'
import { useCostCategories } from '@/hooks/useCostCategories'
import {
  useOpportunityBudgetVersions,
  useCreateBudgetVersion,
  useUpdateBudgetVersion,
  useActivateBudgetVersion,
  type OpportunityBudgetVersion,
} from '@/hooks/useCrmBudget'
import type { OpportunityStage } from '@/hooks/useCrm'
import { generateOpportunityBudgetPdf } from '@/lib/pdf/opportunity-budget-pdf'
import { BudgetVersionHistory } from './BudgetVersionHistory'

// ---------------------------------------------------------------------------
// Stages que habilitam o editor de orcamento
// ---------------------------------------------------------------------------

const EDITOR_STAGES: OpportunityStage[] = ['proposta', 'negociacao', 'fechamento']
const READONLY_STAGES: OpportunityStage[] = ['ganho', 'perdido', 'pausado']

// ---------------------------------------------------------------------------
// Configuracao visual de status de versao
// ---------------------------------------------------------------------------

const VERSION_STATUS_CONFIG: Record<
  OpportunityBudgetVersion['status'],
  { label: string; className: string }
> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  ativa: {
    label: 'Ativa',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  historico: {
    label: 'Historico',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpportunityBudgetSectionProps {
  opportunity: {
    id: string
    stage: OpportunityStage
    orc_code?: string | null
    project_type?: string | null
    title?: string
    clients?: { name: string } | null
    agencies?: { name: string } | null
  }
  onBudgetSaved?: () => void
}

// ---------------------------------------------------------------------------
// Linha editavel de item de orcamento
// ---------------------------------------------------------------------------

interface BudgetRowProps {
  itemNumber: number
  displayName: string
  value: number
  notes: string
  readonly: boolean
  onChange: (value: number, notes: string) => void
}

function BudgetRow({ itemNumber, displayName, value, notes, readonly, onChange }: BudgetRowProps) {
  // Formata o valor para exibicao no input (sem simbolo, virgula decimal)
  const [rawValue, setRawValue] = useState(value > 0 ? String(value) : '')

  // Sincroniza quando versao muda externamente
  useEffect(() => {
    setRawValue(value > 0 ? String(value) : '')
  }, [value])

  function handleValueBlur() {
    const parsed = parseFloat(rawValue.replace(',', '.'))
    onChange(isNaN(parsed) ? 0 : parsed, notes)
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(value, e.target.value)
  }

  return (
    <div className="grid grid-cols-[1.5rem_1fr_36%_28%] gap-2 items-start py-1.5">
      {/* Numero do item */}
      <span className="text-xs text-muted-foreground tabular-nums pt-2 text-right select-none">
        {itemNumber}
      </span>

      {/* Nome da categoria */}
      <span className="text-sm pt-2 truncate" title={displayName}>
        {displayName}
      </span>

      {/* Valor */}
      {readonly ? (
        <span
          className={cn(
            'text-sm text-right pt-2 tabular-nums',
            value > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}
        >
          {value > 0
            ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—'}
        </span>
      ) : (
        <Input
          type="number"
          min={0}
          step={0.01}
          className="h-8 text-sm text-right tabular-nums"
          placeholder="0,00"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          onBlur={handleValueBlur}
          aria-label={`Valor ${displayName}`}
        />
      )}

      {/* Notas */}
      {readonly ? (
        <span className="text-xs text-muted-foreground pt-2 truncate" title={notes}>
          {notes || '—'}
        </span>
      ) : (
        <Input
          className="h-8 text-xs"
          placeholder="Obs..."
          value={notes}
          onChange={handleNotesChange}
          aria-label={`Notas ${displayName}`}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function OpportunityBudgetSection({
  opportunity,
  onBudgetSaved,
}: OpportunityBudgetSectionProps) {
  const stage = opportunity.stage as OpportunityStage

  // Nao renderiza para lead/qualificado
  if (stage === 'lead' || stage === 'qualificado') return null

  const isReadonly = READONLY_STAGES.includes(stage)
  const isEditable = EDITOR_STAGES.includes(stage)

  return (
    <BudgetSectionInner
      opportunity={opportunity}
      isReadonly={isReadonly}
      isEditable={isEditable}
      onBudgetSaved={onBudgetSaved}
    />
  )
}

// ---------------------------------------------------------------------------
// Inner — separado para manter hooks sempre na mesma ordem
// ---------------------------------------------------------------------------

interface BudgetSectionInnerProps {
  opportunity: {
    id: string
    stage: OpportunityStage
    orc_code?: string | null
    project_type?: string | null
    title?: string
    clients?: { name: string } | null
    agencies?: { name: string } | null
  }
  isReadonly: boolean
  isEditable: boolean
  onBudgetSaved?: () => void
}

function BudgetSectionInner({
  opportunity,
  isReadonly,
  isEditable,
  onBudgetSaved,
}: BudgetSectionInnerProps) {
  const [open, setOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  // Estado local de edicao: mapa itemNumber → { value, notes }
  const [editState, setEditState] = useState<
    Record<number, { value: number; notes: string }>
  >({})
  const [versionNotes, setVersionNotes] = useState('')

  // Hooks de dados
  const { data: versions, isLoading: loadingVersions } = useOpportunityBudgetVersions(
    opportunity.id,
  )

  // Categorias do tenant para preencher as linhas
  const productionType = opportunity.project_type ?? 'all'
  const { data: categories, isLoading: loadingCategories } = useCostCategories(productionType)

  // Mutations
  const createMutation = useCreateBudgetVersion(opportunity.id)
  const activateMutation = useActivateBudgetVersion(opportunity.id)

  // Versao correntemente selecionada
  const selectedVersion = useMemo(() => {
    if (!versions) return null
    if (selectedVersionId) return versions.find((v) => v.id === selectedVersionId) ?? null
    // Padrao: versao ativa, ou primeiro rascunho, ou a mais recente
    return (
      versions.find((v) => v.status === 'ativa') ??
      versions.find((v) => v.status === 'rascunho') ??
      versions[0] ??
      null
    )
  }, [versions, selectedVersionId])

  const updateMutation = useUpdateBudgetVersion(
    opportunity.id,
    selectedVersion?.id ?? '',
  )

  // Inicializa estado de edicao quando versao muda
  useEffect(() => {
    if (!selectedVersion?.items) {
      setEditState({})
      setVersionNotes(selectedVersion?.notes ?? '')
      return
    }
    const initial: Record<number, { value: number; notes: string }> = {}
    for (const item of selectedVersion.items) {
      initial[item.item_number] = { value: item.value, notes: item.notes ?? '' }
    }
    setEditState(initial)
    setVersionNotes(selectedVersion.notes ?? '')
  }, [selectedVersion?.id, selectedVersion?.items, selectedVersion?.notes])

  // Total calculado em tempo real a partir do estado local
  const totalValue = useMemo(() => {
    return Object.values(editState).reduce((acc, row) => acc + (row.value ?? 0), 0)
  }, [editState])

  // Categorias mescladas com estado de edicao
  const rows = useMemo(() => {
    if (!categories) return []
    return categories.map((cat) => ({
      itemNumber: cat.item_number,
      displayName: cat.display_name,
      value: editState[cat.item_number]?.value ?? 0,
      notes: editState[cat.item_number]?.notes ?? '',
    }))
  }, [categories, editState])

  function handleRowChange(itemNumber: number, value: number, notes: string) {
    setEditState((prev) => ({ ...prev, [itemNumber]: { value, notes } }))
  }

  // Monta payload de items a partir do estado atual
  function buildItemsPayload() {
    if (!categories) return []
    return categories.map((cat) => ({
      item_number: cat.item_number,
      display_name: cat.display_name,
      value: editState[cat.item_number]?.value ?? 0,
      notes: editState[cat.item_number]?.notes?.trim() || null,
    }))
  }

  async function handleSave() {
    try {
      if (!selectedVersion || selectedVersion.status !== 'rascunho') {
        // Cria nova versao rascunho com os itens atuais
        await createMutation.mutateAsync({
          items: buildItemsPayload(),
          notes: versionNotes.trim() || null,
        })
        toast.success('Rascunho de orcamento criado')
      } else {
        // Atualiza versao rascunho existente
        await updateMutation.mutateAsync({
          items: buildItemsPayload(),
          notes: versionNotes.trim() || null,
        })
        toast.success('Orcamento salvo')
      }
      onBudgetSaved?.()
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleNewVersion() {
    try {
      await createMutation.mutateAsync({
        copy_from_active: true,
        notes: null,
      })
      toast.success('Nova versao criada a partir da versao ativa')
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleActivate() {
    if (!selectedVersion) return
    try {
      await activateMutation.mutateAsync(selectedVersion.id)
      toast.success('Versao ativada. Versoes anteriores movidas para historico.')
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  const isLoading = loadingVersions || loadingCategories
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isActivating = activateMutation.isPending

  const activeVersion = versions?.find((v) => v.status === 'ativa')
  const draftVersion = versions?.find((v) => v.status === 'rascunho')
  const hasVersions = versions && versions.length > 0

  // Exporta PDF da versao ativa
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  async function handleExportPdf() {
    if (!activeVersion?.items) return
    setIsExportingPdf(true)
    try {
      await generateOpportunityBudgetPdf({
        opportunityTitle: opportunity.title ?? 'Sem titulo',
        clientName: opportunity.clients?.name ?? null,
        agencyName: opportunity.agencies?.name ?? null,
        orcCode: opportunity.orc_code ?? activeVersion.orc_code ?? null,
        version: activeVersion.version,
        versionDate: activeVersion.updated_at,
        items: activeVersion.items.map((i) => ({
          item_number: i.item_number,
          display_name: i.display_name,
          value: i.value,
          notes: i.notes,
        })),
        totalValue: activeVersion.total_value,
      })
    } catch {
      toast.error('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Header colapsavel */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 min-h-[44px]"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">Orcamento</span>

            {/* Badge ORC code */}
            {opportunity.orc_code && (
              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                {opportunity.orc_code}
              </Badge>
            )}

            {/* Badge status da versao ativa/rascunho */}
            {activeVersion && (
              <Badge
                className={cn(
                  'text-xs px-1.5 py-0',
                  VERSION_STATUS_CONFIG.ativa.className,
                )}
              >
                {formatCurrency(activeVersion.total_value)}
              </Badge>
            )}
            {draftVersion && !activeVersion && (
              <Badge
                className={cn(
                  'text-xs px-1.5 py-0',
                  VERSION_STATUS_CONFIG.rascunho.className,
                )}
              >
                Rascunho — {formatCurrency(draftVersion.total_value)}
              </Badge>
            )}

            {/* Indicador readonly */}
            {isReadonly && (
              <span className="text-xs text-muted-foreground">(somente leitura)</span>
            )}
          </div>

          {open ? (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </CollapsibleTrigger>

      {/* Conteudo */}
      <CollapsibleContent>
        <div className="rounded-b-lg border border-t-0 bg-card px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando...
            </div>
          ) : (
            <>
              {/* Seletor de versao atual */}
              {hasVersions && selectedVersion && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Versao:</span>
                  <Badge
                    className={cn(
                      'text-xs px-2 py-0.5',
                      VERSION_STATUS_CONFIG[selectedVersion.status].className,
                    )}
                  >
                    v{selectedVersion.version} — {VERSION_STATUS_CONFIG[selectedVersion.status].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(selectedVersion.updated_at)}
                  </span>
                </div>
              )}

              {/* Grid de itens */}
              {categories && categories.length > 0 ? (
                <div>
                  {/* Header da tabela */}
                  <div className="grid grid-cols-[1.5rem_1fr_36%_28%] gap-2 pb-1 border-b">
                    <span className="text-xs font-medium text-muted-foreground text-right select-none">#</span>
                    <span className="text-xs font-medium text-muted-foreground">Categoria</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Valor (R$)</span>
                    <span className="text-xs font-medium text-muted-foreground">Notas</span>
                  </div>

                  {/* Linhas de itens */}
                  <div className="divide-y divide-border/50">
                    {rows.map((row) => (
                      <BudgetRow
                        key={row.itemNumber}
                        itemNumber={row.itemNumber}
                        displayName={row.displayName}
                        value={row.value}
                        notes={row.notes}
                        readonly={isReadonly || selectedVersion?.status === 'ativa'}
                        onChange={(value, notes) =>
                          handleRowChange(row.itemNumber, value, notes)
                        }
                      />
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t mt-1">
                    <span className="text-sm font-medium text-muted-foreground">Total:</span>
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma categoria de custo configurada para este tipo de producao.
                </p>
              )}

              {/* Campo de notas da versao */}
              {!isReadonly && selectedVersion?.status !== 'ativa' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Notas desta versao (opcional)
                  </label>
                  <Textarea
                    rows={2}
                    className="text-xs resize-none"
                    placeholder="Ex: Inclui locacao externa, diretor Fulano..."
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    aria-label="Notas da versao do orcamento"
                  />
                </div>
              )}

              {/* Exportar PDF — disponivel quando ha versao ativa (readonly ou editor) */}
              {activeVersion && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    title="Exportar versao ativa como PDF"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileDown className="size-3.5" />
                    )}
                    Exportar PDF
                  </Button>
                </div>
              )}

              {/* Acoes do editor */}
              {isEditable && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Salvar — disponivel para rascunho ou quando nao ha versao */}
                  {(!selectedVersion || selectedVersion.status === 'rascunho') && (
                    <Button
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={handleSave}
                      disabled={isSaving || categories?.length === 0}
                    >
                      {isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      Salvar
                    </Button>
                  )}

                  {/* Ativar — disponivel quando versao selecionada e rascunho */}
                  {selectedVersion?.status === 'rascunho' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
                      onClick={handleActivate}
                      disabled={isActivating}
                    >
                      {isActivating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Ativar
                    </Button>
                  )}

                  {/* Nova versao — disponivel quando ha versao ativa */}
                  {activeVersion && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5"
                      onClick={handleNewVersion}
                      disabled={createMutation.isPending || !!draftVersion}
                      title={draftVersion ? 'Ja existe um rascunho em aberto' : undefined}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Nova Versao
                    </Button>
                  )}

                  {/* Criar primeira versao quando nao ha nenhuma */}
                  {!hasVersions && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5"
                      onClick={handleSave}
                      disabled={isSaving || categories?.length === 0}
                    >
                      {isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Criar Orcamento
                    </Button>
                  )}
                </div>
              )}

              {/* Historico de versoes */}
              {hasVersions && versions.length > 1 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Historico de versoes
                    </p>
                    <BudgetVersionHistory
                      versions={versions}
                      currentVersionId={selectedVersion?.id}
                      onSelectVersion={(v) => setSelectedVersionId(v.id)}
                      readonly={isReadonly}
                    />
                  </div>
                </>
              )}

              {/* Exibe a unica versao no historico quando e readonly e ha uma versao */}
              {isReadonly && hasVersions && versions.length === 1 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Versoes
                    </p>
                    <BudgetVersionHistory
                      versions={versions}
                      currentVersionId={selectedVersion?.id}
                      readonly={true}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
