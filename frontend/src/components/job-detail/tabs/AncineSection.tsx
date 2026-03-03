'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'
import { ImportAncineDialog } from '@/components/job-detail/tabs/ImportAncineDialog'

// --- Tipos ---

export type AncineStatus = 'pendente' | 'solicitado' | 'registrado' | 'dispensado'

interface AncineRegistration {
  crt_principal: string
  versions: Array<{ number: string; crt: string }>
  title: string
  duration: string
  type: string
  product: string
  production_year: number
  director: string
  advertiser: string
  agency: string
  production_company: string
  cnpj: string
  segment: string
  imported_at: string
}

const ANCINE_STATUS_OPTIONS: { value: AncineStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'solicitado', label: 'Solicitado — aguardando ANCINE' },
  { value: 'registrado', label: 'Registrado — CRT obtido' },
  { value: 'dispensado', label: 'Dispensado de registro' },
]

const ANCINE_STATUS_BADGE: Record<
  AncineStatus,
  { label: string; className: string }
> = {
  pendente: {
    label: 'Pendente',
    className:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  solicitado: {
    label: 'Solicitado',
    className:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  registrado: {
    label: 'Registrado',
    className:
      'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  dispensado: {
    label: 'Dispensado',
    className:
      'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  },
}

// Checklist documental — informativo (nao persiste no banco)
const CHECKLIST_ITEMS = [
  'Contrato de prestacao de servico assinado',
  'Roteiro/Storyboard aprovado',
  'Autorizacao de imagem do elenco',
  'Comprovante de pagamento CONDECINE',
  'Ficha tecnica completa',
]

// Extrair dados ANCINE do job (custom_fields + ancine_number)
function extractAncineData(job: JobDetail): {
  ancine_crt: string
  ancine_status: AncineStatus
  ancine_protocol: string
  ancine_notes: string
  ancine_registration: AncineRegistration | null
} {
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  return {
    ancine_crt: (job.ancine_number ?? '') as string,
    ancine_status: ((cf.ancine_status as string) ?? 'pendente') as AncineStatus,
    ancine_protocol: (cf.ancine_protocol as string) ?? '',
    ancine_notes: (cf.ancine_notes as string) ?? '',
    ancine_registration: (cf.ancine_registration as AncineRegistration) ?? null,
  }
}

interface AncineSectionProps {
  job: JobDetail
}

export function AncineSection({ job }: AncineSectionProps) {
  const queryClient = useQueryClient()

  // Estado inicial extraido do job
  const initial = extractAncineData(job)

  const [form, setForm] = useState(initial)
  const [checklistChecked, setChecklistChecked] = useState<boolean[]>(
    Array(CHECKLIST_ITEMS.length).fill(false),
  )
  const [showChecklist, setShowChecklist] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Detectar se houve alteracoes (para habilitar o botao Salvar)
  const isDirty =
    form.ancine_crt !== initial.ancine_crt ||
    form.ancine_status !== initial.ancine_status ||
    form.ancine_protocol !== initial.ancine_protocol ||
    form.ancine_notes !== initial.ancine_notes

  // Mutation de save
  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentCf = (job.custom_fields ?? {}) as Record<string, unknown>
      await apiMutate('jobs', 'PATCH', {
        ancine_number: form.ancine_crt || null,
        custom_fields: {
          ...currentCf,
          ancine_status: form.ancine_status,
          ancine_protocol: form.ancine_protocol || null,
          ancine_notes: form.ancine_notes || null,
        },
      }, job.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', job.id] })
      toast.success('Dados ANCINE salvos com sucesso')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Mutation "Marcar como Registrado"
  const markRegisteredMutation = useMutation({
    mutationFn: async () => {
      const currentCf = (job.custom_fields ?? {}) as Record<string, unknown>
      await apiMutate('jobs', 'PATCH', {
        ancine_number: form.ancine_crt || null,
        custom_fields: {
          ...currentCf,
          ancine_status: 'registrado',
          ancine_protocol: form.ancine_protocol || null,
          ancine_notes: form.ancine_notes || null,
        },
      }, job.id)
    },
    onSuccess: () => {
      setForm((prev) => ({ ...prev, ancine_status: 'registrado' }))
      queryClient.invalidateQueries({ queryKey: ['job', job.id] })
      toast.success('Job marcado como Registrado na ANCINE')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  const isPending = saveMutation.isPending || markRegisteredMutation.isPending
  const statusConfig = ANCINE_STATUS_BADGE[form.ancine_status]
  const isRegistrado = form.ancine_status === 'registrado'
  const checkedCount = checklistChecked.filter(Boolean).length
  const registration = initial.ancine_registration

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">ANCINE</CardTitle>
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                <Upload className="size-4 mr-1.5" />
                Importar PDF ANCINE
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!isDirty || isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="size-4 mr-1.5" />
                )}
                Salvar
              </Button>

              {form.ancine_status !== 'registrado' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  disabled={isPending || !form.ancine_crt}
                  onClick={() => markRegisteredMutation.mutate()}
                  title={
                    !form.ancine_crt
                      ? 'Preencha o numero CRT antes de marcar como registrado'
                      : undefined
                  }
                >
                  {markRegisteredMutation.isPending ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-1.5" />
                  )}
                  Marcar como Registrado
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CRT destacado quando registrado */}
          {isRegistrado && form.ancine_crt && (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
              <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-0.5">
                  Numero CRT (ANCINE)
                </p>
                <p className="font-mono text-lg font-semibold text-green-800 dark:text-green-300">
                  {form.ancine_crt}
                </p>
              </div>
            </div>
          )}

          {/* Grid de campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo CRT */}
            <div className="space-y-1.5">
              <Label htmlFor="ancine_crt">
                Numero CRT
                {isRegistrado && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    (Certificado de Registro de Titulo)
                  </span>
                )}
              </Label>
              <Input
                id="ancine_crt"
                value={form.ancine_crt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ancine_crt: e.target.value }))
                }
                placeholder="Ex: 20250044600006"
                className={cn(
                  'font-mono',
                  isRegistrado && form.ancine_crt && 'border-green-300 dark:border-green-700',
                )}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="ancine_status">Status do Registro</Label>
              <Select
                value={form.ancine_status}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, ancine_status: v as AncineStatus }))
                }
              >
                <SelectTrigger id="ancine_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANCINE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Protocolo — apenas visivel quando solicitado ou registrado */}
            {(form.ancine_status === 'solicitado' ||
              form.ancine_status === 'registrado') && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ancine_protocol">Numero do Protocolo</Label>
                <Input
                  id="ancine_protocol"
                  value={form.ancine_protocol}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      ancine_protocol: e.target.value,
                    }))
                  }
                  placeholder="Numero do protocolo da solicitacao"
                  className="font-mono"
                />
              </div>
            )}

            {/* Observacoes */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ancine_notes">Observacoes</Label>
              <Textarea
                id="ancine_notes"
                value={form.ancine_notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ancine_notes: e.target.value }))
                }
                placeholder="Anotacoes sobre o processo ANCINE, prazos, contatos etc."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Dados importados do PDF (quando registrado via import) */}
          {isRegistrado && registration && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Dados do Registro ANCINE</Label>
                {registration.imported_at && (
                  <span className="text-xs text-muted-foreground">
                    Importado em {new Date(registration.imported_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <RegField label="Titulo" value={registration.title} />
                <RegField label="Tipo" value={registration.type} />
                <RegField label="Duracao" value={registration.duration} />
                <RegField label="Ano" value={String(registration.production_year)} />
                <RegField label="Diretor" value={registration.director} />
                <RegField label="Anunciante" value={registration.advertiser} />
                <RegField label="Agencia" value={registration.agency} />
                <RegField label="Produtora" value={registration.production_company} />
                <RegField label="CNPJ" value={registration.cnpj} mono />
                <RegField label="Produto" value={registration.product} />
                <RegField label="Segmento" value={registration.segment} span2 />
              </div>

              {/* Tabela de versoes */}
              {registration.versions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Versoes ({registration.versions.length})
                  </Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Versao</th>
                          <th className="text-left p-2 font-medium">CRT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registration.versions.map((v) => (
                          <tr key={v.crt} className="border-b last:border-0">
                            <td className="p-2 font-medium">{v.number}</td>
                            <td className="p-2 font-mono text-xs">{v.crt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist documental */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              onClick={() => setShowChecklist((v) => !v)}
            >
              <span className="flex items-center gap-2">
                Documentacao obrigatoria
                <Badge variant="secondary" className="text-xs">
                  {checkedCount}/{CHECKLIST_ITEMS.length}
                </Badge>
              </span>
              {showChecklist ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {showChecklist && (
              <div className="border-t divide-y">
                {CHECKLIST_ITEMS.map((item, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors',
                      checklistChecked[idx]
                        ? 'bg-green-50 dark:bg-green-950/30'
                        : 'hover:bg-muted/40',
                    )}
                  >
                    <Checkbox
                      checked={checklistChecked[idx]}
                      onCheckedChange={(checked) => {
                        setChecklistChecked((prev) => {
                          const next = [...prev]
                          next[idx] = checked === true
                          return next
                        })
                      }}
                      className={cn(
                        checklistChecked[idx] &&
                          'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        checklistChecked[idx]
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Aviso: CRT necessario para "Marcar como Registrado" */}
          {form.ancine_status !== 'registrado' &&
            form.ancine_status !== 'dispensado' &&
            !form.ancine_crt && (
              <p className="text-xs text-muted-foreground">
                Preencha o numero CRT para poder marcar como registrado.
              </p>
            )}
        </CardContent>
      </Card>

      {/* Dialog de importacao ANCINE */}
      <ImportAncineDialog
        open={showImport}
        onOpenChange={setShowImport}
        job={job}
        onSuccess={() => {
          // Refresh form state after import
          const updated = extractAncineData(job)
          setForm(prev => ({ ...prev, ancine_status: 'registrado', ancine_crt: updated.ancine_crt || prev.ancine_crt }))
        }}
      />
    </>
  )
}

/** Campo readonly de dados do registro importado */
function RegField({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className={`truncate ${mono ? 'font-mono text-xs' : ''} ${value ? '' : 'text-muted-foreground italic'}`}>
        {value || '\u2014'}
      </p>
    </div>
  )
}
