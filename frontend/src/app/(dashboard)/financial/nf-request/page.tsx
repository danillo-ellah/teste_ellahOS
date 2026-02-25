'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, HelpCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/api'

import { NfRequestStatsCards } from './_components/nf-request-stats-cards'
import { FinancialRecordPicker } from './_components/financial-record-picker'
import { NfEmailPreview } from './_components/nf-email-preview'
import { NfRequestSelectionToolbar } from './_components/nf-request-selection-toolbar'
import { NfRequestConfirmDialog } from './_components/nf-request-confirm-dialog'

import { useNfRequestList, useNfRequestStats, useSendNfRequest } from '@/hooks/useNfRequest'
import type { NfRequestFilters, NfRequestRecord, NfRequestSupplierGroup } from '@/types/nf'

// --- Helpers ---

function groupBySupplier(records: NfRequestRecord[]): NfRequestSupplierGroup[] {
  const map = new Map<string, NfRequestSupplierGroup>()

  for (const record of records) {
    const key = record.supplier_name ?? 'Sem fornecedor'
    const existing = map.get(key)

    if (existing) {
      existing.records.push(record)
      existing.total_amount += record.amount
    } else {
      map.set(key, {
        supplier_name: key,
        supplier_email: record.supplier_email,
        supplier_cnpj: record.supplier_cnpj,
        total_amount: record.amount,
        records: [record],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount)
}

const DEFAULT_FILTERS: NfRequestFilters = {
  status: 'sem_nf',
  per_page: 100,
}

// --- Pagina principal ---

export default function NfRequestPage() {
  const router = useRouter()

  // Filtros
  const [filters, setFilters] = useState<NfRequestFilters>(DEFAULT_FILTERS)

  // Selecao
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Preview / email
  const [customMessage, setCustomMessage] = useState('')
  const [subject, setSubject] = useState('')

  // Preview mobile (Sheet)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Dialog de confirmacao
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Data fetching
  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useNfRequestList(filters)

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useNfRequestStats()

  const { mutateAsync: sendNfRequest, isPending: isSending } = useSendNfRequest()

  // Computacoes derivadas
  const groups = useMemo(
    () => (records ? groupBySupplier(records) : []),
    [records],
  )

  const selectedRecords = useMemo(
    () => (records ?? []).filter((r) => selectedIds.has(r.id)),
    [records, selectedIds],
  )

  const selectedTotal = useMemo(
    () => selectedRecords.reduce((sum, r) => sum + r.amount, 0),
    [selectedRecords],
  )

  // Fornecedores distintos dos itens selecionados
  const selectedSuppliers = useMemo(() => {
    const names = new Set(selectedRecords.map((r) => r.supplier_name ?? 'Sem fornecedor'))
    return names
  }, [selectedRecords])

  const isMultipleSuppliers = selectedSuppliers.size > 1
  const supplierName = isMultipleSuppliers
    ? null
    : (selectedRecords[0]?.supplier_name ?? null)

  // Grupo do primeiro fornecedor selecionado (para preview)
  const previewGroup = useMemo(() => {
    if (selectedRecords.length === 0) return null
    const firstSupplier = selectedRecords[0]?.supplier_name ?? 'Sem fornecedor'
    return (
      groups.find((g) => g.supplier_name === firstSupplier) ?? null
    )
  }, [selectedRecords, groups])

  // --- Handlers de selecao ---

  const handleToggleRecord = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleSupplierGroup = useCallback(
    (group: NfRequestSupplierGroup) => {
      const groupIds = group.records.map((r) => r.id)

      setSelectedIds((prev) => {
        const allSelected = groupIds.every((id) => prev.has(id))
        const next = new Set(prev)
        if (allSelected) {
          groupIds.forEach((id) => next.delete(id))
        } else {
          groupIds.forEach((id) => next.add(id))
        }
        return next
      })
    },
    [],
  )

  const handleSelectAll = useCallback(() => {
    if (!records) return
    setSelectedIds(new Set(records.map((r) => r.id)))
  }, [records])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // --- Handlers de filtros ---

  function handleFiltersChange(partial: Partial<NfRequestFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  // --- Handlers de envio ---

  function handleOpenConfirm() {
    setSendError(null)
    setConfirmOpen(true)
  }

  async function handleConfirmSend() {
    setSendError(null)

    try {
      const ids = Array.from(selectedIds)
      const result = await sendNfRequest({
        financial_record_ids: ids,
        message_template: customMessage || undefined,
      })

      const { sent_count, failed_count } = result.data

      setConfirmOpen(false)
      setSelectedIds(new Set())
      setCustomMessage('')
      setSubject('')

      if (failed_count > 0) {
        toast.warning(
          `${sent_count} pedido${sent_count !== 1 ? 's' : ''} enviado${sent_count !== 1 ? 's' : ''}. ${failed_count} falhou.`,
        )
      } else if (isMultipleSuppliers) {
        toast.success(`${sent_count} pedidos de NF enviados com sucesso`)
      } else {
        toast.success(`Pedido enviado para ${supplierName ?? 'fornecedor'}`)
      }

      refetch()
      refetchStats()
    } catch (err) {
      setSendError(safeErrorMessage(err))
    }
  }

  function handleRefresh() {
    refetch()
    refetchStats()
    toast.info('Atualizando...')
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Financeiro{' '}
            <span className="mx-1 text-zinc-400">/</span>
            NFs{' '}
            <span className="mx-1 text-zinc-400">/</span>
            Pedir NF
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Pedir NF
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Selecione os lancamentos e envie um pedido de NF para o fornecedor.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <HelpCircle className="h-4 w-4 text-zinc-400" />
                <span className="sr-only">Como funciona</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              Selecione lancamentos sem NF, revise o preview do email e confirme
              o envio. Um email sera disparado para cada fornecedor com os itens
              correspondentes.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-6 pb-4">
        <NfRequestStatsCards stats={stats} isLoading={statsLoading} />
      </div>

      <Separator />

      {/* Split layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Painel esquerdo — picker (60%) */}
        <div className="flex w-full flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800 lg:w-[60%]">
          <FinancialRecordPicker
            records={records}
            isLoading={isLoading}
            isError={isError}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            selectedIds={selectedIds}
            onToggleRecord={handleToggleRecord}
            onToggleSupplierGroup={handleToggleSupplierGroup}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onViewFinancial={() => router.push('/financial')}
          />
        </div>

        {/* Painel direito — preview do email (40%) — oculto em mobile */}
        <div className="hidden flex-col overflow-hidden lg:flex lg:w-[40%]">
          <NfEmailPreview
            selectedGroup={previewGroup}
            selectedRecords={selectedRecords}
            customMessage={customMessage}
            onCustomMessageChange={setCustomMessage}
            subject={subject}
            onSubjectChange={setSubject}
            isMultipleSuppliers={isMultipleSuppliers}
            supplierCount={selectedSuppliers.size}
          />
        </div>
      </div>

      {/* Botao de preview mobile (visivel apenas abaixo de lg) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-center border-t p-3 lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" />
            Ver preview do email
          </Button>
        </div>
      )}

      {/* Sheet de preview mobile */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Preview do Email</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <NfEmailPreview
              selectedGroup={previewGroup}
              selectedRecords={selectedRecords}
              customMessage={customMessage}
              onCustomMessageChange={setCustomMessage}
              subject={subject}
              onSubjectChange={setSubject}
              isMultipleSuppliers={isMultipleSuppliers}
              supplierCount={selectedSuppliers.size}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Toolbar flutuante de selecao */}
      <NfRequestSelectionToolbar
        selectedCount={selectedIds.size}
        selectedTotal={selectedTotal}
        supplierCount={selectedSuppliers.size}
        supplierName={supplierName}
        onCancel={handleDeselectAll}
        onConfirm={handleOpenConfirm}
        isLoading={isSending}
      />

      {/* Dialog de confirmacao */}
      <NfRequestConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setSendError(null)
        }}
        groups={groups}
        selectedIds={selectedIds}
        isLoading={isSending}
        errorMessage={sendError}
        onConfirm={handleConfirmSend}
      />
    </div>
  )
}
