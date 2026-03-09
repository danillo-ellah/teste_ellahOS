'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Briefcase, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { safeErrorMessage } from '@/lib/api'
import { useConvertToJob, type OpportunityDetail } from '@/hooks/useCrm'
import { PROJECT_TYPES, type ProjectType } from '@/types/jobs'
import { PROJECT_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'

interface ConvertToJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: OpportunityDetail
  onDialogClose?: () => void
}

export function ConvertToJobDialog({
  open,
  onOpenChange,
  opportunity,
  onDialogClose,
}: ConvertToJobDialogProps) {
  const router = useRouter()
  const convertMutation = useConvertToJob(opportunity.id)

  const [title, setTitle] = useState(opportunity.title)
  const [closedValue, setClosedValue] = useState(
    opportunity.estimated_value?.toString() ?? '',
  )
  const [projectType, setProjectType] = useState(
    opportunity.project_type ?? '',
  )

  async function handleConvert() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Titulo do job e obrigatorio')
      return
    }

    try {
      const result = await convertMutation.mutateAsync({
        job_title: trimmedTitle,
        project_type: projectType || undefined,
        client_id: opportunity.client_id ?? undefined,
        agency_id: opportunity.agency_id ?? undefined,
        closed_value: closedValue ? parseFloat(closedValue) : undefined,
        description: opportunity.notes ?? undefined,
        deliverable_format: opportunity.deliverable_format ?? undefined,
        campaign_period: opportunity.campaign_period ?? undefined,
      })
      toast.success(`Job "${result.data.job.title}" criado com sucesso`)
      onOpenChange(false)
      onDialogClose?.()
      router.push(`/jobs/${result.data.job.id}`)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-emerald-600" />
            Converter em Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Campos editaveis — ALTO-07: labels melhorados */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dados do Job (voce pode editar)
            </p>

            <div className="space-y-2">
              <Label htmlFor="job-title" className="text-sm">
                Titulo do job *
              </Label>
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo do job"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closed-value" className="text-sm">
                Valor fechado (R$)
              </Label>
              <Input
                id="closed-value"
                type="number"
                min={0}
                step={0.01}
                value={closedValue}
                onChange={(e) => setClosedValue(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-type" className="text-sm">
                Tipo de producao
              </Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger id="project-type">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {PROJECT_TYPE_LABELS[pt as ProjectType] ?? pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dados somente leitura */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estes dados sao copiados automaticamente para o novo job
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {opportunity.clients?.name && (
                <ReadOnlyField label="Cliente" value={opportunity.clients.name} />
              )}
              {opportunity.agencies?.name && (
                <ReadOnlyField label="Agencia" value={opportunity.agencies.name} />
              )}
              {opportunity.deliverable_format && (
                <ReadOnlyField label="Formato" value={opportunity.deliverable_format} />
              )}
              {opportunity.campaign_period && (
                <ReadOnlyField label="Periodo" value={opportunity.campaign_period} />
              )}
              {opportunity.notes && (
                <div className="col-span-2">
                  <ReadOnlyField label="Notas" value={opportunity.notes} />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <Info className="size-4 shrink-0 mt-0.5" />
            <span>
              A oportunidade ficara salva no CRM como &quot;Fechado&quot;. O job
              criado tera todos os dados copiados automaticamente. Voce sera
              redirecionado ao novo job.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending || !title.trim()}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {convertMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Briefcase className="size-4" />
            )}
            Criar Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm truncate">{value}</p>
    </div>
  )
}
