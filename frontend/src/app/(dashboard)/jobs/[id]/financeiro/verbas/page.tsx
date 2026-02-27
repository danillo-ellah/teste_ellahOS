'use client'

import { use, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { JobFinancialTabs } from '../_components/JobFinancialTabs'
import { CashAdvanceCard } from './_components/CashAdvanceCard'
import { NewAdvanceDialog } from './_components/NewAdvanceDialog'
import { useCashAdvances } from '@/hooks/useCashAdvances'
import { useUserRole } from '@/hooks/useUserRole'

interface PageProps {
  params: Promise<{ id: string }>
}

// ============ Loading skeleton ============

function CashAdvancesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-24 rounded-md" />
            <Skeleton className="h-12 w-24 rounded-md" />
            <Skeleton className="h-12 w-24 rounded-md" />
            <Skeleton className="h-12 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ Page ============

export default function JobCashAdvancesPage({ params }: PageProps) {
  const { id: jobId } = use(params)
  const [newAdvanceOpen, setNewAdvanceOpen] = useState(false)

  const { data, isLoading, isError } = useCashAdvances(jobId)
  const { role } = useUserRole()

  const advances = data?.data ?? []

  // Permissoes por role
  const isFinanceiro = role === 'financeiro' || role === 'admin' || role === 'ceo'
  const isProdutor =
    role === 'produtor_executivo' ||
    role === 'coordenador' ||
    role === 'admin' ||
    role === 'ceo'

  return (
    <div className="space-y-4 pb-24">
      <JobFinancialTabs jobId={jobId} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Verbas a Vista</h2>
          {!isLoading && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {advances.length === 0
                ? 'Nenhum adiantamento registrado'
                : `${advances.length} adiantamento${advances.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {isFinanceiro && (
          <Button size="sm" onClick={() => setNewAdvanceOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Adiantamento
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && <CashAdvancesSkeleton />}

      {/* Erro */}
      {isError && !isLoading && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar verbas a vista. Tente recarregar a pagina.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && advances.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center gap-3">
          <Wallet className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum adiantamento de verba registrado
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isFinanceiro
                ? 'Clique em "Novo Adiantamento" para registrar o primeiro.'
                : 'Os adiantamentos de verba a vista aparecerao aqui.'}
            </p>
          </div>
          {isFinanceiro && (
            <Button size="sm" variant="outline" onClick={() => setNewAdvanceOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Adiantamento
            </Button>
          )}
        </div>
      )}

      {/* Lista de adiantamentos */}
      {!isLoading && !isError && advances.length > 0 && (
        <div className="space-y-3">
          {advances.map(advance => (
            <CashAdvanceCard
              key={advance.id}
              advance={advance}
              isFinanceiro={isFinanceiro}
              isProdutor={isProdutor}
            />
          ))}
        </div>
      )}

      {/* Dialog de novo adiantamento */}
      <NewAdvanceDialog
        open={newAdvanceOpen}
        onOpenChange={setNewAdvanceOpen}
        jobId={jobId}
      />
    </div>
  )
}
