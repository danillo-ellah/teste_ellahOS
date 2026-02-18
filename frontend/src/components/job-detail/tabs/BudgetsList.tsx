'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, FileText, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useBudgetsByJob,
  useCreateBudget,
  useDeleteBudget,
} from '@/hooks/useBudgets'
import { formatCurrency, formatDate } from '@/lib/format'
import type { JobBudget } from '@/types/financial'

interface BudgetsListProps {
  jobId: string
}

export function BudgetsList({ jobId }: BudgetsListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  const { data: budgets, isLoading } = useBudgetsByJob(jobId)
  const createBudget = useCreateBudget()
  const deleteBudget = useDeleteBudget()

  async function handleCreate() {
    if (!title.trim()) return
    try {
      await createBudget.mutateAsync({
        job_id: jobId,
        title: title.trim(),
        notes: notes.trim() || null,
      })
      toast.success('Orcamento criado')
      setTitle('')
      setNotes('')
      setCreateOpen(false)
    } catch {
      toast.error('Erro ao criar orcamento')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBudget.mutateAsync(id)
      toast.success('Orcamento removido')
    } catch {
      toast.error('Erro ao remover orcamento')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  const list = budgets ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Orcamentos</h3>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Novo orcamento
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhum orcamento cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onDelete={() => handleDelete(budget.id)}
            />
          ))}
        </div>
      )}

      {/* Dialog criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo orcamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titulo *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Orcamento v1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createBudget.isPending}
            >
              {createBudget.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BudgetCard({
  budget,
  onDelete,
}: {
  budget: JobBudget
  onDelete: () => void
}) {
  const statusLabel =
    budget.status === 'aprovado'
      ? 'Aprovado'
      : budget.status === 'rejeitado'
        ? 'Rejeitado'
        : 'Rascunho'

  const statusClass =
    budget.status === 'aprovado'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : budget.status === 'rejeitado'
        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
        : 'bg-zinc-500/10 text-zinc-500'

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{budget.title}</span>
          <Badge variant="secondary" className={statusClass}>
            {statusLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">v{budget.version}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {budget.total_value != null && (
            <span>{formatCurrency(budget.total_value)}</span>
          )}
          <span>Criado {formatDate(budget.created_at)}</span>
          {budget.approved_at && (
            <span>Aprovado {formatDate(budget.approved_at)}</span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 size-3.5" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
