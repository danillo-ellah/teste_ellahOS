'use client'

/**
 * Hook para buscar jobs do modulo de Atendimento.
 *
 * Estrategia:
 * 1. Busca todos os jobs visiveis para o usuario via API (RLS ja filtra por tenant).
 * 2. Para o role 'atendimento', filtra no frontend os jobs onde o usuario esta no job_team
 *    com role atendimento — pois a Edge Function de jobs nao expoe filtro por team_role.
 * 3. Para roles de lideranca (admin, ceo, pe, coordenador), retorna todos os jobs ativos.
 *
 * KPIs calculados localmente a partir da lista de jobs.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUserRole } from '@/hooks/useUserRole'
import { useJobs } from '@/hooks/useJobs'
import type { Job } from '@/types/jobs'

// Roles de lideranca que veem todos os jobs sem filtro de team
const LEADERSHIP_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'] as const

// Status de jobs ativos (exclui encerrados)
const ACTIVE_STATUSES = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
] as const

// Busca os job_ids em que o usuario logado esta no job_team com role atendimento
async function fetchAtendimentoJobIds(): Promise<string[]> {
  const supabase = createClient()

  // Obtem o user atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Obtem o person_id vinculado ao profile
  const { data: person } = await supabase
    .from('people')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!person?.id) return []

  // Busca job_team onde este person tem role atendimento
  const { data: teamRows } = await supabase
    .from('job_team')
    .select('job_id')
    .eq('person_id', person.id)
    .eq('role', 'atendimento')

  return (teamRows ?? []).map((r: { job_id: string }) => r.job_id)
}

export interface AtendimentoKpis {
  activeJobsCount: number
  pendingApprovalCount: number
  upcomingDeliveriesCount: number
  noInternalApprovalCount: number
}

export interface UseAtendimentoJobsResult {
  jobs: Job[]
  kpis: AtendimentoKpis
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useAtendimentoJobs(): UseAtendimentoJobsResult {
  const { role, isLoading: isRoleLoading } = useUserRole()

  const isLeadership = role !== null && (LEADERSHIP_ROLES as readonly string[]).includes(role)

  // Para lideranca: busca todos os jobs ativos (sem filtro de team)
  const { data: allJobs, isLoading: isJobsLoading, isError, refetch } = useJobs({
    status: ACTIVE_STATUSES as unknown as import('@/types/jobs').JobStatus[],
    per_page: 200,
    sort_by: 'updated_at',
    sort_order: 'desc',
  })

  // Para role atendimento: busca quais job_ids o usuario pertence com role atendimento
  const atendimentoQuery = useQuery({
    queryKey: ['atendimento-job-ids'],
    queryFn: fetchAtendimentoJobIds,
    staleTime: 60_000,
    // So executa se nao for lideranca e o role ja foi carregado
    enabled: !isRoleLoading && !isLeadership && role === 'atendimento',
  })

  const jobs = useMemo<Job[]>(() => {
    if (!allJobs) return []
    if (isLeadership) return allJobs

    // Filtro por job_ids do atendimento (role atendimento)
    if (atendimentoQuery.data) {
      const ids = new Set(atendimentoQuery.data)
      return allJobs.filter((j) => ids.has(j.id))
    }

    return []
  }, [allJobs, isLeadership, atendimentoQuery.data])

  // Calcula os KPIs a partir dos jobs filtrados
  const kpis = useMemo<AtendimentoKpis>(() => {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Jobs aguardando aprovacao do cliente (portais sao gerenciados separadamente)
    const pendingApprovalCount = jobs.filter(
      (j) => j.status === 'aguardando_aprovacao' || j.status === 'aguardando_aprovacao_final',
    ).length

    // Entregas nos proximos 7 dias
    const upcomingDeliveriesCount = jobs.filter((j) => {
      if (!j.expected_delivery_date) return false
      const d = new Date(j.expected_delivery_date)
      return d >= now && d <= in7Days
    }).length

    // Jobs sem aprovacao interna (approved_at nulo e ja passou de orcamento)
    const noInternalApprovalCount = jobs.filter((j) => {
      const passedBriefing = ![
        'briefing_recebido',
        'orcamento_elaboracao',
        'orcamento_enviado',
        'aguardando_aprovacao',
      ].includes(j.status)
      return passedBriefing && !j.approved_at
    }).length

    return {
      activeJobsCount: jobs.length,
      pendingApprovalCount,
      upcomingDeliveriesCount,
      noInternalApprovalCount,
    }
  }, [jobs])

  const isLoading =
    isRoleLoading ||
    isJobsLoading ||
    (!isLeadership && role === 'atendimento' && atendimentoQuery.isLoading)

  return { jobs, kpis, isLoading, isError, refetch }
}
