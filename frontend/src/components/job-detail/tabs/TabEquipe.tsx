'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Star, CalendarDays, FileSignature, Shield, Link2, Copy, Check, Loader2, ClipboardList, CheckCircle2, XCircle } from 'lucide-react'
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
import { BatchContractDialog } from './BatchContractDialog'
import { AccessOverrideDialog } from './AccessOverrideDialog'
import {
  useJobTeam,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
} from '@/hooks/useJobTeam'
import { useUserRole, APPROVAL_PDF_ROLES } from '@/hooks/useUserRole'
import { useJobAccess } from '@/hooks/useJobAccess'
import { useCrewRegistrations, useToggleCrewRegistration, useApproveCrewRegistration } from '@/hooks/useCrewRegistration'
import type { CrewRegistrationStatus } from '@/hooks/useCrewRegistration'
import { FEE_VIEW_ROLES } from '@/lib/access-control-map'
import { ApiRequestError } from '@/lib/api'
import { TEAM_ROLE_LABELS, HIRING_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDateShort } from '@/lib/format'
import type { JobDetail, JobTeamMember, TeamRole, HiringStatus } from '@/types/jobs'

interface TabEquipeProps {
  job: JobDetail
}

export function TabEquipe({ job }: TabEquipeProps) {
  const { data: members, isLoading, isError, refetch } = useJobTeam(job.id)
  const { mutateAsync: addMember, isPending: isAdding } = useAddTeamMember()
  const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateTeamMember()
  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveTeamMember()
  const { role: userRole } = useUserRole()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<JobTeamMember | undefined>()
  const [deletingMember, setDeletingMember] = useState<JobTeamMember | null>(null)
  const [batchContractOpen, setBatchContractOpen] = useState(false)
  const [overrideMember, setOverrideMember] = useState<JobTeamMember | null>(null)

  const { canEditTab: canEditTabFn } = useJobAccess(job)

  // Roles que podem gerar contratos em lote (mesmos do backend)
  const canGenerateContracts = userRole !== null && APPROVAL_PDF_ROLES.includes(userRole)
  const canViewFee = userRole !== null && FEE_VIEW_ROLES.includes(userRole)
  // PE/Admin podem configurar overrides de acesso
  const canManageAccess = userRole === 'admin' || userRole === 'ceo' || userRole === 'produtor_executivo'
  // Permissao de edicao na aba Equipe (adicionar/editar/remover membros)
  const canEditTeam = canEditTabFn('equipe')

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
    allocation_start: string | null
    allocation_end: string | null
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
          allocation_start: data.allocation_start,
          allocation_end: data.allocation_end,
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
          allocation_start: data.allocation_start,
          allocation_end: data.allocation_end,
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
          description={canEditTeam ? 'Adicione os profissionais que vao trabalhar neste job.' : 'Nenhum membro adicionado a equipe deste job ainda.'}
          actionLabel={canEditTeam ? 'Adicionar membro' : undefined}
          onAction={canEditTeam ? handleOpenAdd : undefined}
        />
        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          isPending={isAdding}
        />
        <BatchContractDialog
          open={batchContractOpen}
          onOpenChange={setBatchContractOpen}
          jobId={job.id}
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
        <div className="flex items-center gap-2">
          {canGenerateContracts && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchContractOpen(true)}
            >
              <FileSignature className="size-4" />
              Gerar Contratos
            </Button>
          )}
          {canEditTeam && (
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              <Plus className="size-4" />
              Adicionar membro
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Funcao</TableHead>
              <TableHead>Status</TableHead>
              {canViewFee && <TableHead className="text-right">Valor</TableHead>}
              <TableHead className="hidden md:table-cell">Periodo</TableHead>
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
                      <Star className="size-3.5 text-amber-500 fill-amber-500" aria-label="Produtor responsavel" />
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
                {canViewFee && (
                  <TableCell className="text-right tabular-nums">
                    {m.fee != null ? formatCurrency(m.fee) : '-'}
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell">
                  {m.allocation_start && m.allocation_end ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {formatDateShort(m.allocation_start)} - {formatDateShort(m.allocation_end)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
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
                  {(canEditTeam || canManageAccess) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Acoes para ${m.person_name || 'membro'}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditTeam && (
                          <DropdownMenuItem onClick={() => handleOpenEdit(m)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canManageAccess && (
                          <DropdownMenuItem onClick={() => setOverrideMember(m)}>
                            <Shield className="size-4" />
                            Permissoes
                            {m.access_override && (
                              <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">
                                {Object.keys(m.access_override.tabs).length}
                              </Badge>
                            )}
                          </DropdownMenuItem>
                        )}
                        {canEditTeam && (
                          <DropdownMenuItem
                            onClick={() => setDeletingMember(m)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Remover
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Secao: Link de cadastro para equipe */}
      {canEditTeam && (
        <CrewRegistrationSection job={job} />
      )}

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

      {/* Dialog de geracao de contratos em lote */}
      <BatchContractDialog
        open={batchContractOpen}
        onOpenChange={setBatchContractOpen}
        jobId={job.id}
      />

      {/* Dialog de override de permissoes (PE/Admin) */}
      {overrideMember && (
        <AccessOverrideDialog
          open={overrideMember !== null}
          onOpenChange={(open) => {
            if (!open) setOverrideMember(null)
          }}
          member={overrideMember}
          jobId={job.id}
        />
      )}
    </>
  )
}

// --- Badge de status de contratacao ---

// --- Secao de cadastro de equipe (link publico) ---

function CrewStatusBadge({ status }: { status: CrewRegistrationStatus }) {
  const config: Record<CrewRegistrationStatus, { label: string; className: string }> = {
    pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }
  const c = config[status] ?? config.pendente
  return (
    <Badge variant="secondary" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  )
}

function CrewRegistrationSection({ job }: { job: JobDetail }) {
  const [copied, setCopied] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const token = job.crew_registration_token
  const enabled = job.crew_registration_enabled
  const toggleMutation = useToggleCrewRegistration()
  const approveMutation = useApproveCrewRegistration()
  const { data: crewData } = useCrewRegistrations(job.id)

  const registrations = crewData?.registrations ?? []
  const summary = crewData?.summary

  const crewUrl = token
    ? `${window.location.origin}/crew/${token}`
    : null

  async function handleToggle() {
    try {
      await toggleMutation.mutateAsync({ job_id: job.id, enabled: !enabled })
      toast.success(enabled ? 'Link desativado' : 'Link ativado')
    } catch {
      toast.error('Erro ao alterar link de cadastro')
    }
  }

  function handleCopy() {
    if (!crewUrl) return
    navigator.clipboard.writeText(crewUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleApprove(registrationId: string, action: 'approve' | 'reject') {
    if (processingId) return // previne duplo clique
    setProcessingId(registrationId)
    try {
      await approveMutation.mutateAsync({
        registration_id: registrationId,
        action,
        job_id: job.id,
      })
      toast.success(action === 'approve' ? 'Profissional aprovado e adicionado a equipe!' : 'Cadastro reprovado')
    } catch {
      toast.error(action === 'approve' ? 'Erro ao aprovar' : 'Erro ao reprovar')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          Cadastro de Equipe
          {registrations.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({registrations.length} cadastro{registrations.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <Button
          size="sm"
          variant={enabled ? 'outline' : 'default'}
          className="gap-1.5"
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
        >
          {toggleMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Link2 className="size-3.5" />
          )}
          {enabled ? 'Desativar link' : 'Gerar link de cadastro'}
        </Button>
      </div>

      {/* Link ativo */}
      {enabled && crewUrl && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Link2 className="size-4 text-muted-foreground shrink-0" />
          <code className="flex-1 text-xs truncate text-muted-foreground">{crewUrl}</code>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 shrink-0 h-8"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}

      {/* Lista de quem preencheu */}
      {registrations.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Funcao</TableHead>
                <TableHead className="text-center">Diarias</TableHead>
                <TableHead className="text-right">Cache/dia</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((r) => (
                <TableRow key={r.id} className={r.status === 'reprovado' ? 'opacity-50' : ''}>
                  <TableCell className="font-medium text-sm">{r.full_name}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{r.job_role}</span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{r.num_days}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.daily_rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-sm">
                    {formatCurrency(r.total)}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant="secondary" className="text-[10px]">
                      {r.is_veteran ? 'Veterano' : 'Novo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <CrewStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    {r.status === 'pendente' ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => handleApprove(r.id, 'approve')}
                          disabled={processingId !== null}
                          title="Aprovar — adiciona a equipe"
                        >
                          {processingId === r.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleApprove(r.id, 'reject')}
                          disabled={processingId !== null}
                          title="Reprovar"
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {summary && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20 text-sm">
              <span className="text-muted-foreground">{summary.count} profissiona{summary.count !== 1 ? 'is' : 'l'}</span>
              <span className="font-semibold tabular-nums">Total: {formatCurrency(summary.grand_total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
