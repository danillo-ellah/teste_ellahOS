'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Link2,
  MoreHorizontal,
  Unlink,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { ReconciliationStatusBadge, getReconciliationStatus } from './ReconciliationStatusBadge'
import { LinkCostItemDialog } from './LinkCostItemDialog'
import { useReconcile } from '@/hooks/useBankReconciliation'
import { toast } from 'sonner'
import type { BankTransaction, TransactionFilters } from '@/types/bank-reconciliation'
import type { PaginationMeta } from '@/types/jobs'

interface TransactionsTableProps {
  transactions: BankTransaction[] | undefined
  meta: (PaginationMeta & { statement?: unknown }) | undefined
  isLoading: boolean
  isError: boolean
  filters: TransactionFilters
  onFiltersChange: (partial: Partial<Omit<TransactionFilters, 'statement_id'>>) => void
  onRefetch: () => void
}

export function TransactionsTable({
  transactions,
  meta,
  isLoading,
  isError,
  filters,
  onFiltersChange,
  onRefetch,
}: TransactionsTableProps) {
  const [linkTarget, setLinkTarget] = useState<BankTransaction | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const { mutateAsync: reconcile, isPending: isLinking } = useReconcile()

  const handleLink = (tx: BankTransaction) => {
    setLinkTarget(tx)
    setLinkDialogOpen(true)
  }

  const handleLinkConfirm = async (costItemId: string) => {
    if (!linkTarget) return
    try {
      await reconcile({
        transaction_id: linkTarget.id,
        cost_item_id: costItemId,
      })
      toast.success('Transacao conciliada com item de custo')
      setLinkDialogOpen(false)
      setLinkTarget(null)
      onRefetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conciliar'
      toast.error(msg)
    }
  }

  const handleUnlink = async (tx: BankTransaction) => {
    try {
      await reconcile({
        transaction_id: tx.id,
        unreconcile: true,
      })
      toast.success('Conciliacao desfeita')
      onRefetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao desfazer conciliacao'
      toast.error(msg)
    }
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-zinc-500">
        Erro ao carregar transacoes. Tente novamente.
      </div>
    )
  }

  const currentPage = filters.page ?? 1
  const perPage = filters.per_page ?? 50
  const totalPages = meta?.total_pages ?? 1

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900">
              <TableHead
                className="cursor-pointer select-none w-28"
                onClick={() => onFiltersChange({
                  sort_by: 'transaction_date',
                  sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc',
                  page: 1,
                })}
              >
                <span className="flex items-center gap-1">
                  Data
                  <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                </span>
              </TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead
                className="text-right cursor-pointer select-none w-32"
                onClick={() => onFiltersChange({
                  sort_by: 'amount',
                  sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc',
                  page: 1,
                })}
              >
                <span className="flex items-center justify-end gap-1">
                  Valor
                  <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                </span>
              </TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead>Vinculo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : (transactions ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-zinc-500">
                  Nenhuma transacao encontrada com os filtros atuais
                </TableCell>
              </TableRow>
            ) : (
              (transactions ?? []).map((tx) => {
                const status = getReconciliationStatus(tx)
                const isDebit = tx.amount < 0
                const absAmount = Math.abs(tx.amount)

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      'group',
                      tx.reconciled && 'bg-green-50/30 dark:bg-green-900/5',
                    )}
                  >
                    {/* Data */}
                    <TableCell className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                      {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}
                    </TableCell>

                    {/* Descricao */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[260px] truncate text-sm font-medium">
                            {tx.description}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {tx.description}
                          {tx.reference_id && (
                            <div className="mt-1 text-zinc-400">Ref: {tx.reference_id}</div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Valor */}
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          isDebit
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400',
                        )}
                      >
                        {isDebit ? '-' : '+'}{formatCurrency(absAmount)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <ReconciliationStatusBadge
                        status={status}
                        confidence={tx.match_confidence}
                      />
                    </TableCell>

                    {/* Vinculo */}
                    <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                      {tx.reconciled && tx.cost_items ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {tx.cost_items.jobs
                              ? `${tx.cost_items.jobs.code ?? ''}${tx.cost_items.jobs.job_aba ? '-' + tx.cost_items.jobs.job_aba : ''} — `
                              : ''}
                            {tx.cost_items.service_description}
                          </span>
                        </span>
                      ) : tx.reconciled && tx.payment_proofs ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            Comprovante: {tx.payment_proofs.file_name ?? 'Sem nome'}
                          </span>
                        </span>
                      ) : status === 'suggested' && tx.match_method ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          Sugestao automatica ({tx.match_method === 'auto_exact' ? 'exato' : 'aproximado'})
                        </span>
                      ) : status === 'credit' ? (
                        <span className="text-zinc-400">Entrada — nao requer conciliacao</span>
                      ) : (
                        <span className="text-zinc-400">Sem vinculo</span>
                      )}
                    </TableCell>

                    {/* Acoes */}
                    <TableCell>
                      {status !== 'credit' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acoes</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!tx.reconciled && (
                              <DropdownMenuItem onClick={() => handleLink(tx)}>
                                <Link2 className="h-4 w-4 mr-2" />
                                Vincular a custo
                              </DropdownMenuItem>
                            )}
                            {tx.reconciled && (
                              <>
                                <DropdownMenuItem onClick={() => handleLink(tx)}>
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Alterar vinculo
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => handleUnlink(tx)}
                                >
                                  <Unlink className="h-4 w-4 mr-2" />
                                  Desfazer conciliacao
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginacao */}
      {meta && meta.total > perPage && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {meta.total} transacoes — pagina {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage <= 1}
              onClick={() => onFiltersChange({ page: currentPage - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage >= totalPages}
              onClick={() => onFiltersChange({ page: currentPage + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de vinculacao */}
      <LinkCostItemDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        transaction={linkTarget}
        onLink={handleLinkConfirm}
        isLinking={isLinking}
      />
    </div>
  )
}
