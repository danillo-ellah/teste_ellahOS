'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DropdownMenuSeparator,
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
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { apiGet, apiMutate, ApiRequestError } from '@/lib/api'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { useUserRole } from '@/hooks/useUserRole'
import type { JobDetail, JobTeamMember } from '@/types/jobs'

// --- Tipos ---

interface TimeEntry {
  id: string
  job_id: string
  team_member_id: string
  entry_date: string
  check_in: string
  check_out: string | null
  break_minutes: number
  total_hours: number | null
  overtime_hours: number | null
  overtime_rate: number
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  job_team: {
    role: string
    people: { name: string } | null
  } | null
  approver: {
    id: string
    full_name: string | null
  } | null
}

interface OvertimeSummaryMember {
  team_member_id: string
  person_name: string | null
  role: string
  total_days: number
  total_hours: number
  total_overtime_hours: number
  total_overtime_cost: number
  pending_approval: number
  approved: number
}

interface OvertimeSummary {
  members: OvertimeSummaryMember[]
  totals: {
    total_days: number
    total_hours: number
    total_overtime_hours: number
    total_overtime_cost: number
  }
}

interface TimeEntryFormData {
  team_member_id: string
  entry_date: string
  check_in: string
  check_out: string
  break_minutes: string
  overtime_rate: string
  notes: string
}

const EMPTY_FORM: TimeEntryFormData = {
  team_member_id: '',
  entry_date: new Date().toISOString().slice(0, 10),
  check_in: '',
  check_out: '',
  break_minutes: '60',
  overtime_rate: '0',
  notes: '',
}

// Roles que podem aprovar HE
const APPROVAL_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao']

// --- Hooks ---

function useTimeEntries(jobId: string) {
  return useQuery({
    queryKey: ['overtime', jobId],
    queryFn: async () => {
      const res = await apiGet<TimeEntry[]>('overtime', { job_id: jobId })
      return res.data
    },
    staleTime: 30_000,
  })
}

function useOvertimeSummary(jobId: string) {
  return useQuery({
    queryKey: ['overtime-summary', jobId],
    queryFn: async () => {
      const res = await apiGet<OvertimeSummary>('overtime', { job_id: jobId }, 'summary')
      return res.data
    },
    staleTime: 30_000,
  })
}

function useCreateTimeEntry(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiMutate<TimeEntry>('overtime', 'POST', body)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime', jobId] })
      queryClient.invalidateQueries({ queryKey: ['overtime-summary', jobId] })
    },
  })
}

function useUpdateTimeEntry(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await apiMutate<TimeEntry>('overtime', 'PATCH', body, id)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime', jobId] })
      queryClient.invalidateQueries({ queryKey: ['overtime-summary', jobId] })
    },
  })
}

function useDeleteTimeEntry(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiMutate('overtime', 'DELETE', undefined, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime', jobId] })
      queryClient.invalidateQueries({ queryKey: ['overtime-summary', jobId] })
    },
  })
}

function useApproveTimeEntry(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiMutate<TimeEntry>('overtime', 'POST', {}, `${id}/approve`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime', jobId] })
      queryClient.invalidateQueries({ queryKey: ['overtime-summary', jobId] })
    },
  })
}

// --- Componente principal ---

interface TabOvertimeProps {
  job: JobDetail
}

export function TabOvertime({ job }: TabOvertimeProps) {
  const { data: entries, isLoading, isError, refetch } = useTimeEntries(job.id)
  const { data: summary } = useOvertimeSummary(job.id)
  const { mutateAsync: createEntry, isPending: isCreating } = useCreateTimeEntry(job.id)
  const { mutateAsync: updateEntry, isPending: isUpdating } = useUpdateTimeEntry(job.id)
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useDeleteTimeEntry(job.id)
  const { mutateAsync: approveEntry, isPending: isApproving } = useApproveTimeEntry(job.id)

  const { role: userRole } = useUserRole()
  const canApprove = userRole !== null && APPROVAL_ROLES.includes(userRole)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeEntry | null>(null)
  const [form, setForm] = useState<TimeEntryFormData>(EMPTY_FORM)

  // Membros da equipe para o select do formulario
  const [teamMembers] = useState<JobTeamMember[]>(job.team ?? [])

  function handleOpenAdd() {
    setEditingEntry(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function handleOpenEdit(entry: TimeEntry) {
    setEditingEntry(entry)
    setForm({
      team_member_id: entry.team_member_id,
      entry_date: entry.entry_date,
      check_in: entry.check_in.slice(0, 5), // HH:MM
      check_out: entry.check_out ? entry.check_out.slice(0, 5) : '',
      break_minutes: String(entry.break_minutes),
      overtime_rate: String(entry.overtime_rate),
      notes: entry.notes ?? '',
    })
    setDialogOpen(true)
  }

  function update<K extends keyof TimeEntryFormData>(key: K, value: TimeEntryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.team_member_id && !editingEntry) {
      toast.error('Selecione um membro da equipe')
      return
    }
    if (!form.entry_date) {
      toast.error('Data e obrigatoria')
      return
    }
    if (!form.check_in) {
      toast.error('Horario de entrada e obrigatorio')
      return
    }

    const body: Record<string, unknown> = {
      entry_date: form.entry_date,
      check_in: form.check_in,
      check_out: form.check_out || null,
      break_minutes: Number(form.break_minutes) || 60,
      overtime_rate: Number(form.overtime_rate) || 0,
      notes: form.notes.trim() || null,
    }

    try {
      if (editingEntry) {
        await updateEntry({ id: editingEntry.id, body })
        toast.success('Lancamento atualizado')
      } else {
        await createEntry({ ...body, job_id: job.id, team_member_id: form.team_member_id })
        toast.success('Ponto registrado')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar lancamento'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deletingEntry) return
    try {
      await deleteEntry(deletingEntry.id)
      toast.success('Lancamento removido')
      setDeletingEntry(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao remover lancamento'
      toast.error(msg)
    }
  }

  async function handleApprove(entry: TimeEntry) {
    try {
      await approveEntry(entry.id)
      toast.success('Horas extras aprovadas')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao aprovar'
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
        <p className="text-sm text-muted-foreground">Erro ao carregar lancamentos de ponto.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const entryList = entries ?? []

  if (entryList.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Clock}
          title="Nenhum lancamento de ponto"
          description="Registre check-in e check-out dos membros da equipe para controle de horas extras."
          actionLabel="Registrar ponto"
          onAction={handleOpenAdd}
        />
        <TimeEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          onFormChange={setForm}
          onSubmit={handleSubmit}
          isPending={isCreating || isUpdating}
          isEditing={false}
          teamMembers={teamMembers}
          update={update}
        />
      </>
    )
  }

  // Calcular horas extras pendentes de aprovacao
  const pendingApproval = entryList.filter(
    (e) => !e.approved_by && (e.overtime_hours ?? 0) > 0
  ).length

  return (
    <>
      {/* Cards de resumo */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            label="Total de dias"
            value={String(summary.totals.total_days)}
          />
          <SummaryCard
            label="Total de horas"
            value={`${summary.totals.total_hours.toFixed(1)}h`}
          />
          <SummaryCard
            label="Horas extras"
            value={`${summary.totals.total_overtime_hours.toFixed(1)}h`}
            highlight={summary.totals.total_overtime_hours > 0}
          />
          <SummaryCard
            label="Custo de HE"
            value={formatCurrency(summary.totals.total_overtime_cost)}
            highlight={summary.totals.total_overtime_cost > 0}
          />
        </div>
      )}

      {/* Aviso de HE pendentes */}
      {pendingApproval > 0 && canApprove && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {pendingApproval} lancamento{pendingApproval > 1 ? 's' : ''} com horas extras aguardando aprovacao.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Lancamentos ({entryList.length})
        </h3>
        <Button size="sm" variant="outline" onClick={handleOpenAdd}>
          <Plus className="size-4" />
          Registrar ponto
        </Button>
      </div>

      {/* Tabela de lancamentos */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saida</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">HE</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Custo HE</TableHead>
              <TableHead className="hidden md:table-cell">Aprovacao</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entryList.map((entry) => {
              const memberName = entry.job_team?.people?.name ?? 'Membro'
              const totalHours = entry.total_hours
              const overtimeHours = entry.overtime_hours ?? 0
              const overtimeCost = overtimeHours * entry.overtime_rate
              const isApproved = !!entry.approved_by
              const hasPendingOT = !isApproved && overtimeHours > 0

              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div className="min-w-0">
                      <p className="text-sm truncate max-w-[140px]" title={memberName}>
                        {memberName}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.job_team?.role ?? ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {formatDateShort(entry.entry_date)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {entry.check_in.slice(0, 5)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {entry.check_out ? entry.check_out.slice(0, 5) : (
                      <span className="text-amber-500 text-xs">Em andamento</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {totalHours != null ? `${totalHours.toFixed(1)}h` : '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {overtimeHours > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                        {overtimeHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm hidden sm:table-cell">
                    {overtimeCost > 0 ? formatCurrency(overtimeCost) : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {isApproved ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="size-3.5 text-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {entry.approver?.full_name ?? 'Aprovado'}
                        </span>
                      </div>
                    ) : hasPendingOT ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pendente
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Acoes para lancamento de ${memberName}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(entry)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        {canApprove && hasPendingOT && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApprove(entry)}
                              disabled={isApproving}
                            >
                              <CheckCircle className="size-4" />
                              Aprovar HE
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingEntry(entry)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Resumo por membro */}
      {summary && summary.members.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Resumo por membro</h4>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">HE</TableHead>
                  <TableHead className="text-right">Custo HE</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Aprovadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.members.map((member) => (
                  <TableRow key={member.team_member_id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{member.person_name ?? 'Membro'}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {member.total_days}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {member.total_hours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {member.total_overtime_hours > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                          {member.total_overtime_hours.toFixed(1)}h
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {member.total_overtime_cost > 0
                        ? formatCurrency(member.total_overtime_cost)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {member.total_overtime_hours > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {member.approved}/{member.approved + member.pending_approval}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de total */}
                <TableRow className="font-semibold bg-muted/40">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {summary.totals.total_days}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {summary.totals.total_hours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {summary.totals.total_overtime_hours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(summary.totals.total_overtime_cost)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Dialog add/edit */}
      <TimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isPending={isCreating || isUpdating}
        isEditing={!!editingEntry}
        teamMembers={teamMembers}
        update={update}
      />

      {/* Confirm delete */}
      <AlertDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => { if (!open) setDeletingEntry(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lancamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lancamento de ponto? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Card de resumo ---

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className={`text-lg font-semibold tabular-nums ${highlight ? 'text-amber-600 dark:text-amber-400' : ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

// --- Dialog de registro/edicao de ponto ---

interface TimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: TimeEntryFormData
  onFormChange: (form: TimeEntryFormData) => void
  onSubmit: () => void
  isPending: boolean
  isEditing: boolean
  teamMembers: JobTeamMember[]
  update: <K extends keyof TimeEntryFormData>(key: K, value: TimeEntryFormData[K]) => void
}

function TimeEntryDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
  isEditing,
  teamMembers,
  update,
}: TimeEntryDialogProps) {
  // Calcular preview de HE ao vivo
  let previewTotal: number | null = null
  let previewOT = 0
  let previewCost = 0
  if (form.check_in && form.check_out) {
    const [inH, inM] = form.check_in.split(':').map(Number)
    const [outH, outM] = form.check_out.split(':').map(Number)
    const totalMin = (outH * 60 + outM) - (inH * 60 + inM) - (Number(form.break_minutes) || 60)
    if (totalMin > 0) {
      previewTotal = Math.round((totalMin / 60) * 100) / 100
      previewOT = Math.max(0, Math.round((previewTotal - 8) * 100) / 100)
      previewCost = Math.round(previewOT * (Number(form.overtime_rate) || 0) * 100) / 100
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar lancamento' : 'Registrar ponto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Membro (apenas na criacao) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="ot-member">Membro da equipe <span className="text-destructive">*</span></Label>
              <Select
                value={form.team_member_id}
                onValueChange={(v) => update('team_member_id', v)}
              >
                <SelectTrigger id="ot-member">
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.person_name ?? 'Membro'} — {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="ot-date">Data <span className="text-destructive">*</span></Label>
            <Input
              id="ot-date"
              type="date"
              value={form.entry_date}
              onChange={(e) => update('entry_date', e.target.value)}
            />
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ot-checkin">Entrada <span className="text-destructive">*</span></Label>
              <Input
                id="ot-checkin"
                type="time"
                value={form.check_in}
                onChange={(e) => update('check_in', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ot-checkout">Saida</Label>
              <Input
                id="ot-checkout"
                type="time"
                value={form.check_out}
                onChange={(e) => update('check_out', e.target.value)}
              />
            </div>
          </div>

          {/* Intervalo e rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ot-break">Intervalo (min)</Label>
              <Input
                id="ot-break"
                type="number"
                min="0"
                max="480"
                value={form.break_minutes}
                onChange={(e) => update('break_minutes', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ot-rate">Valor hora extra (R$)</Label>
              <Input
                id="ot-rate"
                type="number"
                min="0"
                step="0.01"
                value={form.overtime_rate}
                onChange={(e) => update('overtime_rate', e.target.value)}
              />
            </div>
          </div>

          {/* Preview de calculo */}
          {previewTotal !== null && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total trabalhado:</span>
                <span className="font-medium tabular-nums">{previewTotal.toFixed(2)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horas extras (acima de 8h):</span>
                <span className={`font-medium tabular-nums ${previewOT > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {previewOT.toFixed(2)}h
                </span>
              </div>
              {previewCost > 0 && (
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Custo de HE:</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(previewCost)}</span>
                </div>
              )}
            </div>
          )}

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="ot-notes">Observacoes</Label>
            <Textarea
              id="ot-notes"
              rows={2}
              placeholder="Motivo das horas extras, observacoes do dia..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar alteracoes' : 'Registrar ponto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
