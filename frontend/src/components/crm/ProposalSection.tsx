'use client'

import { useState } from 'react'
import { Plus, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAddProposal, type OpportunityProposal, type AddProposalPayload } from '@/hooks/useCrm'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  string,
  { label: string; class: string }
> = {
  draft: { label: 'Rascunho', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  sent: { label: 'Enviada', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  accepted: { label: 'Aceita', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  rejected: { label: 'Rejeitada', class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  expired: { label: 'Expirada', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
}

interface ProposalSectionProps {
  opportunityId: string
  proposals: OpportunityProposal[]
}

export function ProposalSection({ opportunityId, proposals }: ProposalSectionProps) {
  const [open, setOpen] = useState(false)
  const [addingProposal, setAddingProposal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    value: '',
    file_url: '',
    status: 'draft' as AddProposalPayload['status'],
  })

  const addProposalMutation = useAddProposal(opportunityId)

  async function handleAddProposal() {
    if (!form.title.trim()) {
      toast.error('Informe o titulo da proposta')
      return
    }

    try {
      await addProposalMutation.mutateAsync({
        title: form.title.trim(),
        value: form.value ? parseFloat(form.value) : null,
        file_url: form.file_url || null,
        status: form.status ?? 'draft',
      })
      toast.success('Proposta adicionada')
      setForm({ title: '', value: '', file_url: '', status: 'draft' })
      setAddingProposal(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Propostas
          {proposals.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[11px] font-medium text-muted-foreground">
              {proposals.length}
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setAddingProposal(!addingProposal)}
        >
          <Plus className="size-3" />
          Adicionar
        </Button>
      </div>

      {/* Form de adicao */}
      {addingProposal && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titulo da proposta *</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Ex: Proposta v1 — Campanha Produto X"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as AddProposalPayload['status'] }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">Rascunho</SelectItem>
                  <SelectItem value="sent" className="text-xs">Enviada</SelectItem>
                  <SelectItem value="accepted" className="text-xs">Aceita</SelectItem>
                  <SelectItem value="rejected" className="text-xs">Rejeitada</SelectItem>
                  <SelectItem value="expired" className="text-xs">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">URL do arquivo (PDF)</Label>
            <Input
              className="h-8 text-xs"
              type="url"
              placeholder="https://..."
              value={form.file_url}
              onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddProposal}
              disabled={addProposalMutation.isPending}
            >
              {addProposalMutation.isPending ? 'Salvando...' : 'Salvar proposta'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAddingProposal(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de propostas */}
      {proposals.length === 0 && !addingProposal && (
        <p className="text-xs text-muted-foreground">Nenhuma proposta registrada.</p>
      )}

      <div className="space-y-2">
        {proposals.map((proposal) => {
          const statusCfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.draft
          const formattedValue =
            proposal.value != null
              ? proposal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : null

          return (
            <div
              key={proposal.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{proposal.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    v{proposal.version}
                  </span>
                </div>
                {formattedValue && (
                  <span className="text-[11px] text-muted-foreground">{formattedValue}</span>
                )}
              </div>
              <Badge className={cn('shrink-0 text-[11px]', statusCfg.class)}>
                {statusCfg.label}
              </Badge>
              {proposal.file_url && (
                <a
                  href={proposal.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
