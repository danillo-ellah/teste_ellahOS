'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, FileSignature, Mail, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CastMember, CastContractStatus } from '@/types/cast'

// --- Configs de badge (reutilizado do TabCast) ---

const CONTRACT_STATUS_CONFIG: Record<
  CastContractStatus,
  { label: string; className: string }
> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-transparent',
  },
  enviado: {
    label: 'Enviado',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent',
  },
  assinado: {
    label: 'Assinado',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-transparent',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-transparent',
  },
}

// Labels de categoria de elenco
const CAST_CATEGORY_LABELS: Record<string, string> = {
  ator_principal: 'Ator Principal',
  ator_coadjuvante: 'Coadjuvante',
  figurante: 'Figurante',
  modelo: 'Modelo',
  crianca: 'Crianca',
  locutor: 'Locutor(a)',
  apresentador: 'Apresentador(a)',
  outro: 'Outro',
}

function categoryLabel(value: string): string {
  return CAST_CATEGORY_LABELS[value] ?? value
}

// Resposta da EF generate-contracts
interface CastMemberResult {
  cast_member_id: string
  name: string
  status: 'sent' | 'skipped' | 'error'
  error?: string
  skip_reason?: string
}

interface GenerateContractsResult {
  sent: number
  skipped: number
  errors: number
  results?: CastMemberResult[]
}

// --- Props ---

interface CastContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  members: CastMember[]
}

// --- Main component ---

export function CastContractDialog({
  open,
  onOpenChange,
  jobId,
  members,
}: CastContractDialogProps) {
  const queryClient = useQueryClient()
  const [sendEmail, setSendEmail] = useState(true)

  // Pre-seleciona membros com email E contract_status === 'pendente'
  const defaultSelected = useMemo(
    () =>
      new Set(
        members
          .filter((m) => m.email && m.contract_status === 'pendente')
          .map((m) => m.id),
      ),
    // Recalcula quando o dialog abre ou a lista de membros muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, members],
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(defaultSelected)

  // Sincroniza a selecao com defaultSelected cada vez que o dialog abre
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedIds(defaultSelected)
    }
    prevOpenRef.current = open
  }, [open, defaultSelected])

  const mutation = useMutation({
    mutationFn: (selectedCastIds: string[]) =>
      apiMutate<GenerateContractsResult>(
        'job-cast',
        'POST',
        {
          job_id: jobId,
          cast_member_ids: selectedCastIds,
          send_email: sendEmail,
        },
        'generate-contracts',
      ),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['job-cast', jobId] })
      const data = response.data as GenerateContractsResult | undefined
      let msg = `${data?.sent ?? 0} contrato(s) enviado(s)`
      if (data?.skipped && data.skipped > 0) msg += `, ${data.skipped} ignorado(s)`
      if (data?.errors && data.errors > 0) {
        msg += `, ${data.errors} erro(s)`
        // Mostrar detalhes dos erros
        const errorDetails = data.results
          ?.filter((r) => r.status === 'error')
          .map((r) => `${r.name}: ${r.error}`)
          .join('\n')
        if (errorDetails) {
          toast.error(msg, { description: errorDetails, duration: 10000 })
        } else {
          toast.warning(msg)
        }
      } else {
        toast.success(msg)
      }
      handleClose()
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSelectAll() {
    setSelectedIds(new Set(members.filter((m) => m.email).map((m) => m.id)))
  }

  function handleClearSelection() {
    setSelectedIds(new Set())
  }

  function handleClose() {
    if (mutation.isPending) return
    onOpenChange(false)
  }

  function handleSubmit() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error('Selecione pelo menos um membro do elenco')
      return
    }
    mutation.mutate(ids)
  }

  const membersWithEmail = members.filter((m) => m.email)
  const membersWithoutEmail = members.filter((m) => !m.email)
  const selectedCount = selectedIds.size
  const totalEligible = membersWithEmail.length

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5" />
              Gerar Contratos do Elenco
            </DialogTitle>
            <DialogDescription>
              Selecione os membros para enviar contratos de assinatura digital via DocuSeal.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {/* Lista de membros */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  Membros
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {selectedCount} de {totalEligible} selecionado(s)
                  </span>
                </Label>
                <div className="flex gap-2">
                  {totalEligible > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Todos
                    </button>
                  )}
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
              </div>

              {members.length === 0 ? (
                <div className="rounded-lg border border-border py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro cadastrado no elenco.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-[300px] overflow-y-auto">
                  {members.map((member) => (
                    <CastMemberRow
                      key={member.id}
                      member={member}
                      checked={selectedIds.has(member.id)}
                      onToggle={() => toggleMember(member.id)}
                    />
                  ))}
                </div>
              )}

              {/* Aviso sobre membros sem email */}
              {membersWithoutEmail.length > 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    {membersWithoutEmail.length}{' '}
                    {membersWithoutEmail.length === 1
                      ? 'membro sem email cadastrado — nao pode'
                      : 'membros sem email cadastrado — nao podem'}{' '}
                    receber contrato.
                  </span>
                </div>
              )}
            </div>

            {/* Toggle enviar email */}
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium leading-none">
                    Enviar email automaticamente
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    DocuSeal envia o link de assinatura por email
                  </p>
                </div>
              </div>
              <Switch
                checked={sendEmail}
                onCheckedChange={setSendEmail}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending || selectedCount === 0}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileSignature className="size-4" />
                  Gerar {selectedCount > 0 ? `${selectedCount} ` : ''}Contrato(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// --- Linha de membro com checkbox ---

function CastMemberRow({
  member,
  checked,
  onToggle,
}: {
  member: CastMember
  checked: boolean
  onToggle: () => void
}) {
  const checkboxId = `cast-contract-${member.id}`
  const hasEmail = !!member.email
  const contractConfig = CONTRACT_STATUS_CONFIG[member.contract_status]

  const row = (
    <label
      htmlFor={checkboxId}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        hasEmail
          ? 'hover:bg-muted/50 cursor-pointer'
          : 'opacity-50 cursor-not-allowed',
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={hasEmail ? onToggle : undefined}
        disabled={!hasEmail}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {categoryLabel(member.cast_category)}
          {member.email ? ` · ${member.email}` : ''}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn('text-[10px] shrink-0', contractConfig.className)}
      >
        {contractConfig.label}
      </Badge>
    </label>
  )

  if (!hasEmail) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{row}</div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Email obrigatorio</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return row
}

