'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Building2,
  Clapperboard,
  Loader2,
  Search,
  User,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { apiGet } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { JOB_STATUS_LABELS } from '@/lib/constants'
import type { Job, JobStatus } from '@/types/jobs'
import type { Client, ClientSegment } from '@/types/clients'

// Tipos locais para resultados da busca
interface SearchResultJob {
  id: string
  job_code: string
  title: string
  status: JobStatus
}

interface SearchResultClient {
  id: string
  name: string
  segment: ClientSegment | null
}

interface SearchResultAgency {
  id: string
  name: string
}

interface SearchResultPerson {
  id: string
  full_name: string
  default_role: string | null
}

interface SearchResults {
  jobs: SearchResultJob[]
  clients: SearchResultClient[]
  agencies: SearchResultAgency[]
  people: SearchResultPerson[]
}

const EMPTY_RESULTS: SearchResults = {
  jobs: [],
  clients: [],
  agencies: [],
  people: [],
}

const SEGMENT_LABELS: Record<string, string> = {
  automotivo: 'Automotivo',
  varejo: 'Varejo',
  fintech: 'Fintech',
  alimentos_bebidas: 'Alimentos & Bebidas',
  moda: 'Moda',
  tecnologia: 'Tecnologia',
  saude: 'Saude',
  educacao: 'Educacao',
  governo: 'Governo',
  outro: 'Outro',
}

// Sanitizar input de busca (mesmo padrao dos hooks existentes)
function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.]/g, '').trim()
}

// Funcao de busca paralela — jobs via Edge Function, resto via Supabase client
async function searchAll(term: string): Promise<SearchResults> {
  const safeTerm = sanitizeSearch(term)
  if (!safeTerm || safeTerm.length < 2) return EMPTY_RESULTS

  const supabase = createClient()

  const [jobsResult, clientsResult, agenciesResult, peopleResult] =
    await Promise.allSettled([
      // Jobs: via Edge Function (apiGet)
      apiGet<Job[]>('jobs', { search: safeTerm, per_page: '5' }).then(
        (res) =>
          (res.data ?? []).slice(0, 5).map((j) => ({
            id: j.id,
            job_code: j.job_code,
            title: j.title,
            status: j.status,
          })),
      ),

      // Clientes: via Supabase client direto
      supabase
        .from('clients')
        .select('id, name, segment')
        .is('deleted_at', null)
        .or(
          `name.ilike.%${safeTerm}%,trading_name.ilike.%${safeTerm}%,cnpj.ilike.%${safeTerm}%`,
        )
        .order('name')
        .limit(5)
        .then(({ data, error }) => {
          if (error) throw error
          return (data ?? []) as SearchResultClient[]
        }),

      // Agencias: via Supabase client direto
      supabase
        .from('agencies')
        .select('id, name')
        .is('deleted_at', null)
        .or(
          `name.ilike.%${safeTerm}%,trading_name.ilike.%${safeTerm}%,cnpj.ilike.%${safeTerm}%`,
        )
        .order('name')
        .limit(5)
        .then(({ data, error }) => {
          if (error) throw error
          return (data ?? []) as SearchResultAgency[]
        }),

      // Pessoas: via Supabase client direto
      supabase
        .from('people')
        .select('id, full_name, default_role')
        .is('deleted_at', null)
        .or(`full_name.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%`)
        .order('full_name')
        .limit(5)
        .then(({ data, error }) => {
          if (error) throw error
          return (data ?? []) as SearchResultPerson[]
        }),
    ])

  return {
    jobs: jobsResult.status === 'fulfilled' ? jobsResult.value : [],
    clients: clientsResult.status === 'fulfilled' ? clientsResult.value : [],
    agencies:
      agenciesResult.status === 'fulfilled' ? agenciesResult.value : [],
    people: peopleResult.status === 'fulfilled' ? peopleResult.value : [],
  }
}

// Labels de roles para exibicao
const ROLE_LABELS: Record<string, string> = {
  diretor: 'Diretor',
  produtor_executivo: 'Produtor Executivo',
  coordenador_producao: 'Coord. Producao',
  dop: 'DOP',
  primeiro_assistente: '1o Assistente',
  editor: 'Editor',
  colorista: 'Colorista',
  motion_designer: 'Motion Designer',
  diretor_arte: 'Dir. de Arte',
  figurinista: 'Figurinista',
  produtor_casting: 'Produtor Casting',
  produtor_locacao: 'Produtor Locacao',
  gaffer: 'Gaffer',
  som_direto: 'Som Direto',
  maquiador: 'Maquiador',
  outro: 'Outro',
}

interface CommandPaletteProps {
  /** Controle externo de abertura (Topbar pode abrir) */
  externalOpen?: boolean
  onExternalOpenChange?: (open: boolean) => void
}

export function CommandPalette({
  externalOpen,
  onExternalOpenChange,
}: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const abortRef = useRef(0) // Contador para cancelar buscas stale

  // Sincronizar com controle externo
  const isOpen = externalOpen ?? open
  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value)
      onExternalOpenChange?.(value)
      if (!value) {
        // Limpar ao fechar
        setQuery('')
        setResults(EMPTY_RESULTS)
        setIsSearching(false)
      }
    },
    [onExternalOpenChange],
  )

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleOpenChange(!isOpen)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleOpenChange])

  // Debounce da busca
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const currentSearch = ++abortRef.current

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchAll(trimmed)
        // So atualizar se esta busca ainda e a mais recente
        if (abortRef.current === currentSearch) {
          setResults(data)
        }
      } catch {
        // Silenciar erros de busca (nao travar a UI)
        if (abortRef.current === currentSearch) {
          setResults(EMPTY_RESULTS)
        }
      } finally {
        if (abortRef.current === currentSearch) {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Navegar para resultado selecionado
  function handleSelect(path: string) {
    handleOpenChange(false)
    router.push(path)
  }

  const hasResults =
    results.jobs.length > 0 ||
    results.clients.length > 0 ||
    results.agencies.length > 0 ||
    results.people.length > 0

  const showEmpty = query.trim().length >= 2 && !isSearching && !hasResults

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Busca Global"
      description="Busque por jobs, clientes, agencias ou pessoas"
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Buscar jobs, clientes, agencias, pessoas..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Loading state */}
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Buscando...
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <CommandEmpty>
            Nenhum resultado para &ldquo;{query.trim()}&rdquo;
          </CommandEmpty>
        )}

        {/* Hint inicial */}
        {query.trim().length < 2 && !isSearching && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Digite pelo menos 2 caracteres para buscar
          </div>
        )}

        {/* Resultados: Jobs */}
        {results.jobs.length > 0 && (
          <CommandGroup heading="Jobs">
            {results.jobs.map((job) => (
              <CommandItem
                key={`job-${job.id}`}
                value={`job-${job.id}-${job.job_code}-${job.title}`}
                onSelect={() => handleSelect(`/jobs/${job.id}`)}
              >
                <Clapperboard className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {job.job_code}
                  </span>
                  <span className="truncate">{job.title}</span>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Resultados: Clientes */}
        {results.clients.length > 0 && (
          <CommandGroup heading="Clientes">
            {results.clients.map((client) => (
              <CommandItem
                key={`client-${client.id}`}
                value={`client-${client.id}-${client.name}`}
                onSelect={() => handleSelect(`/clients/${client.id}`)}
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{client.name}</span>
                {client.segment && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {SEGMENT_LABELS[client.segment] ?? client.segment}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Resultados: Agencias */}
        {results.agencies.length > 0 && (
          <CommandGroup heading="Agencias">
            {results.agencies.map((agency) => (
              <CommandItem
                key={`agency-${agency.id}`}
                value={`agency-${agency.id}-${agency.name}`}
                onSelect={() => handleSelect(`/agencies/${agency.id}`)}
              >
                <Briefcase className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{agency.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Resultados: Pessoas */}
        {results.people.length > 0 && (
          <CommandGroup heading="Pessoas">
            {results.people.map((person) => (
              <CommandItem
                key={`person-${person.id}`}
                value={`person-${person.id}-${person.full_name}`}
                onSelect={() => handleSelect(`/people/${person.id}`)}
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{person.full_name}</span>
                {person.default_role && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {ROLE_LABELS[person.default_role] ?? person.default_role}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

/** Botao para abrir a Command Palette (usado no Topbar) */
export function CommandPaletteTrigger({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Busca global (Ctrl+K)"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline-flex">Buscar...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        <span className="text-xs">Ctrl</span>K
      </kbd>
    </button>
  )
}
