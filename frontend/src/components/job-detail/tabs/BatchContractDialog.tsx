'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, UserCheck, AlertCircle } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJobTeam } from '@/hooks/useJobTeam'
import { useDocuSealSubmissions, useDocuSealTemplates, useBatchGenerateContracts } from '@/hooks/useDocuSealSubmissions'
import { ApiRequestError } from '@/lib/api'
import { TEAM_ROLE_LABELS } from '@/lib/constants'
import type { JobTeamMember } from '@/types/jobs'
import type { ContractTemplateType, DocuSealTemplate } from '@/types/docuseal'

// Labels pt-BR para tipos de template
const TEMPLATE_TYPE_LABELS: Record<ContractTemplateType, string> = {
  elenco: 'Elenco',
  tecnico: 'Equipe Tecnica',
  pj: 'Pessoa Juridica (PJ)',
}

interface BatchContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function BatchContractDialog({
  open,
  onOpenChange,
  jobId,
}: BatchContractDialogProps) {
  const { data: teamMembers, isLoading: loadingTeam } = useJobTeam(jobId)
  const { data: existingSubmissions, isLoading: loadingSubmissions } = useDocuSealSubmissions(jobId)
  const { data: templatesData, isLoading: loadingTemplates, isError: templatesError } = useDocuSealTemplates()
  const { mutateAsync: batchGenerate, isPending } = useBatchGenerateContracts()

  // Tipo de template selecionado
  const [selectedType, setSelectedType] = useState<ContractTemplateType | ''>('')
  // IDs dos membros do job_team selecionados (nao person_id)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  // Template escolhido baseado no tipo selecionado
  const selectedTemplate = useMemo<DocuSealTemplate | null>(() => {
    if (!selectedType || !templatesData?.templates) return null
    // Prefere template classificado com o tipo correto; fallback: primeiro da lista
    return (
      templatesData.templates.find((t) => t.type === selectedType) ?? null
    )
  }, [selectedType, templatesData])

  // Status que indicam contrato ativo por template (bloqueiam novo envio)
  const activeStatuses = new Set(['pending', 'sent', 'opened', 'partially_signed', 'signed'])

  // Membros elegíveis: sem contrato ativo no template selecionado
  const eligibleMembers = useMemo(() => {
    if (!teamMembers) return []
    if (!existingSubmissions || !selectedTemplate) return teamMembers

    // Person IDs com contrato ativo neste template especifico
    const personIdsWithActiveContract = new Set(
      existingSubmissions
        .filter(
          (s) =>
            activeStatuses.has(s.docuseal_status) &&
            s.person_id &&
            s.docuseal_template_id === selectedTemplate.id,
        )
        .map((s) => s.person_id as string),
    )

    return teamMembers.filter(
      (m) => !personIdsWithActiveContract.has(m.person_id),
    )
  }, [teamMembers, existingSubmissions, selectedTemplate])

  // Membros sem email (dados incompletos — nao podem receber contrato)
  // Obs: person_name nao expoe email — o backend verifica isso. Aqui filtramos
  // apenas para mostrar aviso visual; a validacao definitiva e no backend.
  const membersWithoutData = useMemo(() => {
    // Como o frontend nao tem acesso ao email da person diretamente via job_team,
    // usamos a lista elegivel integralmente. O backend irá pular os sem email.
    return []
  }, [])

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
    setSelectedMemberIds(new Set(eligibleMembers.map((m) => m.id)))
  }

  function handleClearSelection() {
    setSelectedMemberIds(new Set())
  }

  function handleTypeChange(value: string) {
    setSelectedType(value as ContractTemplateType)
    // Limpar selecao ao trocar o tipo pois a elegibilidade pode mudar
    setSelectedMemberIds(new Set())
  }

  function handleClose() {
    setSelectedType('')
    setSelectedMemberIds(new Set())
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (!selectedType) {
      toast.error('Selecione o tipo de contrato')
      return
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Selecione pelo menos um membro da equipe')
      return
    }

    try {
      await batchGenerate({
        job_id: jobId,
        template_type: selectedType,
        member_ids: Array.from(selectedMemberIds),
      })
      handleClose()
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao gerar contratos'
      toast.error(msg)
    }
  }

  const isLoadingData = loadingTeam || loadingSubmissions
  const selectedCount = selectedMemberIds.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar Contratos em Lote</DialogTitle>
          <DialogDescription>
            Selecione o tipo de contrato e os membros da equipe para enviar contratos de assinatura digital via DocuSeal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Selecao de tipo de template */}
          <div>
            <Label htmlFor="template-type">
              Tipo de Contrato <span className="text-destructive">*</span>
            </Label>
            {loadingTemplates ? (
              <Skeleton className="h-9 w-full mt-1.5" />
            ) : templatesError ? (
              <div className="mt-1.5 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" />
                <span>Falha ao carregar templates. Verifique a conexao com o DocuSeal.</span>
              </div>
            ) : (
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger id="template-type" className="mt-1.5">
                  <SelectValue placeholder="Selecione o tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  {(['elenco', 'tecnico', 'pj'] as const).map((type) => {
                    const hasTemplate = templatesData?.templates.some((t) => t.type === type)
                    return (
                      <SelectItem
                        key={type}
                        value={type}
                        disabled={!hasTemplate}
                      >
                        {TEMPLATE_TYPE_LABELS[type]}
                        {!hasTemplate && (
                          <span className="ml-2 text-xs text-muted-foreground">(sem template)</span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground mt-1">
                Template: <span className="font-medium">{selectedTemplate.name}</span> (ID: {selectedTemplate.id})
              </p>
            )}
            {selectedType && !selectedTemplate && !loadingTemplates && (
              <p className="text-xs text-destructive mt-1">
                Nenhum template encontrado para este tipo no DocuSeal. Configure um template com &quot;{selectedType}&quot; no nome.
              </p>
            )}
          </div>

          {/* Lista de membros elegíveis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Selecionar Membros</Label>
              {!isLoadingData && eligibleMembers.length > 0 && selectedType && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    Todos
                  </button>
                  {selectedCount > 0 && (
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
            ) : !selectedType ? (
              <div className="rounded-lg border border-border py-8 flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Selecione o tipo de contrato para ver os membros disponíveis.
                </p>
              </div>
            ) : eligibleMembers.length === 0 ? (
              <div className="rounded-lg border border-border py-8 flex flex-col items-center justify-center gap-2 text-center">
                <UserCheck className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Todos os membros ja possuem contratos ativos para este tipo.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border max-h-[280px] overflow-y-auto">
                {eligibleMembers.map((member) => (
                  <MemberCheckboxRow
                    key={member.id}
                    member={member}
                    checked={selectedMemberIds.has(member.id)}
                    onToggle={() => toggleMember(member.id)}
                  />
                ))}
              </div>
            )}

            {selectedCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {selectedCount} membro(s) selecionado(s)
              </p>
            )}

            {/* Aviso sobre membros sem dados completos */}
            {membersWithoutData.length > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  Membros sem email cadastrado nao podem receber contrato e serao ignorados automaticamente.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              !selectedType ||
              selectedCount === 0 ||
              !selectedTemplate
            }
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Gerando...
              </>
            ) : (
              `Gerar ${selectedCount > 0 ? `${selectedCount} ` : ''}Contrato(s)`
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
  const checkboxId = `batch-member-${member.id}`
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
