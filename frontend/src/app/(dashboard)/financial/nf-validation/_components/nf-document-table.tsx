'use client'

import { useState } from 'react'
import {
  FileText,
  CheckSquare,
  MoreHorizontal,
  ExternalLink,
  RotateCcw,
  XCircle,
  Copy,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Filter,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { NfStatusBadge } from './nf-status-badge'
import type { NfDocument, NfFilters } from '@/types/nf'
import type { PaginationMeta } from '@/types/jobs'

// --- Helpers ---

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// --- Skeleton ---

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-10">
        <Skeleton className="h-4 w-4" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-4 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-7" />
        </div>
      </TableCell>
    </TableRow>
  )
}

// --- Sort icon ---

function SortIcon({ column, sortBy, sortOrder }: {
  column: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}) {
  if (sortBy !== column) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-50" />
  if (sortOrder === 'asc') return <ChevronUp className="h-3 w-3 ml-1 inline" />
  return <ChevronDown className="h-3 w-3 ml-1 inline" />
}

// --- Empty States ---

function EmptyStateNoData() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <FileCheck className="h-12 w-12 text-zinc-300" />
      <p className="mt-4 text-lg font-semibold text-foreground">Nenhuma NF pendente</p>
      <p className="mt-2 max-w-sm text-center text-sm text-zinc-500">
        Quando fornecedores enviarem NFs por email, elas aparecerao aqui automaticamente.
      </p>
    </div>
  )
}

function EmptyStateFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Filter className="h-12 w-12 text-zinc-300" />
      <p className="mt-4 text-lg font-semibold text-foreground">Nenhuma NF encontrada</p>
      <p className="mt-2 text-sm text-zinc-500">Tente ajustar os filtros aplicados.</p>
      <Button variant="outline" className="mt-6" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <span className="text-4xl text-red-400">!</span>
      <p className="mt-4 text-lg font-semibold text-foreground">Erro ao carregar NFs</p>
      <p className="mt-2 max-w-sm text-center text-sm text-zinc-500">
        Tente novamente. Se o problema persistir, contate o suporte.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

// --- Mobile card ---

interface NfCardProps {
  nf: NfDocument
  onValidate: (nf: NfDocument) => void
  onReject: (nf: NfDocument) => void
  onReassign: (nf: NfDocument) => void
}

function NfDocumentCard({ nf, onValidate, onReject, onReassign }: NfCardProps) {
  const issuer = nf.nf_issuer_name ?? nf.extracted_issuer_name
  const value = nf.nf_value ?? nf.extracted_value

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium">{nf.file_name}</span>
        </div>
        <NfStatusBadge status={nf.status} />
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {issuer ?? <span className="italic text-zinc-400">Fornecedor desconhecido</span>}
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{formatCurrency(value)}</span>
          <span className="text-xs text-zinc-500">
            {formatDate(nf.email_received_at ?? nf.created_at)}
          </span>
        </div>
        {nf.matched_job_code && (
          <Badge variant="outline" className="text-xs">
            {nf.matched_job_code}
          </Badge>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => onValidate(nf)}
        >
          Validar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReject(nf)}
        >
          Rejeitar
        </Button>
      </div>
    </div>
  )
}

// --- Bulk Actions Bar ---

interface BulkBarProps {
  count: number
  onConfirmBulk: () => void
  onRejectBulk: () => void
  onClear: () => void
}

function BulkActionsBar({ count, onConfirmBulk, onRejectBulk, onClear }: BulkBarProps) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center gap-4 rounded-full bg-zinc-900 px-6 py-3 shadow-xl dark:bg-zinc-100">
        <span className="text-sm font-medium text-white dark:text-zinc-900">
          {count} NF{count > 1 ? 's' : ''} selecionada{count > 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 rounded-full text-xs"
            onClick={onClear}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-full bg-rose-600 text-xs text-white hover:bg-rose-700"
            onClick={onConfirmBulk}
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 rounded-full text-xs"
            onClick={onRejectBulk}
          >
            Rejeitar
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Main component ---

interface NfDocumentTableProps {
  nfs: NfDocument[] | undefined
  meta: PaginationMeta | undefined
  isLoading: boolean
  isError: boolean
  hasActiveFilters: boolean
  filters: NfFilters
  onFiltersChange: (f: Partial<NfFilters>) => void
  onValidate: (nf: NfDocument) => void
  onReassign: (nf: NfDocument) => void
  onRefetch: () => void
  onBulkReject?: (ids: string[]) => void
}

export function NfDocumentTable({
  nfs,
  meta,
  isLoading,
  isError,
  hasActiveFilters,
  filters,
  onFiltersChange,
  onValidate,
  onReassign,
  onRefetch,
  onBulkReject,
}: NfDocumentTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rejectTarget, setRejectTarget] = useState<NfDocument | null>(null)

  const sortBy = filters.sort_by ?? 'created_at'
  const sortOrder = filters.sort_order ?? 'desc'
  const page = filters.page ?? 1

  function handleSort(column: string) {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc'
    onFiltersChange({ sort_by: column as NfFilters['sort_by'], sort_order: newOrder, page: 1 })
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!nfs) return
    if (selected.size === nfs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(nfs.map((n) => n.id)))
    }
  }

  function handleCopyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      toast.success('ID copiado')
    }).catch(() => {
      toast.error('Erro ao copiar')
    })
  }

  const totalPages = meta?.total_pages ?? 1
  const totalItems = meta?.total ?? 0
  const perPage = filters.per_page ?? 20
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalItems)

  if (isError) {
    return <ErrorState onRetry={onRefetch} />
  }

  if (!isLoading && (!nfs || nfs.length === 0)) {
    if (hasActiveFilters) {
      return (
        <EmptyStateFiltered
          onClear={() =>
            onFiltersChange({ status: 'all', job_id: undefined, search: undefined, period: undefined, page: 1 })
          }
        />
      )
    }
    return <EmptyStateNoData />
  }

  return (
    <div className="space-y-3">
      {/* Tabela desktop */}
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <Table aria-label="Lista de NFs recebidas" role="grid">
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    nfs && nfs.length > 0
                      ? selected.size === nfs.length
                      : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <TableHead className="min-w-[180px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Arquivo
              </TableHead>
              <TableHead className="w-[180px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Fornecedor
              </TableHead>
              <TableHead
                className="w-[120px] cursor-pointer text-xs font-medium uppercase tracking-wide text-zinc-500"
                onClick={() => handleSort('email_received_at')}
                aria-sort={
                  sortBy === 'email_received_at'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                Recebido em
                <SortIcon column="email_received_at" sortBy={sortBy} sortOrder={sortOrder} />
              </TableHead>
              <TableHead
                className="w-[110px] cursor-pointer text-right text-xs font-medium uppercase tracking-wide text-zinc-500"
                onClick={() => handleSort('extracted_value')}
                aria-sort={
                  sortBy === 'extracted_value'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                Valor
                <SortIcon column="extracted_value" sortBy={sortBy} sortOrder={sortOrder} />
              </TableHead>
              <TableHead className="w-[140px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Job Vinculado
              </TableHead>
              <TableHead className="w-[130px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </TableHead>
              <TableHead className="w-[100px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Acoes
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)
              : nfs?.map((nf) => {
                  const issuer = nf.nf_issuer_name ?? nf.extracted_issuer_name
                  const value = nf.nf_value ?? nf.extracted_value
                  const receivedAt = nf.email_received_at ?? nf.created_at

                  return (
                    <TableRow
                      key={nf.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      {/* Checkbox */}
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selected.has(nf.id)}
                          onCheckedChange={() => toggleRow(nf.id)}
                          aria-label={`Selecionar ${nf.file_name}`}
                        />
                      </TableCell>

                      {/* Arquivo */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                              <div className="min-w-0">
                                <span className="block truncate max-w-[160px] text-sm text-zinc-700 dark:text-zinc-300">
                                  {nf.file_name}
                                </span>
                                {nf.file_hash && (
                                  <span className="hidden text-xs text-zinc-400 group-hover:block">
                                    SHA: {nf.file_hash.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">{nf.file_name}</TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Fornecedor */}
                      <TableCell>
                        {issuer ? (
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {issuer}
                          </span>
                        ) : (
                          <span className="text-sm italic text-zinc-400">Desconhecido</span>
                        )}
                      </TableCell>

                      {/* Recebido em */}
                      <TableCell>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDate(receivedAt)}
                        </span>
                      </TableCell>

                      {/* Valor */}
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(value)}
                        </span>
                      </TableCell>

                      {/* Job Vinculado */}
                      <TableCell>
                        {nf.matched_job_code ? (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {nf.matched_job_code}
                            </Badge>
                            {nf.matched_job_type && (
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {nf.matched_job_type}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-zinc-400">—</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Sem job vinculado — valide para associar
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <NfStatusBadge status={nf.status} />
                      </TableCell>

                      {/* Acoes */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => onValidate(nf)}
                                aria-label={`Validar NF: ${nf.file_name}`}
                              >
                                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                Validar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir validacao</TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                aria-label="Mais opcoes"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {nf.drive_url && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={nf.drive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Visualizar PDF
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => onReassign(nf)}
                                className="flex items-center gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reclassificar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="flex items-center gap-2 text-destructive focus:text-destructive"
                                onClick={() => setRejectTarget(nf)}
                              >
                                <XCircle className="h-4 w-4" />
                                Rejeitar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCopyId(nf.id)}
                                className="flex items-center gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copiar ID
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </div>

      {/* Cards mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))
          : nfs?.map((nf) => (
              <NfDocumentCard
                key={nf.id}
                nf={nf}
                onValidate={onValidate}
                onReject={(n) => setRejectTarget(n)}
                onReassign={onReassign}
              />
            ))}
      </div>

      {/* Paginacao */}
      {!isLoading && meta && totalItems > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-zinc-500">
            Exibindo {from}–{to} de {totalItems}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onFiltersChange({ page: page - 1 })}
              disabled={page <= 1}
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              const isActive = pageNum === page
              return (
                <Button
                  key={pageNum}
                  variant={isActive ? 'default' : 'outline'}
                  className={cn('h-8 w-8 p-0 text-xs', isActive && 'pointer-events-none')}
                  onClick={() => !isActive && onFiltersChange({ page: pageNum })}
                  aria-label={`Pagina ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                  disabled={isActive}
                >
                  {pageNum}
                </Button>
              )
            })}
            {totalPages > 5 && page < totalPages - 2 && (
              <span className="flex h-8 w-8 items-center justify-center text-sm text-zinc-400 select-none">
                ...
              </span>
            )}
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onFiltersChange({ page: page + 1 })}
              disabled={page >= totalPages}
              aria-label="Proxima pagina"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      <BulkActionsBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onConfirmBulk={() => {
          toast.info('Validacao em massa nao implementada — abra cada NF individualmente.')
          setSelected(new Set())
        }}
        onRejectBulk={() => {
          if (onBulkReject) {
            onBulkReject(Array.from(selected))
            setSelected(new Set())
          }
        }}
      />

      {/* Alert de confirmacao de rejeicao */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar NF</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja rejeitar a NF{' '}
              <span className="font-medium">{rejectTarget?.file_name}</span>? Esta acao pode
              ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectTarget) {
                  onValidate(rejectTarget)
                  setRejectTarget(null)
                }
              }}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
