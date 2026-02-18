'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { FormField } from '@/components/shared/FormField'
import { usePeople } from '@/hooks/usePeople'
import {
  TEAM_ROLE_LABELS,
  HIRING_STATUS_LABELS,
} from '@/lib/constants'
import { formatBRNumber, parseBRNumber } from '@/lib/format'
import { TEAM_ROLES, HIRING_STATUSES } from '@/types/jobs'
import type { JobTeamMember } from '@/types/jobs'

// --- Schema ---

const schema = z.object({
  person_id: z.string().min(1, 'Selecione uma pessoa'),
  role: z.string().min(1, 'Selecione a funcao'),
  hiring_status: z.string(),
  fee: z.string().optional(),
  is_lead_producer: z.boolean(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// --- Props ---

interface TeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: JobTeamMember // se presente, modo EDIT
  onSubmit: (data: {
    person_id: string
    role: string
    hiring_status: string
    fee: number | null
    is_lead_producer: boolean
    notes: string | null
  }) => Promise<void>
  isPending: boolean
}

export function TeamMemberDialog({
  open,
  onOpenChange,
  member,
  onSubmit,
  isPending,
}: TeamMemberDialogProps) {
  const isEdit = !!member
  const { data: people = [], isLoading: loadingPeople } = usePeople()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      person_id: '',
      role: '',
      hiring_status: 'orcado',
      fee: '',
      is_lead_producer: false,
      notes: '',
    },
  })

  // Resetar form quando abre/fecha ou member muda
  useEffect(() => {
    if (open) {
      reset({
        person_id: member?.person_id ?? '',
        role: member?.role ?? '',
        hiring_status: member?.hiring_status ?? 'orcado',
        fee: member?.fee != null ? formatBRNumber(member.fee) : '',
        is_lead_producer: member?.is_lead_producer ?? false,
        notes: member?.notes ?? '',
      })
    }
  }, [open, member, reset])

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      person_id: values.person_id,
      role: values.role,
      hiring_status: values.hiring_status,
      fee: values.fee ? parseBRNumber(values.fee) : null,
      is_lead_producer: values.is_lead_producer,
      notes: values.notes || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar membro' : 'Adicionar membro'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edite as informacoes do membro da equipe.'
              : 'Adicione uma pessoa a equipe deste job.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Pessoa */}
          <FormField
            label="Pessoa"
            required
            error={errors.person_id?.message}
          >
            <Controller
              name="person_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar pessoa..."
                  options={people}
                  isLoading={loadingPeople}
                  disabled={isEdit}
                  error={errors.person_id?.message}
                />
              )}
            />
          </FormField>

          {/* Funcao */}
          <FormField label="Funcao" required error={errors.role?.message}>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.role}>
                    <SelectValue placeholder="Selecione a funcao..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Status de contratacao */}
          <FormField label="Status de contratacao">
            <Controller
              name="hiring_status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIRING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {HIRING_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Valor */}
          <FormField label="Valor (R$)" optional>
            <Controller
              name="fee"
              control={control}
              render={({ field }) => (
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={() => {
                    const num = parseBRNumber(field.value ?? '')
                    field.onChange(num != null ? formatBRNumber(num) : '')
                  }}
                />
              )}
            />
          </FormField>

          {/* Produtor responsavel */}
          <div className="flex items-center gap-3">
            <Controller
              name="is_lead_producer"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is-lead-producer"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is-lead-producer" className="cursor-pointer">
              Produtor(a) responsavel
            </Label>
          </div>

          {/* Notas */}
          <FormField label="Notas" optional>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  rows={3}
                  placeholder="Observacoes sobre este membro..."
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending
                ? isEdit
                  ? 'Salvando...'
                  : 'Adicionando...'
                : isEdit
                  ? 'Salvar'
                  : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
