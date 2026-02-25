'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, UserCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useJobTeam } from '@/hooks/useJobTeam'
import { useDocuSealSubmissions, useCreateDocuSeal } from '@/hooks/useDocuSealSubmissions'
import { ApiRequestError } from '@/lib/api'
import { TEAM_ROLE_LABELS } from '@/lib/constants'
import type { JobTeamMember } from '@/types/jobs'
import type { CreateDocuSealSubmitter } from '@/types/docuseal'

interface CreateContractsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function CreateContractsDialog({
  open,
  onOpenChange,
  jobId,
}: CreateContractsDialogProps) {
  const { data: teamMembers, isLoading: loadingTeam } = useJobTeam(jobId)
  const { data: existingSubmissions, isLoading: loadingSubmissions } = useDocuSealSubmissions(jobId)
  const { mutateAsync: createDocuSeal, isPending } = useCreateDocuSeal()

  // IDs dos membros selecionados para gerar contrato
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  // ID do template DocuSeal a usar
  const [templateId, setTemplateId] = useState('')

  // Membros da equipe que ainda nao possuem contrato ativo (pending, sent, opened, signed)
  const availableMembers = useMemo(() => {
    if (!teamMembers || !existingSubmissions) return teamMembers ?? []

    // Status que indicam contrato ativo (nao permitem novo envio)
    const activeStatuses = new Set(['pending', 'sent', 'opened', 'partially_signed', 'signed'])

    // Coleta person_ids com contrato ativo
    const membersWithActiveContract = new Set(
      existingSubmissions
        .filter((s) => activeStatuses.has(s.docuseal_status) && s.person_id)
        .map((s) => s.person_id as string),
    )

    return teamMembers.filter(
      (m) => !membersWithActiveContract.has(m.person_id),
    )
  }, [teamMembers, existingSubmissions])

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  function handleSelectAll() {
    setSelectedMemberIds(new Set(availableMembers.map((m) => m.person_id)))
  }

  function handleClearSelection() {
    setSelectedMemberIds(new Set())
  }

  function handleClose() {
    setSelectedMemberIds(new Set())
    setTemplateId('')
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (selectedMemberIds.size === 0) {
      toast.error('Selecione pelo menos um membro da equipe')
      return
    }

    const parsedTemplateId = parseInt(templateId, 10)
    if (!templateId || isNaN(parsedTemplateId) || parsedTemplateId <= 0) {
      toast.error('Informe um Template ID valido')
      return
    }

    // Monta lista de submitters com base nos membros selecionados
    const selectedMembers = (teamMembers ?? []).filter((m) =>
      selectedMemberIds.has(m.person_id),
    )

    const submitters: CreateDocuSealSubmitter[] = selectedMembers.map((m) => ({
      person_id: m.person_id,
      person_name: m.person_name ?? 'Sem nome',
      person_email: '', // email sera resolvido pelo backend via person_id
    }))

    try {
      await createDocuSeal({
        job_id: jobId,
        template_id: parsedTemplateId,
        submitters,
      })
      toast.success(
        `${selectedMemberIds.size} contrato(s) gerado(s) com sucesso`,
      )
      handleClose()
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao gerar contratos'
      toast.error(msg)
    }
  }

  const isLoadingData = loadingTeam || loadingSubmissions

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar contratos DocuSeal</DialogTitle>
          <DialogDescription>
            Selecione os membros da equipe para enviar contratos de assinatura digital.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Template ID */}
          <div>
            <Label htmlFor="template-id">
              Template ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="template-id"
              type="number"
              min={1}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Ex: 12345"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ID do template configurado no DocuSeal.
            </p>
          </div>

          {/* Lista de membros */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Membros da equipe</Label>
              {!isLoadingData && availableMembers.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    Selecionar todos
                  </button>
                  {selectedMemberIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            {isLoadingData ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="rounded-lg border border-border py-8 flex flex-col items-center justify-center gap-2 text-center">
                <UserCheck className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Todos os membros da equipe ja possuem contratos ativos.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border max-h-[280px] overflow-y-auto">
                {availableMembers.map((member) => (
                  <MemberCheckboxRow
                    key={member.person_id}
                    member={member}
                    checked={selectedMemberIds.has(member.person_id)}
                    onToggle={() => toggleMember(member.person_id)}
                  />
                ))}
              </div>
            )}

            {selectedMemberIds.size > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {selectedMemberIds.size} membro(s) selecionado(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedMemberIds.size === 0 || !templateId}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Gerando...
              </>
            ) : (
              `Gerar ${selectedMemberIds.size > 0 ? `${selectedMemberIds.size} ` : ''}contrato(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Linha de membro com checkbox ---

function MemberCheckboxRow({
  member,
  checked,
  onToggle,
}: {
  member: JobTeamMember
  checked: boolean
  onToggle: () => void
}) {
  const checkboxId = `member-${member.person_id}`
  const roleLabel = TEAM_ROLE_LABELS[member.role] ?? member.role

  return (
    <label
      htmlFor={checkboxId}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {member.person_name ?? 'Sem nome'}
        </p>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
      </div>
    </label>
  )
}
