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
import { Input } from '@/components/ui/input'
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
import { useDocuSealSubmissions, useBatchGenerateContracts } from '@/hooks/useDocuSealSubmissions'
import { ApiRequestError } from '@/lib/api'
import { TEAM_ROLE_LABELS } from '@/lib/constants'
import type { JobTeamMember } from '@/types/jobs'
import type { ContractTemplateType } from '@/types/docuseal'

// Labels pt-BR para tipos de template
const TEMPLATE_TYPE_LABELS: Record<ContractTemplateType, string> = {
  elenco: 'Elenco',
  tecnico: 'Equipe Tecnica',
  pj: 'Pessoa Juridica (PJ)',
}

// Opcoes rapidas de prazo de pagamento
const PAYMENT_DEADLINE_PRESETS = [30, 45, 60, 70] as const

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
  const { mutateAsync: batchGenerate, isPending } = useBatchGenerateContracts()

  // Tipo de contrato selecionado
  const [selectedType, setSelectedType] = useState<ContractTemplateType | ''>('')
  // IDs dos membros do job_team selecionados
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  // Prazo de pagamento em dias corridos
  const [paymentDays, setPaymentDays] = useState<string>('45')

  // Status que indicam contrato ativo (bloqueiam novo envio)
  const activeStatuses = new Set(['pending', 'sent', 'opened', 'partially_signed', 'signed'])

  // Membros elegiveis: sem contrato ativo para este tipo de contrato
  const eligibleMembers = useMemo(() => {
    if (!teamMembers) return []
    if (!existingSubmissions || !selectedType) return teamMembers

    // Person IDs com contrato ativo (qualquer template)
    const personIdsWithActiveContract = new Set(
      existingSubmissions
        .filter(
          (s) =>
            activeStatuses.has(s.docuseal_status) &&
            s.person_id,
        )
        .map((s) => s.person_id as string),
    )

    return teamMembers.filter(
      (m) => !personIdsWithActiveContract.has(m.person_id),
    )
  }, [teamMembers, existingSubmissions, selectedType])

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
    setPaymentDays('45')
    onOpenChange(false)
  }

  const parsedPaymentDays = parseInt(paymentDays, 10)
  const isValidPaymentDays = !isNaN(parsedPaymentDays) && parsedPaymentDays >= 1 && parsedPaymentDays <= 365

  async function handleSubmit() {
    if (!selectedType) {
      toast.error('Selecione o tipo de contrato')
      return
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Selecione pelo menos um membro da equipe')
      return
    }

    if (!isValidPaymentDays) {
      toast.error('Informe um prazo de pagamento valido (1 a 365 dias)')
      return
    }

    try {
      await batchGenerate({
        job_id: jobId,
        template_type: selectedType,
        member_ids: Array.from(selectedMemberIds),
        payment_deadline_days: parsedPaymentDays,
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
            Selecione o tipo de contrato, o prazo de pagamento e os membros da equipe para enviar contratos de assinatura digital via DocuSeal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Selecao de tipo de contrato */}
          <div>
            <Label htmlFor="template-type">
              Tipo de Contrato <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger id="template-type" className="mt-1.5">
                <SelectValue placeholder="Selecione o tipo de contrato" />
              </SelectTrigger>
              <SelectContent>
                {(['elenco', 'tecnico', 'pj'] as const).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TEMPLATE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prazo de pagamento */}
          <div>
            <Label htmlFor="payment-days">
              Prazo de Pagamento (dias corridos) <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="payment-days"
                type="number"
                min={1}
                max={365}
                value={paymentDays}
                onChange={(e) => setPaymentDays(e.target.value)}
                className="w-24"
                placeholder="45"
              />
              <span className="text-sm text-muted-foreground">dias</span>
              <div className="flex gap-1 ml-auto">
                {PAYMENT_DEADLINE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPaymentDays(String(preset))}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      paymentDays === String(preset)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {preset}d
                  </button>
                ))}
              </div>
            </div>
            {paymentDays && !isValidPaymentDays && (
              <p className="text-xs text-destructive mt-1">
                Informe um valor entre 1 e 365 dias.
              </p>
            )}
          </div>

          {/* Lista de membros elegiveis */}
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
                  Selecione o tipo de contrato para ver os membros disponiveis.
                </p>
              </div>
            ) : eligibleMembers.length === 0 ? (
              <div className="rounded-lg border border-border py-8 flex flex-col items-center justify-center gap-2 text-center">
                <UserCheck className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Todos os membros ja possuem contratos ativos.
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
              !isValidPaymentDays
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
