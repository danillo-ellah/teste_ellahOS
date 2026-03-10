'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// --- Tipos ---

interface AuditEntry {
  id: number
  tenant_id: string
  table_name: string
  table_label: string
  record_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string | null
  user_name: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
  created_at: string
}

interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface Filters {
  table_name: string
  action: string
  user_id: string
  date_from: string
  date_to: string
  search: string
}

// --- Constantes ---

const TABLE_OPTIONS = [
  { value: 'tenants', label: 'Tenant' },
  { value: 'profiles', label: 'Usuario' },
  { value: 'clients', label: 'Cliente' },
  { value: 'agencies', label: 'Agencia' },
  { value: 'contacts', label: 'Contato' },
  { value: 'people', label: 'Pessoa' },
  { value: 'jobs', label: 'Job' },
  { value: 'job_team', label: 'Equipe do Job' },
  { value: 'job_deliverables', label: 'Entregavel' },
  { value: 'job_budgets', label: 'Orcamento' },
  { value: 'financial_records', label: 'Registro Financeiro' },
  { value: 'cost_items', label: 'Item de Custo' },
  { value: 'job_receivables', label: 'Recebivel' },
  { value: 'opportunities', label: 'Oportunidade CRM' },
  { value: 'job_files', label: 'Arquivo' },
  { value: 'tenant_invitations', label: 'Convite' },
  { value: 'payment_approval_rules', label: 'Regra de Aprovacao' },
]

const ACTION_OPTIONS = [
  { value: 'INSERT', label: 'Criacao' },
  { value: 'UPDATE', label: 'Alteracao' },
  { value: 'DELETE', label: 'Exclusao' },
]

const DATE_PRESETS = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

const PER_PAGE = 25

// --- Badges de acao ---

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Plus }> = {
    INSERT: { label: 'Criacao', variant: 'default', icon: Plus },
    UPDATE: { label: 'Alteracao', variant: 'secondary', icon: Pencil },
    DELETE: { label: 'Exclusao', variant: 'destructive', icon: Trash2 },
  }
  const c = config[action] ?? { label: action, variant: 'secondary' as const, icon: Clock }
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className="gap-1 text-xs font-normal">
      <Icon className="size-3" />
      {c.label}
    </Badge>
  )
}

// --- Dialog de detalhes ---

function DetailDialog({
  entry,
  onClose,
}: {
  entry: AuditEntry | null
  onClose: () => void
}) {
  if (!entry) return null

  return (
    <Dialog open={!!entry} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Registro #{entry.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Entidade</Label>
              <p className="font-medium">{entry.table_label}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Acao</Label>
              <div className="mt-0.5"><ActionBadge action={entry.action} /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Usuario</Label>
              <p className="font-medium">{entry.user_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data/Hora</Label>
              <p className="font-medium">
                {formatDateTime(entry.created_at)}
              </p>
            </div>
            {entry.record_id && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">ID do Registro</Label>
                <p className="font-mono text-xs">{entry.record_id}</p>
              </div>
            )}
          </div>

          {/* Campos alterados */}
          {entry.changed_fields && entry.changed_fields.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Campos alterados</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {entry.changed_fields.map((field) => (
                  <Badge key={field} variant="outline" className="text-xs font-mono">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Diff: valores antigos vs novos */}
          {entry.action === 'UPDATE' && entry.changed_fields && entry.old_data && entry.new_data && (
            <div>
              <Label className="text-xs text-muted-foreground">Alteracoes</Label>
              <div className="mt-1 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Campo</TableHead>
                      <TableHead className="w-[35%]">Antes</TableHead>
                      <TableHead className="w-[35%]">Depois</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.changed_fields.map((field) => (
                      <TableRow key={field}>
                        <TableCell className="font-mono text-xs">{field}</TableCell>
                        <TableCell className="text-xs text-muted-foreground break-all">
                          {formatValue(entry.old_data?.[field])}
                        </TableCell>
                        <TableCell className="text-xs break-all">
                          {formatValue(entry.new_data?.[field])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Para INSERT: mostrar new_data completo */}
          {entry.action === 'INSERT' && entry.new_data && (
            <div>
              <Label className="text-xs text-muted-foreground">Dados criados</Label>
              <pre className="mt-1 max-h-60 overflow-auto rounded-md border bg-muted/50 p-3 text-xs font-mono">
                {JSON.stringify(filterSensitive(entry.new_data), null, 2)}
              </pre>
            </div>
          )}

          {/* Para DELETE: mostrar old_data completo */}
          {entry.action === 'DELETE' && entry.old_data && (
            <div>
              <Label className="text-xs text-muted-foreground">Dados removidos</Label>
              <pre className="mt-1 max-h-60 overflow-auto rounded-md border bg-destructive/5 p-3 text-xs font-mono">
                {JSON.stringify(filterSensitive(entry.old_data), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Helpers ---

function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })
  } catch {
    return '-'
  }
}

function formatDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM HH:mm', { locale: ptBR })
  } catch {
    return '-'
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(vazio)'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Remover campos sensiveis do JSON exibido
function filterSensitive(data: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['encrypted_password', 'password_hash', 'token', 'secret', 'api_key']
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      filtered[key] = '[REDACTED]'
    } else {
      filtered[key] = value
    }
  }
  return filtered
}

// Resumo legivel da mudanca para a coluna "Resumo"
function summarizeChange(entry: AuditEntry): string {
  if (entry.action === 'INSERT') {
    // Para jobs, mostrar titulo se existir
    const title = entry.new_data?.title ?? entry.new_data?.full_name ?? entry.new_data?.name ?? entry.new_data?.email
    if (title) return `Criou: ${String(title).substring(0, 50)}`
    return 'Novo registro criado'
  }
  if (entry.action === 'DELETE') {
    const title = entry.old_data?.title ?? entry.old_data?.full_name ?? entry.old_data?.name ?? entry.old_data?.email
    if (title) return `Excluiu: ${String(title).substring(0, 50)}`
    return 'Registro excluido'
  }
  if (entry.action === 'UPDATE' && entry.changed_fields) {
    if (entry.changed_fields.length <= 3) {
      return `Alterou: ${entry.changed_fields.join(', ')}`
    }
    return `Alterou ${entry.changed_fields.length} campos`
  }
  return '-'
}

// --- Pagina principal ---

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    table_name: '',
    action: '',
    user_id: '',
    date_from: '',
    date_to: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)

  // Montar query params
  const buildParams = useCallback(() => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(PER_PAGE),
    }
    if (filters.table_name) params.table_name = filters.table_name
    if (filters.action) params.action = filters.action
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.search) params.search = filters.search
    return params
  }, [page, filters])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-log', page, filters],
    queryFn: () => apiGet<AuditEntry[]>('audit-log', buildParams()),
  })

  const entries: AuditEntry[] = data?.data ?? []
  const meta: PaginationMeta | undefined = (data as unknown as { meta?: PaginationMeta })?.meta

  const hasActiveFilters = !!(
    filters.table_name || filters.action || filters.user_id ||
    filters.date_from || filters.date_to || filters.search
  )

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({
      table_name: '',
      action: '',
      user_id: '',
      date_from: '',
      date_to: '',
      search: '',
    })
    setPage(1)
  }

  function handleDatePreset(days: number) {
    if (days === 0) {
      const today = new Date()
      setFilters((prev) => ({
        ...prev,
        date_from: startOfDay(today).toISOString(),
        date_to: endOfDay(today).toISOString(),
      }))
    } else {
      const from = subDays(new Date(), days)
      setFilters((prev) => ({
        ...prev,
        date_from: startOfDay(from).toISOString(),
        date_to: '',
      }))
    }
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historico de alteracoes no sistema &mdash; quem fez o que, quando
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('size-4 mr-1.5', isLoading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-4 mr-1.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-xs text-primary">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filtros</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="size-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Entidade */}
            <div className="space-y-1.5">
              <Label className="text-xs">Entidade</Label>
              <Select
                value={filters.table_name}
                onValueChange={(v) => handleFilterChange('table_name', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {TABLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Acao */}
            <div className="space-y-1.5">
              <Label className="text-xs">Acao</Label>
              <Select
                value={filters.action}
                onValueChange={(v) => handleFilterChange('action', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Periodo rapido */}
            <div className="space-y-1.5">
              <Label className="text-xs">Periodo</Label>
              <div className="flex gap-1">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs flex-1"
                    onClick={() => handleDatePreset(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Busca */}
            <div className="space-y-1.5">
              <Label className="text-xs">Busca (ID ou campo)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="UUID ou nome do campo..."
                  className="h-9 pl-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-sm text-destructive">
          Erro ao carregar audit log. Verifique suas permissoes e tente novamente.
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {hasActiveFilters
            ? 'Nenhum registro encontrado com os filtros selecionados.'
            : 'Nenhum registro de auditoria encontrado.'}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead className="w-[130px]">Usuario</TableHead>
                  <TableHead className="w-[100px]">Acao</TableHead>
                  <TableHead className="w-[140px]">Entidade</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 shrink-0" />
                        {formatDateShort(entry.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[130px]">
                      {entry.user_name}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={entry.action} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {entry.table_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {summarizeChange(entry)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginacao */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {meta.total} registros &mdash; pagina {meta.page} de {meta.total_pages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de detalhes */}
      <DetailDialog
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}
