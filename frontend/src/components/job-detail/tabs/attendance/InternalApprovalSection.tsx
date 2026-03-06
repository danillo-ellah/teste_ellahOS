'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useInternalApproval,
  useUpsertInternalApproval,
  useApproveInternalApproval,
} from '@/hooks/useAttendance'
import { ApiRequestError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { formatCurrency } from '@/lib/format'
import type { UpsertInternalApprovalPayload } from '@/types/attendance'

interface InternalApprovalSectionProps {
  jobId: string
}

export function InternalApprovalSection({ jobId }: InternalApprovalSectionProps) {
  const { data: response, isLoading, isError, refetch } = useInternalApproval(jobId)
  const approval = response?.data ?? null
  const { mutateAsync: upsert, isPending: isSaving } = useUpsertInternalApproval(jobId)
  const { mutateAsync: approve, isPending: isApproving } = useApproveInternalApproval(jobId)

  // Form state
  const [scopeDescription, setScopeDescription] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [shootingDatesConfirmed, setShootingDatesConfirmed] = useState(false)
  const [approvedBudgetRaw, setApprovedBudgetRaw] = useState('')
  const [deliverablesDescription, setDeliverablesDescription] = useState('')
  const [notes, setNotes] = useState('')

  // Sync form with loaded data
  useEffect(() => {
    if (!approval) return
    setScopeDescription(approval.scope_description ?? '')
    setTeamDescription(approval.team_description ?? '')
    setShootingDatesConfirmed(approval.shooting_dates_confirmed ?? false)
    setApprovedBudgetRaw(
      approval.approved_budget != null ? String(approval.approved_budget) : ''
    )
    setDeliverablesDescription(approval.deliverables_description ?? '')
    setNotes(approval.notes ?? '')
  }, [approval])

  const isApproved = approval?.status === 'aprovado'
  const disabled = isApproved

  async function handleSave() {
    const payload: UpsertInternalApprovalPayload = {
      job_id: jobId,
      scope_description: scopeDescription || null,
      team_description: teamDescription || null,
      shooting_dates_confirmed: shootingDatesConfirmed,
      approved_budget: approvedBudgetRaw ? Number(approvedBudgetRaw) : null,
      deliverables_description: deliverablesDescription || null,
      notes: notes || null,
    }
    try {
      await upsert(payload)
      toast.success('Aprovacao interna salva')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar'
      toast.error(msg)
    }
  }

  async function handleApprove() {
    if (!approval?.id) return
    try {
      await approve(approval.id)
      toast.success('Aprovacao interna confirmada')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao aprovar'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Erro ao carregar aprovacao interna.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground shrink-0" />
            <h3 className="text-sm font-semibold">Aprovacao Interna</h3>
          </div>
          <StatusBadge status={approval?.status ?? 'rascunho'} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Banner de aprovado */}
        {isApproved && approval && (
          <div className="flex items-start gap-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Aprovado
              {approval.approved_by ? ` por ${approval.approved_by}` : ''}
              {approval.approved_at ? ` em ${formatDate(approval.approved_at)}` : ''}
            </p>
          </div>
        )}

        {/* Campos do formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="scope-description">Descricao do escopo</Label>
            <Textarea
              id="scope-description"
              rows={4}
              placeholder="Descreva o escopo acordado com o cliente..."
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-description">Descricao da equipe</Label>
            <Textarea
              id="team-description"
              rows={4}
              placeholder="Equipe envolvida no projeto..."
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverables-description">Entregaveis</Label>
            <Textarea
              id="deliverables-description"
              rows={4}
              placeholder="Liste os entregaveis acordados..."
              value={deliverablesDescription}
              onChange={(e) => setDeliverablesDescription(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observacoes</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Observacoes adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Orcamento aprovado + switch de datas */}
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="approved-budget">Orcamento aprovado (R$)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="approved-budget"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                className="pl-9"
                value={approvedBudgetRaw}
                onChange={(e) => setApprovedBudgetRaw(e.target.value)}
                disabled={disabled}
              />
            </div>
            {approvedBudgetRaw && !isNaN(Number(approvedBudgetRaw)) && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(approvedBudgetRaw))}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 sm:pt-6">
            <Switch
              id="shooting-dates-confirmed"
              checked={shootingDatesConfirmed}
              onCheckedChange={setShootingDatesConfirmed}
              disabled={disabled}
            />
            <Label htmlFor="shooting-dates-confirmed" className="cursor-pointer">
              Datas de gravacao confirmadas
            </Label>
          </div>
        </div>

        {/* Acoes */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || disabled}
          >
            {isSaving ? 'Salvando...' : 'Salvar rascunho'}
          </Button>

          {!isApproved && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isApproving || !approval?.id}
            >
              {isApproving ? 'Aprovando...' : 'Aprovar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'aprovado') {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
        Aprovado
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
      Rascunho
    </Badge>
  )
}
