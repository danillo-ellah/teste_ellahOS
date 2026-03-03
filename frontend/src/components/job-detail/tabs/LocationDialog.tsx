'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Search, Plus, MapPin } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/shared/FormField'
import { useLocations } from '@/hooks/useJobLocations'
import { PERMIT_STATUS_LABELS, PERMIT_STATUSES } from '@/types/locations'
import type { Location, JobLocation, PermitStatus } from '@/types/locations'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

// ---- Schema do formulario ----

const schema = z
  .object({
    mode: z.enum(['existing', 'new']),
    // Selecao de locacao existente
    location_id: z.string().uuid().optional(),
    // Criacao de nova locacao
    name: z.string().optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().optional(),
    daily_rate_location: z.string().optional(),
    description: z.string().optional(),
    // Campos do vinculo (comuns a ambos os modos)
    filming_dates_raw: z.string().optional(),
    permit_status: z.enum(PERMIT_STATUSES).optional().nullable(),
    permit_notes: z.string().optional(),
    daily_rate_override: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'existing' && !data.location_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione uma locacao',
        path: ['location_id'],
      })
    }
    if (data.mode === 'new') {
      if (!data.name || data.name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nome deve ter pelo menos 2 caracteres',
          path: ['name'],
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

interface LocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  // Se for edicao de vinculo existente
  jobLocation?: JobLocation
  onSubmitLink: (data: {
    location_id?: string
    new_location?: {
      name: string
      address_street?: string | null
      address_number?: string | null
      address_city?: string | null
      address_state?: string | null
      contact_name?: string | null
      contact_phone?: string | null
      contact_email?: string | null
      daily_rate?: number | null
      description?: string | null
    }
    filming_dates: string[] | null
    permit_status: PermitStatus | null
    permit_notes: string | null
    daily_rate_override: number | null
    notes: string | null
  }) => Promise<void>
  isPending: boolean
}

// ---- Componente de selecao de datas de filmagem ----

function FilmingDatesPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (dates: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  function addDate() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed].sort())
    }
    setInputValue('')
  }

  function removeDate(date: string) {
    onChange(value.filter((d) => d !== date))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addDate()
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addDate}>
          <Plus className="size-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((date) => (
            <Badge
              key={date}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeDate(date)}
            >
              {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
              <span className="ml-1 opacity-60">x</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Dialog principal ----

export function LocationDialog({
  open,
  onOpenChange,
  jobId: _jobId,
  jobLocation,
  onSubmitLink,
  isPending,
}: LocationDialogProps) {
  const isEdit = !!jobLocation
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [filmingDates, setFilmingDates] = useState<string[]>([])

  const { data: locations, isLoading: isLoadingLocations } = useLocations(
    locationSearch.length >= 2 ? locationSearch : undefined,
  )

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'existing',
      location_id: '',
      name: '',
      address_street: '',
      address_number: '',
      address_city: '',
      address_state: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      daily_rate_location: '',
      description: '',
      filming_dates_raw: '',
      permit_status: null,
      permit_notes: '',
      daily_rate_override: '',
      notes: '',
    },
  })

  const currentMode = watch('mode')

  useEffect(() => {
    if (open) {
      if (isEdit && jobLocation) {
        // Modo edicao do vinculo
        setMode('existing')
        setFilmingDates(jobLocation.filming_dates ?? [])
        reset({
          mode: 'existing',
          location_id: jobLocation.location_id,
          permit_status: jobLocation.permit_status ?? null,
          permit_notes: jobLocation.permit_notes ?? '',
          daily_rate_override: jobLocation.daily_rate_override != null
            ? String(jobLocation.daily_rate_override)
            : '',
          notes: jobLocation.notes ?? '',
        })
        if (jobLocation.locations) {
          setSelectedLocation(jobLocation.locations as Location)
        }
      } else {
        // Modo criacao
        setMode('existing')
        setFilmingDates([])
        setSelectedLocation(null)
        setLocationSearch('')
        reset({
          mode: 'existing',
          location_id: '',
          name: '',
          address_street: '',
          address_number: '',
          address_city: '',
          address_state: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          daily_rate_location: '',
          description: '',
          permit_status: null,
          permit_notes: '',
          daily_rate_override: '',
          notes: '',
        })
      }
    }
  }, [open, isEdit, jobLocation, reset])

  function handleModeChange(newMode: 'existing' | 'new') {
    setMode(newMode)
    setValue('mode', newMode)
    setSelectedLocation(null)
  }

  function handleSelectLocation(loc: Location) {
    setSelectedLocation(loc)
    setValue('location_id', loc.id)
    setLocationPickerOpen(false)
    setLocationSearch('')
  }

  async function handleFormSubmit(values: FormValues) {
    const rateOverride = values.daily_rate_override
      ? parseFloat(values.daily_rate_override)
      : null

    if (values.mode === 'existing') {
      await onSubmitLink({
        location_id: values.location_id,
        filming_dates: filmingDates.length > 0 ? filmingDates : null,
        permit_status: (values.permit_status as PermitStatus) ?? null,
        permit_notes: values.permit_notes || null,
        daily_rate_override: rateOverride,
        notes: values.notes || null,
      })
    } else {
      const locationRate = values.daily_rate_location
        ? parseFloat(values.daily_rate_location)
        : null
      await onSubmitLink({
        new_location: {
          name: values.name!,
          address_street: values.address_street || null,
          address_number: values.address_number || null,
          address_city: values.address_city || null,
          address_state: values.address_state || null,
          contact_name: values.contact_name || null,
          contact_phone: values.contact_phone || null,
          contact_email: values.contact_email || null,
          daily_rate: locationRate,
          description: values.description || null,
        },
        filming_dates: filmingDates.length > 0 ? filmingDates : null,
        permit_status: (values.permit_status as PermitStatus) ?? null,
        permit_notes: values.permit_notes || null,
        daily_rate_override: rateOverride,
        notes: values.notes || null,
      })
    }
  }

  function buildAddress(loc: Location): string {
    const parts = [
      loc.address_street,
      loc.address_number,
      loc.address_neighborhood,
      loc.address_city,
      loc.address_state,
    ].filter(Boolean)
    return parts.join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar locacao' : 'Adicionar locacao'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edite as informacoes desta locacao no job.'
              : 'Vincule uma locacao existente ou cadastre uma nova.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">

          {/* Seletor de modo — apenas em criacao */}
          {!isEdit && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => handleModeChange('existing')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  currentMode === 'existing'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Locacao existente
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('new')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  currentMode === 'new'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Nova locacao
              </button>
            </div>
          )}

          {/* === Modo: locacao existente === */}
          {currentMode === 'existing' && (
            <FormField label="Locacao" required error={errors.location_id?.message}>
              {isEdit && selectedLocation ? (
                // Em edicao nao deixa trocar a locacao
                <div className="flex items-center gap-2 p-3 rounded-md border border-border bg-muted/40">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedLocation.name}</p>
                    {buildAddress(selectedLocation) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {buildAddress(selectedLocation)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Popover open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={locationPickerOpen}
                      className={cn(
                        'w-full justify-start font-normal',
                        !selectedLocation && 'text-muted-foreground',
                      )}
                    >
                      <Search className="size-4 mr-2 shrink-0" />
                      {selectedLocation ? (
                        <span className="truncate">{selectedLocation.name}</span>
                      ) : (
                        'Buscar locacao...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por nome ou cidade..."
                        value={locationSearch}
                        onValueChange={setLocationSearch}
                      />
                      <CommandList>
                        {isLoadingLocations && (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin mx-auto" />
                          </div>
                        )}
                        <CommandEmpty>
                          {locationSearch.length < 2
                            ? 'Digite ao menos 2 caracteres para buscar...'
                            : 'Nenhuma locacao encontrada.'}
                        </CommandEmpty>
                        {locations && locations.length > 0 && (
                          <CommandGroup>
                            {locations.map((loc) => (
                              <CommandItem
                                key={loc.id}
                                value={loc.id}
                                onSelect={() => handleSelectLocation(loc)}
                                className="flex flex-col items-start gap-0.5 py-2"
                              >
                                <span className="font-medium">{loc.name}</span>
                                {buildAddress(loc) && (
                                  <span className="text-xs text-muted-foreground">
                                    {buildAddress(loc)}
                                  </span>
                                )}
                                {loc.daily_rate != null && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(loc.daily_rate)}/dia
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </FormField>
          )}

          {/* === Modo: nova locacao === */}
          {currentMode === 'new' && (
            <>
              <FormField label="Nome da locacao" required error={errors.name?.message}>
                <Input
                  placeholder="Ex: Estudio Quanta, Praia do Leblon"
                  {...register('name')}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Cidade" optional>
                  <Input placeholder="Ex: Sao Paulo" {...register('address_city')} />
                </FormField>
                <FormField label="Estado" optional>
                  <Input placeholder="Ex: SP" {...register('address_state')} />
                </FormField>
              </div>

              <FormField label="Rua / Logradouro" optional>
                <Input placeholder="Ex: R. Augusta" {...register('address_street')} />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Numero" optional>
                  <Input placeholder="1200" {...register('address_number')} />
                </FormField>
                <FormField label="Valor diaria (R$)" optional>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    {...register('daily_rate_location')}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contato responsavel" optional>
                  <Input placeholder="Nome" {...register('contact_name')} />
                </FormField>
                <FormField label="Telefone" optional>
                  <Input placeholder="(11) 99999-9999" {...register('contact_phone')} />
                </FormField>
              </div>

              <FormField label="Descricao" optional>
                <Textarea
                  rows={2}
                  placeholder="Descricao da locacao..."
                  {...register('description')}
                />
              </FormField>
            </>
          )}

          {/* === Campos do vinculo (comuns a ambos os modos) === */}

          <div className="border-t border-border pt-4 flex flex-col gap-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dados do uso neste job
            </p>

            <FormField label="Datas de filmagem" optional>
              <FilmingDatesPicker
                value={filmingDates}
                onChange={setFilmingDates}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Status do alvara" optional>
                <Controller
                  name="permit_status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {PERMIT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PERMIT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Valor diaria neste job (R$)"
                optional
                error={errors.daily_rate_override?.message}
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Deixe vazio para usar valor padrao"
                  {...register('daily_rate_override')}
                />
              </FormField>
            </div>

            <FormField label="Obs. alvara" optional>
              <Input
                placeholder="Ex: Processo n. 12345/2026"
                {...register('permit_notes')}
              />
            </FormField>

            <FormField label="Notas do uso" optional>
              <Textarea
                rows={2}
                placeholder="Observacoes sobre o uso desta locacao no job..."
                {...register('notes')}
              />
            </FormField>
          </div>

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
                ? isEdit ? 'Salvando...' : 'Adicionando...'
                : isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
