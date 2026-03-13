'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { JobFinancialTabs } from '../_components/JobFinancialTabs'
import { CostItemsTable } from './_components/CostItemsTable'
import { CostItemDrawer } from './_components/CostItemDrawer'
import { PaymentDialog } from './_components/PaymentDialog'
import { ApplyTemplateDialog } from './_components/ApplyTemplateDialog'
import { ImportFromJobDialog } from './_components/ImportFromJobDialog'
import { EmptyStateWithActions } from './_components/EmptyStateWithActions'
import { CostItemsTotals } from './_components/CostItemsTotals'
import { CostItemHistorySheet } from './_components/CostItemHistorySheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileDown, History, ChevronDown, Loader2 } from 'lucide-react'
import { useCostItems, useUpdateCostItem } from '@/hooks/useCostItems'
import { useJob } from '@/hooks/useJob'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/format'
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  PAYMENT_CONDITION_LABELS,
  PAYMENT_CONDITION_COLORS,
  type CostItem,
  type CostItemFilters,
  type ItemStatus,
  type PaymentStatus,
  type PaymentCondition,
} from '@/types/cost-management'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function JobCostsPage({ params }: PageProps) {
  const { id: jobId } = use(params)

  // Filtros
  const [filters, setFilters] = useState<CostItemFilters>({
    job_id: jobId,
    page: 1,
    per_page: 200,
  })
  const [search, setSearch] = useState('')

  // Aplicar debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: search.trim() || undefined, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Drawer de criar/editar
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)

  // Dialog de pagamento
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentItemIds, setPaymentItemIds] = useState<string[]>([])

  // Dialog de template
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // Dialog de import from job
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Sheet de historico de alteracoes
  const [historySheetOpen, setHistorySheetOpen] = useState(false)

  // Selecao em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: costItems, meta, isLoading, isError } = useCostItems(filters)
  const { mutateAsync: updateItem } = useUpdateCostItem()
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  // Busca dados do job para extrair a data base de calculo de vencimento
  const { data: job } = useJob(jobId)
  // Data base: kickoff_ppm_date tem prioridade, fallback para briefing_date
  const jobStartDate: string | null = job?.kickoff_ppm_date ?? job?.briefing_date ?? null

  const items = costItems ?? []

  // Total com HE para exibicao no rodape
  const totalWithOvertime = items.reduce(
    (sum, item) => (item.is_category_header ? sum : sum + item.total_with_overtime),
    0,
  )

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleEdit(item: CostItem) {
    setEditingItem(item)
    setDrawerOpen(true)
  }

  function handleAddNew() {
    setEditingItem(null)
    setDrawerOpen(true)
  }

  function handlePayItem(item: CostItem) {
    setPaymentItemIds([item.id])
    setPaymentOpen(true)
  }

  function handlePaySelected() {
    setPaymentItemIds(Array.from(selectedIds))
    setPaymentOpen(true)
  }

  function handlePaymentSuccess() {
    setSelectedIds(new Set())
    setPaymentItemIds([])
  }

  async function handleBulkUpdate(field: string, value: string | null) {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setIsBulkUpdating(true)
    try {
      await Promise.all(ids.map(id => updateItem({ id, [field]: value })))
      toast.success(`${ids.length} item(s) atualizado(s)`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Erro ao atualizar itens em lote')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const handleExportPdf = useCallback(async () => {
    if (!items.length || !job) {
      toast.error('Nenhum item de custo para exportar')
      return
    }
    setIsExportingPdf(true)
    try {
      const { generateBudgetPdf } = await import('@/lib/pdf/budget-pdf')
      await generateBudgetPdf({ job, costItems: items })
      toast.success('PDF exportado')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }, [items, job])

  const handleExport = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sessao expirada. Faca login novamente.')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cost-items/export/${jobId}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        toast.error('Erro ao exportar CSV')
        return
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `custos_${jobId}.csv`
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar CSV')
    }
  }, [jobId])

  return (
    <div className="space-y-4 pb-24">
      <JobFinancialTabs jobId={jobId} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Custos do Job</h2>
          {meta && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.total} itens &nbsp;|&nbsp; Orcado:{' '}
              <span className="font-medium">{formatCurrency(meta.total_budgeted ?? 0)}</span>
              &nbsp;|&nbsp; Pago:{' '}
              <span className="font-medium text-green-700">
                {formatCurrency(meta.total_paid ?? 0)}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
            <FileDown className="size-4 mr-1.5" />
            {isExportingPdf ? 'Gerando...' : 'Exportar PDF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistorySheetOpen(true)}>
            <History className="size-4 mr-1.5" />
            Historico
          </Button>
          <Button size="sm" onClick={handleAddNew}>
            Adicionar Item
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar descricao ou fornecedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={filters.item_status ?? 'all'}
          onValueChange={v =>
            setFilters(prev => ({
              ...prev,
              item_status: v === 'all' ? undefined : (v as ItemStatus),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status do item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.payment_status ?? 'all'}
          onValueChange={v =>
            setFilters(prev => ({
              ...prev,
              payment_status: v === 'all' ? undefined : (v as PaymentStatus),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selecao em lote + bulk edit */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-md bg-muted px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} item(s)
          </span>

          {/* Bulk: Alterar Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isBulkUpdating}>
                {isBulkUpdating ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : null}
                Alterar Status
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[170px]">
              {(Object.entries(ITEM_STATUS_LABELS) as [ItemStatus, string][]).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleBulkUpdate('item_status', key)}
                  className="text-xs gap-2"
                >
                  <span className={`inline-block size-2 rounded-full shrink-0 ${ITEM_STATUS_COLORS[key]?.replace(/text-\S+/g, '')}`} />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bulk: Alterar Cond. Pgto */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isBulkUpdating}>
                Cond. Pgto
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[170px]">
              {(Object.entries(PAYMENT_CONDITION_LABELS) as [PaymentCondition, string][]).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleBulkUpdate('payment_condition', key)}
                  className="text-xs gap-2"
                >
                  <span className={`inline-block size-2 rounded-full shrink-0 ${PAYMENT_CONDITION_COLORS[key]?.replace(/text-\S+/g, '')}`} />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={handlePaySelected} disabled={isBulkUpdating}>
            Pagar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBulkUpdating}
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Erro de carregamento */}
      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar itens de custo. Tente recarregar a pagina.
        </div>
      )}

      {/* Empty state — distinguir "sem itens" de "filtro sem resultados" */}
      {!isLoading && items.length === 0 && !isError && (() => {
        const hasActiveFilters = !!(filters.item_status || filters.payment_status || filters.search)
        if (hasActiveFilters) {
          return (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum item encontrado para os filtros selecionados.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFilters({ job_id: jobId, page: 1, per_page: 200 })
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )
        }
        return (
          <EmptyStateWithActions
            onApplyTemplate={() => setTemplateDialogOpen(true)}
            onImportFromJob={() => setImportDialogOpen(true)}
            onAddNew={handleAddNew}
          />
        )
      })()}

      {/* Tabela */}
      {(isLoading || items.length > 0) && (
        <CostItemsTable
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onEdit={handleEdit}
          onPay={handlePayItem}
          isLoading={isLoading}
        />
      )}

      {/* Totalizadores */}
      {!isLoading && items.length > 0 && (
        <CostItemsTotals meta={meta} totalWithOvertime={totalWithOvertime} items={items} />
      )}

      {/* Drawer criar/editar */}
      <CostItemDrawer
        open={drawerOpen}
        onOpenChange={open => {
          setDrawerOpen(open)
          if (!open) setEditingItem(null)
        }}
        jobId={jobId}
        editingItem={editingItem}
        jobStartDate={jobStartDate}
        allItems={items}
      />

      {/* Dialog de pagamento */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={open => {
          setPaymentOpen(open)
          if (!open) setPaymentItemIds([])
        }}
        selectedItemIds={paymentItemIds}
        onSuccess={handlePaymentSuccess}
      />

      {/* Dialog de template */}
      <ApplyTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        jobId={jobId}
        onSuccess={() => {}}
      />

      {/* Dialog de import from job */}
      <ImportFromJobDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        jobId={jobId}
        onSuccess={() => {}}
      />

      {/* Sheet de historico de alteracoes dos itens de custo */}
      <CostItemHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        jobId={jobId}
      />
    </div>
  )
}
