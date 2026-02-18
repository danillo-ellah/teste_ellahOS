'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { TeamMemberDialog } from './TeamMemberDialog'
import {
  useJobTeam,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
} from '@/hooks/useJobTeam'
import { ApiRequestError } from '@/lib/api'
import { TEAM_ROLE_LABELS, HIRING_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import type { JobDetail, JobTeamMember, TeamRole, HiringStatus } from '@/types/jobs'

interface TabEquipeProps {
  job: JobDetail
}

export function TabEquipe({ job }: TabEquipeProps) {
  const { data: members, isLoading, isError, refetch } = useJobTeam(job.id)
  const { mutateAsync: addMember, isPending: isAdding } = useAddTeamMember()
  const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateTeamMember()
  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveTeamMember()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<JobTeamMember | undefined>()
  const [deletingMember, setDeletingMember] = useState<JobTeamMember | null>(null)

  function handleOpenAdd() {
    setEditingMember(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(member: JobTeamMember) {
    setEditingMember(member)
    setDialogOpen(true)
  }

  async function handleSubmit(data: {
    person_id: string
    role: string
    hiring_status: string
    fee: number | null
    is_lead_producer: boolean
    notes: string | null
  }) {
    try {
      if (editingMember) {
        await updateMember({
          jobId: job.id,
          memberId: editingMember.id,
          role: data.role as TeamRole,
          hiring_status: data.hiring_status as HiringStatus,
          fee: data.fee,
          is_lead_producer: data.is_lead_producer,
          notes: data.notes,
        })
        toast.success('Membro atualizado')
      } else {
        const result = await addMember({
          jobId: job.id,
          person_id: data.person_id,
          role: data.role as TeamRole,
          hiring_status: data.hiring_status as HiringStatus,
          fee: data.fee,
          is_lead_producer: data.is_lead_producer,
          notes: data.notes,
        })
        toast.success('Membro adicionado')
        // Mostrar warnings de conflito de agenda
        if (result.warnings && result.warnings.length > 0) {
          for (const w of result.warnings) {
            toast.warning(w.message)
          }
        }
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar membro'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deletingMember) return
    try {
      await removeMember({ jobId: job.id, memberId: deletingMember.id })
      toast.success('Membro removido')
      setDeletingMember(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao remover membro'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar equipe.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const teamList = members ?? []

  if (teamList.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Users}
          title="Nenhum membro na equipe"
          description="Adicione os profissionais que vao trabalhar neste job."
          actionLabel="Adicionar membro"
          onAction={handleOpenAdd}
        />
        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          isPending={isAdding}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Equipe ({teamList.length})
        </h3>
        <Button size="sm" variant="outline" onClick={handleOpenAdd}>
          <Plus className="size-4" />
          Adicionar membro
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Funcao</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[50px]" />
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamList.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate" title={m.person_name || 'Sem nome'}>
                      {m.person_name || 'Sem nome'}
                    </span>
                    {m.is_lead_producer && (
                      <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {TEAM_ROLE_LABELS[m.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <HiringStatusBadge status={m.hiring_status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.fee != null ? formatCurrency(m.fee) : '-'}
                </TableCell>
                <TableCell>
                  {m.notes && (
                    <span
                      className="text-xs text-muted-foreground truncate max-w-[100px] block"
                      title={m.notes}
                    >
                      {m.notes}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Acoes para ${m.person_name || 'membro'}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(m)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingMember(m)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de add/edit */}
      <TeamMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        onSubmit={handleSubmit}
        isPending={isAdding || isUpdating}
      />

      {/* Dialog de confirmacao de remocao */}
      <ConfirmDialog
        open={deletingMember !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingMember(null)
        }}
        title="Remover membro"
        description={`Tem certeza que deseja remover ${deletingMember?.person_name || 'este membro'} da equipe?`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isRemoving}
        onConfirm={handleDelete}
      />
    </>
  )
}

// --- Badge de status de contratacao ---

function HiringStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    orcado: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    proposta_enviada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? ''}`}>
      {HIRING_STATUS_LABELS[status as keyof typeof HIRING_STATUS_LABELS] ?? status}
    </span>
  )
}
