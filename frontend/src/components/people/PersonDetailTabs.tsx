'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Briefcase,
  Landmark,
  Clapperboard,
  Activity,
  Award,
  CalendarDays,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TEAM_ROLE_LABELS, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/constants'
import { TEAM_ROLES } from '@/types/jobs'
import { formatCurrency, formatDate } from '@/lib/format'
import { peopleKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { Person, UpdatePersonPayload, BankInfo } from '@/types/people'
import type { TeamRole, JobStatus } from '@/types/jobs'

// --- Tipos internos da aba Jobs ---

interface PersonJobHistoryItem {
  role: TeamRole | null
  allocation_start: string | null
  allocation_end: string | null
  job_id: string
  job_code: string | null
  job_title: string | null
  job_status: JobStatus | null
}

// --- Query de historico de jobs via Supabase direto ---

async function fetchPersonJobHistory(personId: string): Promise<PersonJobHistoryItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_team')
    .select(`
      role,
      allocation_start,
      allocation_end,
      job_id,
      jobs!inner (
        id,
        code,
        title,
        status
      )
    `)
    .eq('person_id', personId)
    .is('deleted_at', null)
    .order('allocation_start', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as Array<{
    role: TeamRole | null
    allocation_start: string | null
    allocation_end: string | null
    job_id: string
    jobs: {
      id: string
      code: string | null
      title: string | null
      status: JobStatus | null
    }
  }>).map((row) => ({
    role: row.role,
    allocation_start: row.allocation_start,
    allocation_end: row.allocation_end,
    job_id: row.job_id,
    job_code: row.jobs?.code ?? null,
    job_title: row.jobs?.title ?? null,
    job_status: row.jobs?.status ?? null,
  }))
}

function isActiveJobStatus(status: JobStatus | null): boolean {
  if (!status) return false
  return status !== 'finalizado' && status !== 'entregue' && status !== 'cancelado' && status !== 'pausado'
}

// --- Sub-componente: aba Jobs ---

function PersonJobsTab({ personId }: { personId: string }) {
  const router = useRouter()

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: peopleKeys.jobHistory(personId),
    queryFn: () => fetchPersonJobHistory(personId),
    staleTime: 60_000,
    enabled: !!personId,
  })

  // Metricas calculadas
  const metrics = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return { total: 0, active: 0, topRole: null as string | null }
    }

    const total = jobs.length
    const active = jobs.filter((j) => isActiveJobStatus(j.job_status)).length

    // Funcao mais frequente
    const roleCounts: Record<string, number> = {}
    for (const job of jobs) {
      if (job.role) {
        roleCounts[job.role] = (roleCounts[job.role] ?? 0) + 1
      }
    }
    const topRoleKey = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const topRole = topRoleKey ? (TEAM_ROLE_LABELS[topRoleKey as TeamRole] ?? topRoleKey) : null

    return { total, active, topRole }
  }, [jobs])

  // Proximas alocacoes (allocation_start >= hoje, proximos 30 dias)
  const upcomingAllocations = useMemo(() => {
    if (!jobs) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 30)

    return jobs
      .filter((j) => {
        if (!j.allocation_start) return false
        const start = new Date(j.allocation_start)
        return start >= today && start <= limit
      })
      .sort((a, b) => {
        const da = a.allocation_start ? new Date(a.allocation_start).getTime() : 0
        const db = b.allocation_start ? new Date(b.allocation_start).getTime() : 0
        return da - db
      })
      .slice(0, 5)
  }, [jobs])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeletons de metricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        {/* Skeleton de lista */}
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm">Nao foi possivel carregar os jobs desta pessoa.</p>
      </div>
    )
  }

  const hasJobs = (jobs ?? []).length > 0

  return (
    <div className="space-y-6">
      {/* Cards de metricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-zinc-500/10 p-2">
              <Briefcase className="size-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{metrics.total}</p>
              <p className="text-xs text-muted-foreground">Total de jobs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-rose-500/10 p-2">
              <Activity className="size-4 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{metrics.active}</p>
              <p className="text-xs text-muted-foreground">Jobs ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-amber-500/10 p-2">
              <Award className="size-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight line-clamp-2">
                {metrics.topRole ?? '-'}
              </p>
              <p className="text-xs text-muted-foreground">Funcao principal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini-calendario: proximas alocacoes (30 dias) */}
      <div>
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          <CalendarDays className="size-3.5" />
          Proximas alocacoes (30 dias)
        </h3>

        {upcomingAllocations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma alocacao nos proximos 30 dias.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingAllocations.map((item) => (
              <div
                key={`${item.job_id}-${item.allocation_start}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-16">
                    {formatDate(item.allocation_start)}
                  </span>
                  <span className="truncate font-medium">
                    {item.job_code ? (
                      <span className="text-muted-foreground mr-1 font-mono text-xs">
                        {item.job_code}
                      </span>
                    ) : null}
                    {item.job_title ?? 'Job sem titulo'}
                  </span>
                </div>
                {item.role && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {TEAM_ROLE_LABELS[item.role] ?? item.role}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de jobs */}
      <div>
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          <Clapperboard className="size-3.5" />
          Historico completo
        </h3>

        {!hasJobs ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Clapperboard className="size-8 opacity-30" />
            <p className="text-sm">Esta pessoa ainda nao foi alocada em nenhum job.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-28">
                      Codigo
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Titulo
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Funcao
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Periodo
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-3 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(jobs ?? []).map((item) => {
                    const statusLabel = item.job_status
                      ? (JOB_STATUS_LABELS[item.job_status] ?? item.job_status)
                      : '-'
                    const statusColor = item.job_status
                      ? JOB_STATUS_COLORS[item.job_status]
                      : undefined
                    const active = isActiveJobStatus(item.job_status)

                    return (
                      <tr
                        key={`${item.job_id}-${item.allocation_start}-${item.role}`}
                        className={cn(
                          'group transition-colors hover:bg-muted/30 cursor-pointer',
                          active && 'bg-muted/10',
                        )}
                        tabIndex={0}
                        onClick={() => router.push(`/jobs/${item.job_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            router.push(`/jobs/${item.job_id}`)
                          }
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.job_code ?? '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium line-clamp-1">
                            {item.job_title ?? 'Sem titulo'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <span className="text-muted-foreground text-xs">
                            {item.role ? (TEAM_ROLE_LABELS[item.role] ?? item.role) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {item.allocation_start || item.allocation_end
                              ? `${formatDate(item.allocation_start)} – ${formatDate(item.allocation_end)}`
                              : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={
                              statusColor
                                ? {
                                    backgroundColor: `${statusColor}18`,
                                    color: statusColor,
                                  }
                                : undefined
                            }
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/jobs/${item.job_id}`)
                            }}
                            aria-label="Abrir job"
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type TabId = 'dados' | 'profissional' | 'bancarios' | 'jobs'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dados', label: 'Dados', icon: FileText },
  { id: 'profissional', label: 'Profissional', icon: Briefcase },
  { id: 'bancarios', label: 'Bancarios', icon: Landmark },
  { id: 'jobs', label: 'Jobs', icon: Clapperboard },
]

interface PersonDetailTabsProps {
  person: Person
  isEditing: boolean
  editData: UpdatePersonPayload
  onEditChange: (data: UpdatePersonPayload) => void
}

export function PersonDetailTabs({
  person,
  isEditing,
  editData,
  onEditChange,
}: PersonDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dados')

  function getField<K extends keyof Person>(key: K): Person[K] {
    if (isEditing && key in editData) {
      return (editData as Record<string, unknown>)[key as string] as Person[K]
    }
    return person[key]
  }

  const bankInfo: BankInfo = (isEditing ? editData.bank_info : person.bank_info) ?? {}

  function updateBank(partial: Partial<BankInfo>) {
    onEditChange({
      ...editData,
      bank_info: { ...bankInfo, ...partial },
    })
  }

  return (
    <div className="mt-6">
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px overflow-x-auto" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="py-6">
        {/* Tab Dados */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Nome completo">
              {isEditing ? (
                <Input
                  value={(getField('full_name') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, full_name: e.target.value })}
                />
              ) : (
                <span className="text-sm">{person.full_name}</span>
              )}
            </Field>

            <Field label="CPF">
              {isEditing ? (
                <Input
                  value={(getField('cpf') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, cpf: e.target.value || null })}
                />
              ) : (
                <span className="text-sm tabular-nums">{person.cpf ?? '-'}</span>
              )}
            </Field>

            <Field label="RG">
              {isEditing ? (
                <Input
                  value={(getField('rg') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, rg: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.rg ?? '-'}</span>
              )}
            </Field>

            <Field label="Data de nascimento">
              {isEditing ? (
                <Input
                  type="date"
                  value={(getField('birth_date') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, birth_date: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.birth_date ?? '-'}</span>
              )}
            </Field>

            <Field label="DRT">
              {isEditing ? (
                <Input
                  value={(getField('drt') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, drt: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.drt ?? '-'}</span>
              )}
            </Field>

            <Field label="CTPS (numero)">
              {isEditing ? (
                <Input
                  value={(getField('ctps_number') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, ctps_number: e.target.value || null })}
                  placeholder="Numero da carteira"
                />
              ) : (
                <span className="text-sm tabular-nums">{person.ctps_number ?? '-'}</span>
              )}
            </Field>

            <Field label="CTPS (serie)">
              {isEditing ? (
                <Input
                  value={(getField('ctps_series') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, ctps_series: e.target.value || null })}
                  placeholder="Serie"
                />
              ) : (
                <span className="text-sm tabular-nums">{person.ctps_series ?? '-'}</span>
              )}
            </Field>

            <Field label="Email">
              {isEditing ? (
                <Input
                  type="email"
                  value={(getField('email') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, email: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.email ?? '-'}</span>
              )}
            </Field>

            <Field label="Telefone">
              {isEditing ? (
                <Input
                  value={(getField('phone') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, phone: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.phone ?? '-'}</span>
              )}
            </Field>

            <Field label="Endereco" className="md:col-span-2">
              {isEditing ? (
                <Input
                  value={(getField('address') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, address: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.address ?? '-'}</span>
              )}
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Cidade" className="col-span-2">
                {isEditing ? (
                  <Input
                    value={(getField('city') as string) ?? ''}
                    onChange={(e) => onEditChange({ ...editData, city: e.target.value || null })}
                  />
                ) : (
                  <span className="text-sm">{person.city ?? '-'}</span>
                )}
              </Field>
              <Field label="UF">
                {isEditing ? (
                  <Input
                    value={(getField('state') as string) ?? ''}
                    onChange={(e) => onEditChange({ ...editData, state: e.target.value || null })}
                    maxLength={2}
                  />
                ) : (
                  <span className="text-sm">{person.state ?? '-'}</span>
                )}
              </Field>
            </div>

            <Field label="CEP">
              {isEditing ? (
                <Input
                  value={(getField('cep') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, cep: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.cep ?? '-'}</span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Profissional */}
        {activeTab === 'profissional' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Profissao">
              {isEditing ? (
                <Input
                  value={(getField('profession') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, profession: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.profession ?? '-'}</span>
              )}
            </Field>

            <Field label="Funcao padrao">
              {isEditing ? (
                <Select
                  value={(getField('default_role') as string) ?? ''}
                  onValueChange={(v) => onEditChange({ ...editData, default_role: (v || null) as TeamRole | null })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {person.default_role ? TEAM_ROLE_LABELS[person.default_role] : '-'}
                </span>
              )}
            </Field>

            <Field label="Cache padrao (diaria)">
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editData.default_rate ?? person.default_rate ?? ''}
                  onChange={(e) => onEditChange({
                    ...editData,
                    default_rate: e.target.value ? Number(e.target.value) : null,
                  })}
                />
              ) : (
                <span className="text-sm tabular-nums">
                  {person.default_rate ? formatCurrency(person.default_rate) : '-'}
                </span>
              )}
            </Field>

            <Field label="Tipo">
              {isEditing ? (
                <label className="flex items-center gap-3 cursor-pointer select-none h-9">
                  <Switch
                    checked={getField('is_internal') as boolean}
                    onCheckedChange={(checked) => onEditChange({ ...editData, is_internal: !!checked })}
                  />
                  <span className="text-sm">
                    {(getField('is_internal') as boolean) ? 'Interno' : 'Freelancer'}
                  </span>
                </label>
              ) : (
                <span className="text-sm">
                  {person.is_internal ? 'Interno' : 'Freelancer'}
                </span>
              )}
            </Field>

            <Field label="Observacoes" className="md:col-span-2">
              {isEditing ? (
                <Textarea
                  value={(getField('notes') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, notes: e.target.value || null })}
                  rows={3}
                />
              ) : (
                <span className="text-sm whitespace-pre-wrap">{person.notes ?? '-'}</span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Bancarios */}
        {activeTab === 'bancarios' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Banco">
              {isEditing ? (
                <Input
                  value={bankInfo.bank_name ?? ''}
                  onChange={(e) => updateBank({ bank_name: e.target.value || undefined })}
                  placeholder="Ex: Itau, Nubank..."
                />
              ) : (
                <span className="text-sm">{bankInfo.bank_name ?? '-'}</span>
              )}
            </Field>

            <Field label="Agencia">
              {isEditing ? (
                <Input
                  value={bankInfo.agency ?? ''}
                  onChange={(e) => updateBank({ agency: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm tabular-nums">{bankInfo.agency ?? '-'}</span>
              )}
            </Field>

            <Field label="Conta">
              {isEditing ? (
                <Input
                  value={bankInfo.account ?? ''}
                  onChange={(e) => updateBank({ account: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm tabular-nums">{bankInfo.account ?? '-'}</span>
              )}
            </Field>

            <Field label="Tipo de conta">
              {isEditing ? (
                <Select
                  value={bankInfo.account_type ?? ''}
                  onValueChange={(v) => updateBank({ account_type: (v || undefined) as BankInfo['account_type'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupanca</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {bankInfo.account_type === 'corrente' ? 'Corrente'
                    : bankInfo.account_type === 'poupanca' ? 'Poupanca'
                    : '-'}
                </span>
              )}
            </Field>

            <Field label="Chave PIX">
              {isEditing ? (
                <Input
                  value={bankInfo.pix_key ?? ''}
                  onChange={(e) => updateBank({ pix_key: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm">{bankInfo.pix_key ?? '-'}</span>
              )}
            </Field>

            <Field label="Tipo do PIX">
              {isEditing ? (
                <Select
                  value={bankInfo.pix_type ?? ''}
                  onValueChange={(v) => updateBank({ pix_type: (v || undefined) as BankInfo['pix_type'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="chave_aleatoria">Chave aleatoria</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {bankInfo.pix_type === 'cpf' ? 'CPF'
                    : bankInfo.pix_type === 'email' ? 'Email'
                    : bankInfo.pix_type === 'telefone' ? 'Telefone'
                    : bankInfo.pix_type === 'chave_aleatoria' ? 'Chave aleatoria'
                    : '-'}
                </span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Jobs */}
        {activeTab === 'jobs' && (
          <PersonJobsTab personId={person.id} />
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  )
}
