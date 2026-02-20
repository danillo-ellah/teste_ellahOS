'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, ExternalLink, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePendingApprovals } from '@/hooks/useApprovals'
import { formatRelativeDate } from '@/lib/format'
import {
  APPROVAL_TYPE_LABELS,
} from '@/types/approvals'
import { cn } from '@/lib/utils'

export default function ApprovalsPage() {
  const router = useRouter()
  const { data: approvals, isLoading, isError, refetch } = usePendingApprovals()

  const list = approvals ?? []

  // Ordenar: mais antigas primeiro (memoized)
  const sorted = useMemo(
    () => [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    [list],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Aprovacoes Pendentes
          {!isLoading && sorted.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({sorted.length})
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as aprovacoes aguardando resposta.
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="size-10 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar aprovacoes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardCheck className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhuma aprovacao pendente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as aprovacoes foram respondidas.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Pendente ha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((a) => {
                const daysPending = Math.floor(
                  (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24),
                )
                const isOverdue = daysPending >= 7

                return (
                  <TableRow
                    key={a.id}
                    className={cn(
                      'cursor-pointer hover:bg-accent/50',
                      isOverdue && 'bg-red-50 dark:bg-red-900/10',
                    )}
                    tabIndex={0}
                    onClick={() => router.push(`/jobs/${a.job_id}?tab=aprovacoes`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/jobs/${a.job_id}?tab=aprovacoes`)
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {a.jobs?.code || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {APPROVAL_TYPE_LABELS[a.approval_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {a.approver_type === 'external' ? (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="size-3" />
                            {a.approver_email || a.approver_phone || 'Externo'}
                          </span>
                        ) : (
                          a.people?.full_name || 'Interno'
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs',
                        isOverdue
                          ? 'text-red-600 font-semibold dark:text-red-400'
                          : 'text-muted-foreground',
                      )}>
                        <Clock className="size-3" />
                        {formatRelativeDate(a.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
