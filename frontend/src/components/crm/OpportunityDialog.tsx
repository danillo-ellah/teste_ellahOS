'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Check, ChevronsUpDown, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useCreateOpportunity,
  useUpdateOpportunity,
  type CreateOpportunityPayload,
  type UpdateOpportunityPayload,
  type OpportunityStage,
  type Opportunity,
} from '@/hooks/useCrm'
import { useAgencies } from '@/hooks/useAgencies'
import { useClients } from '@/hooks/useClients'
import { useContacts } from '@/hooks/useContacts'
import { safeErrorMessage } from '@/lib/api'

// ---------------------------------------------------------------------------
// Opcoes de formulario
// ---------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  { value: 'indicacao', label: 'Indicacao' },
  { value: 'site', label: 'Site' },
  { value: 'redes_sociais', label: 'Redes sociais' },
  { value: 'evento', label: 'Evento' },
  { value: 'cold_outreach', label: 'Prospecao ativa' },
  { value: 'cliente_recorrente', label: 'Cliente recorrente' },
  { value: 'outro', label: 'Outro' },
]

const PROJECT_TYPE_OPTIONS = [
  { value: 'filme_publicitario', label: 'Filme Publicitario' },
  { value: 'branded_content', label: 'Branded Content' },
  { value: 'foto', label: 'Foto' },
  { value: 'still', label: 'Still' },
  { value: 'evento', label: 'Evento' },
  { value: 'live', label: 'Live' },
  { value: 'videoclipe', label: 'Videoclipe' },
  { value: 'conteudo_digital', label: 'Conteudo Digital' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'outro', label: 'Outro' },
]

// ---------------------------------------------------------------------------
// Tipos do formulario
// ---------------------------------------------------------------------------

interface FormValues {
  title: string
  estimated_value: string
  client_budget: string
  expected_close_date: string
  response_deadline: string
  source: string
  project_type: string
  deliverable_format: string
  campaign_period: string
  notes: string
  is_competitive_bid: boolean
  competitor_count: string
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  opportunity?: Opportunity
  defaultStage?: OpportunityStage
}

// ---------------------------------------------------------------------------
// Combobox generico
// ---------------------------------------------------------------------------

interface ComboboxOption {
  id: string
  name: string
}

interface EntityComboboxProps {
  placeholder: string
  value: string | null
  onChange: (id: string | null, name: string | null) => void
  options: ComboboxOption[]
  isLoading?: boolean
  disabled?: boolean
  searchValue: string
  onSearchChange: (v: string) => void
}

function EntityCombobox({
  placeholder,
  value,
  onChange,
  options,
  isLoading,
  disabled,
  searchValue,
  onSearchChange,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedLabel = value
    ? (options.find((o) => o.id === value)?.name ?? placeholder)
    : null

  function handleSelect(id: string, name: string) {
    if (id === value) {
      onChange(null, null)
    } else {
      onChange(id, name)
    }
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null, null)
    onSearchChange('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selectedLabel && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="size-3.5 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar...`}
            value={searchValue}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum resultado.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => handleSelect(option.id, option.name)}
                    >
                      <Check
                        className={cn(
                          'mr-2 size-4',
                          value === option.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {option.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Cabecalho de secao
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Dialog principal
// ---------------------------------------------------------------------------

export function OpportunityDialog({
  open,
  onOpenChange,
  mode,
  opportunity,
  defaultStage,
}: OpportunityDialogProps) {
  const createMutation = useCreateOpportunity()
  const updateMutation = useUpdateOpportunity(opportunity?.id ?? '')

  const isPending = createMutation.isPending || updateMutation.isPending

  // --- Estado dos comboboxes (IDs + labels para display) ---
  const [agencyId, setAgencyId] = useState<string | null>(opportunity?.agency_id ?? null)
  const [clientId, setClientId] = useState<string | null>(opportunity?.client_id ?? null)
  const [contactId, setContactId] = useState<string | null>(opportunity?.contact_id ?? null)

  // --- Buscas dos comboboxes ---
  const [agencySearch, setAgencySearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')

  // --- Queries ---
  const { data: agencies, isLoading: agenciesLoading } = useAgencies(agencySearch)
  const { data: clients, isLoading: clientsLoading } = useClients(clientSearch)
  // Contatos: filtra pela agencia selecionada se houver, senao pelo cliente
  const { data: contacts, isLoading: contactsLoading } = useContacts(
    agencyId ? undefined : clientId ?? undefined,
    agencyId ?? undefined,
  )

  // Filtra contatos pelo search local (os dados ja vem filtrados por entidade)
  const filteredContacts = contacts
    ? contactSearch.trim()
      ? contacts.filter((c) =>
          c.name.toLowerCase().includes(contactSearch.toLowerCase()),
        )
      : contacts
    : []

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: buildDefaultValues(opportunity),
  })

  const watchedIsCompetitiveBid = watch('is_competitive_bid')

  // Reset quando dialog abre ou opportunity muda
  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(opportunity))
      setAgencyId(opportunity?.agency_id ?? null)
      setClientId(opportunity?.client_id ?? null)
      setContactId(opportunity?.contact_id ?? null)
      setAgencySearch('')
      setClientSearch('')
      setContactSearch('')
    }
  }, [open, opportunity, reset])

  // Limpa o contato quando a agencia muda (contato pode nao pertencer a nova agencia)
  const handleAgencyChange = useCallback(
    (id: string | null) => {
      setAgencyId(id)
      setContactId(null)
      setContactSearch('')
    },
    [],
  )

  // Limpa o contato quando o cliente muda
  const handleClientChange = useCallback(
    (id: string | null) => {
      setClientId(id)
      // Limpa contato apenas se nao houver agencia (contato pode ser da agencia)
      if (!agencyId) {
        setContactId(null)
        setContactSearch('')
      }
    },
    [agencyId],
  )

  async function onSubmit(values: FormValues) {
    const payload: CreateOpportunityPayload & UpdateOpportunityPayload = {
      title: values.title.trim(),
      stage: mode === 'create' ? (defaultStage ?? 'lead') : undefined,
      client_id: clientId ?? null,
      agency_id: agencyId ?? null,
      contact_id: contactId ?? null,
      estimated_value: values.estimated_value ? parseFloat(values.estimated_value) : null,
      client_budget: values.client_budget ? parseFloat(values.client_budget) : null,
      expected_close_date: values.expected_close_date || null,
      response_deadline: values.response_deadline || null,
      source: values.source || null,
      project_type: values.project_type || null,
      deliverable_format: values.deliverable_format.trim() || null,
      campaign_period: values.campaign_period.trim() || null,
      notes: values.notes || null,
      is_competitive_bid: values.is_competitive_bid,
      competitor_count:
        values.is_competitive_bid && values.competitor_count
          ? parseInt(values.competitor_count)
          : null,
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
        toast.success('Oportunidade criada com sucesso')
      } else {
        await updateMutation.mutateAsync(payload)
        toast.success('Oportunidade atualizada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Oportunidade' : 'Editar Oportunidade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ----------------------------------------------------------------
              Secao: Quem mandou
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Quem mandou</SectionHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Agencia */}
              <div className="space-y-1.5">
                <Label>Agencia</Label>
                <EntityCombobox
                  placeholder="Selecionar agencia..."
                  value={agencyId}
                  onChange={(id) => handleAgencyChange(id)}
                  options={agencies ?? []}
                  isLoading={agenciesLoading}
                  searchValue={agencySearch}
                  onSearchChange={setAgencySearch}
                />
              </div>

              {/* Contato */}
              <div className="space-y-1.5">
                <Label>Contato</Label>
                <EntityCombobox
                  placeholder={
                    agencyId || clientId
                      ? 'Selecionar contato...'
                      : 'Selecione agencia ou cliente primeiro'
                  }
                  value={contactId}
                  onChange={(id) => setContactId(id)}
                  options={filteredContacts.map((c) => ({ id: c.id, name: c.name }))}
                  isLoading={contactsLoading}
                  disabled={!agencyId && !clientId}
                  searchValue={contactSearch}
                  onSearchChange={setContactSearch}
                />
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <EntityCombobox
                placeholder="Selecionar cliente..."
                value={clientId}
                onChange={(id) => handleClientChange(id)}
                options={clients ?? []}
                isLoading={clientsLoading}
                searchValue={clientSearch}
                onSearchChange={setClientSearch}
              />
            </div>
          </div>

          <Separator />

          {/* ----------------------------------------------------------------
              Secao: Sobre o projeto
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Sobre o projeto</SectionHeader>

            {/* Titulo */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Titulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Campanha Produto X — Cliente Y"
                {...register('title', { required: 'Titulo e obrigatorio' })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Tipo de producao */}
              <div className="space-y-1.5">
                <Label>Tipo de producao</Label>
                <Select
                  value={watch('project_type')}
                  onValueChange={(v) => setValue('project_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Formato dos entregaveis */}
              <div className="space-y-1.5">
                <Label htmlFor="deliverable_format">Formato dos entregaveis</Label>
                <Input
                  id="deliverable_format"
                  placeholder="Ex: 30s + 15s + bumper 6s"
                  {...register('deliverable_format')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ----------------------------------------------------------------
              Secao: Valores
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Valores</SectionHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="estimated_value">Valor estimado (R$)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  {...register('estimated_value')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client_budget">Budget do cliente (R$)</Label>
                <Input
                  id="client_budget"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Budget informado pela agencia"
                  {...register('client_budget')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ----------------------------------------------------------------
              Secao: Prazo
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Prazo</SectionHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="response_deadline">
                  Retorno ate <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="response_deadline"
                  type="date"
                  {...register('response_deadline', {
                    required: 'Informe o prazo de retorno',
                  })}
                />
                {errors.response_deadline && (
                  <p className="text-xs text-destructive">
                    {errors.response_deadline.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expected_close_date">Previsao de fechamento</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  {...register('expected_close_date')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ----------------------------------------------------------------
              Secao: Concorrencia
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Concorrencia</SectionHeader>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_competitive_bid"
                checked={watchedIsCompetitiveBid}
                onCheckedChange={(checked) =>
                  setValue('is_competitive_bid', checked === true)
                }
              />
              <Label htmlFor="is_competitive_bid" className="cursor-pointer font-normal">
                E concorrencia?
              </Label>
            </div>

            {watchedIsCompetitiveBid && (
              <div className="space-y-1.5">
                <Label htmlFor="competitor_count">Quantas produtoras?</Label>
                <Input
                  id="competitor_count"
                  type="number"
                  min={1}
                  max={50}
                  placeholder="Ex: 3"
                  className="w-40"
                  {...register('competitor_count')}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* ----------------------------------------------------------------
              Secao: Outros
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <SectionHeader>Outros</SectionHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Origem */}
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select
                  value={watch('source')}
                  onValueChange={(v) => setValue('source', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Periodo da campanha */}
              <div className="space-y-1.5">
                <Label htmlFor="campaign_period">Periodo da campanha</Label>
                <Input
                  id="campaign_period"
                  placeholder="Ex: Q2 2026 / Mar-Abr"
                  {...register('campaign_period')}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Informacoes relevantes sobre a oportunidade..."
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === 'create'
                  ? 'Criando...'
                  : 'Salvando...'
                : mode === 'create'
                  ? 'Criar Oportunidade'
                  : 'Salvar Alteracoes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildDefaultValues(opportunity?: Opportunity): FormValues {
  return {
    title: opportunity?.title ?? '',
    estimated_value:
      opportunity?.estimated_value != null ? String(opportunity.estimated_value) : '',
    client_budget:
      opportunity?.client_budget != null ? String(opportunity.client_budget) : '',
    expected_close_date: opportunity?.expected_close_date ?? '',
    response_deadline: opportunity?.response_deadline ?? '',
    source: opportunity?.source ?? '',
    project_type: opportunity?.project_type ?? '',
    deliverable_format: opportunity?.deliverable_format ?? '',
    campaign_period: opportunity?.campaign_period ?? '',
    notes: opportunity?.notes ?? '',
    is_competitive_bid: opportunity?.is_competitive_bid ?? false,
    competitor_count:
      opportunity?.competitor_count != null ? String(opportunity.competitor_count) : '',
  }
}
