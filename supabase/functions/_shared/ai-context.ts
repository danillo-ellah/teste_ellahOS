// Construtor de contexto RAG para features de IA do ELLAHOS.
// Monta contexto dos dados do tenant para injetar nos prompts da Claude API.
// Todas as queries filtram por tenant_id e deleted_at IS NULL (isolamento total).
// internal_notes NUNCA sao incluidos nos contextos (dados sensiveis).
//
// SEGURANCA (P1-4): Todas as funcoes recebem o SupabaseClient autenticado do usuario
// (criado com ANON_KEY + Bearer token do JWT) e o usam diretamente — sem service_role.
// O RLS do banco filtra os dados pelo tenant do usuario e funciona como segunda linha
// de defesa contra vazamento entre tenants. Nao usar getServiceClient() aqui.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Interfaces exportadas
// ---------------------------------------------------------------------------

/** Contexto de um job similar (usado para estimativa de orcamento) */
export interface SimilarJobContext {
  job_id: string;
  title: string;
  code: string;
  project_type: string;
  client_segment: string | null;
  complexity_level: string | null;
  closed_value: number | null;
  production_cost: number | null;
  margin_percentage: number | null;
  deliverables_count: number;
  team_size: number;
  similarity_score: number; // 0-100
  created_at: string;
}

/** Contexto completo de um job (copilot, decupagem, analise) */
export interface JobFullContext {
  job: {
    id: string;
    code: string;
    title: string;
    project_type: string;
    client_segment: string | null;
    complexity_level: string | null;
    status: string;
    priority: string;
    briefing_text: string | null;
    tags: string[];
    media_type: string | null;
    // Datas
    briefing_date: string | null;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;
    // Financeiro (null se usuario nao tem permissao)
    closed_value: number | null;
    production_cost: number | null;
    margin_percentage: number | null;
    // URLs Drive
    drive_folder_url: string | null;
  };
  client: { id: string; name: string; segment: string | null } | null;
  team: Array<{
    person_name: string;
    role: string;
    rate: number | null;
    hiring_status: string;
  }>;
  deliverables: Array<{
    description: string;
    status: string;
    format: string | null;
  }>;
  shooting_dates: Array<{
    date: string;
    location: string | null;
    description: string | null;
  }>;
  recent_history: Array<{
    event_type: string;
    description: string;
    created_at: string;
  }>;
}

/** Metricas macro do tenant para contexto geral */
export interface TenantMetrics {
  total_jobs: number;
  active_jobs: number;
  avg_margin: number | null;
  total_revenue: number | null;
  top_project_types: Array<{ type: string; count: number }>;
  top_clients: Array<{ name: string; jobs_count: number }>;
  team_size: number;
}

/** Candidato freelancer para matching */
export interface FreelancerCandidate {
  person_id: string;
  full_name: string;
  default_role: string;
  default_rate: number | null;
  is_internal: boolean;
  total_jobs: number;
  jobs_same_type: number;
  avg_health_score: number | null;
  last_job_date: string | null;
  conflicts: Array<{
    job_code: string;
    job_title: string;
    overlap_start: string;
    overlap_end: string;
  }>;
}

// ---------------------------------------------------------------------------
// 1. getSimilarJobsContext — Jobs similares para contexto de orcamento
// ---------------------------------------------------------------------------

/**
 * Busca jobs similares (finalizados/entregues) do mesmo tenant para contexto RAG.
 * Calcula similarity_score baseado em project_type, segment, complexity e recencia.
 * Ordena por similarity_score DESC. Retorna ate `limit` resultados.
 */
export async function getSimilarJobsContext(
  client: SupabaseClient,
  tenantId: string,
  jobId: string,
  limit = 10,
): Promise<SimilarJobContext[]> {
  // Usa o cliente autenticado do usuario (com RLS ativo) — principio de menor privilegio.
  // Nao usar service_role aqui: o RLS e a segunda linha de defesa para acesso entre tenants.
  const svc = client;

  // Buscar o job alvo para extrair criterios de similaridade
  const { data: targetJob, error: targetError } = await svc
    .from('jobs')
    .select('id, project_type, client_segment, complexity_level')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (targetError || !targetJob) {
    console.error('[ai-context] falha ao buscar job alvo:', targetError?.message);
    return [];
  }

  const { project_type, client_segment: segment, complexity_level } = targetJob;

  // Como o supabase-js nao suporta SQL raw diretamente em Edge Functions,
  // montamos a logica com queries separadas e calculo de similarity_score em memoria.
  // Essa abordagem e mais resiliente e nao depende de RPCs auxiliares.

  const { data: candidateJobs, error: queryError } = await svc
    .from('jobs')
    .select(
      'id, title, code, project_type, client_segment, complexity_level, closed_value, production_cost, margin_percentage, created_at',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .neq('id', jobId)
    .in('status', ['entregue', 'finalizado'])
    .not('closed_value', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200); // buscar pool amplo para scoring

  if (queryError || !candidateJobs) {
    console.error('[ai-context] falha ao buscar jobs candidatos:', queryError?.message);
    return [];
  }

  if (candidateJobs.length === 0) {
    console.log('[ai-context] nenhum job similar encontrado para tenant', tenantId);
    return [];
  }

  // Buscar contagens de deliverables e team em batch
  const jobIds = candidateJobs.map((j: any) => j.id);

  const [deliverablesRes, teamRes] = await Promise.all([
    svc
      .from('job_deliverables')
      .select('job_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('job_id', jobIds),
    svc
      .from('job_team')
      .select('job_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('job_id', jobIds),
  ]);

  // Montar mapas de contagem
  const deliverablesCounts = new Map<string, number>();
  for (const row of deliverablesRes.data ?? []) {
    const jid = (row as any).job_id;
    deliverablesCounts.set(jid, (deliverablesCounts.get(jid) ?? 0) + 1);
  }

  const teamCounts = new Map<string, number>();
  for (const row of teamRes.data ?? []) {
    const jid = (row as any).job_id;
    teamCounts.set(jid, (teamCounts.get(jid) ?? 0) + 1);
  }

  // Calcular similarity_score para cada candidato
  const now = Date.now();
  const ONE_YEAR_MS = 365.25 * 24 * 3600 * 1000;

  const scored: SimilarJobContext[] = candidateJobs.map((j: any) => {
    let score = 0;

    // +40 se mesmo project_type
    if (j.project_type === project_type) {
      score += 40;
    }

    // +25 se mesmo client_segment (e ambos nao null)
    if (segment && j.client_segment && j.client_segment === segment) {
      score += 25;
    }

    // +20 se mesmo complexity_level (e ambos nao null)
    if (complexity_level && j.complexity_level && j.complexity_level === complexity_level) {
      score += 20;
    }

    // +15 × fator de recencia (1.0 para hoje, 0.0 para 1 ano atras ou mais)
    const ageMs = now - new Date(j.created_at).getTime();
    const recencyFactor = Math.max(0, 1 - ageMs / ONE_YEAR_MS);
    score += 15 * recencyFactor;

    // Arredondar para 1 casa decimal
    score = Math.round(score * 10) / 10;

    return {
      job_id: j.id,
      title: j.title,
      code: j.code,
      project_type: j.project_type,
      client_segment: j.client_segment,
      complexity_level: j.complexity_level,
      closed_value: j.closed_value,
      production_cost: j.production_cost,
      margin_percentage: j.margin_percentage,
      deliverables_count: deliverablesCounts.get(j.id) ?? 0,
      team_size: teamCounts.get(j.id) ?? 0,
      similarity_score: score,
      created_at: j.created_at,
    };
  });

  // Ordenar por similarity_score DESC e aplicar limit
  scored.sort((a, b) => b.similarity_score - a.similarity_score);

  const result = scored.slice(0, limit);

  console.log(
    `[ai-context] getSimilarJobsContext: ${result.length} jobs similares (de ${candidateJobs.length} candidatos) para job ${jobId}`,
  );

  return result;
}

// ---------------------------------------------------------------------------
// 2. getJobFullContext — Contexto completo de um job
// ---------------------------------------------------------------------------

/**
 * Busca contexto completo de um job para Copilot e outras features.
 * Se includeFinancials = false, campos financeiros retornam null.
 * NUNCA inclui internal_notes (dados sensiveis).
 */
export async function getJobFullContext(
  client: SupabaseClient,
  tenantId: string,
  jobId: string,
  includeFinancials = false,
): Promise<JobFullContext> {
  const svc = client;

  // Buscar job + client em paralelo com team, deliverables, shooting_dates, history
  const [jobRes, teamRes, deliverablesRes, shootingRes, historyRes] = await Promise.all([
    // Job com join no client
    svc
      .from('jobs')
      .select(
        `id, code, title, project_type, client_segment, complexity_level, status, priority_level,
         briefing_text, tags, media_type,
         briefing_date, expected_delivery_date, actual_delivery_date,
         closed_value, production_cost, margin_percentage,
         drive_folder_url,
         client_id,
         clients!jobs_client_id_fkey ( id, name, segment )`,
      )
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single(),

    // Equipe do job
    svc
      .from('job_team')
      .select(
        `role, rate, hiring_status,
         people!job_team_person_id_fkey ( full_name )`,
      )
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),

    // Entregaveis
    svc
      .from('job_deliverables')
      .select('description, status, format')
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true }),

    // Datas de filmagem
    svc
      .from('job_shooting_dates')
      .select('shooting_date, location, description')
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('shooting_date', { ascending: true }),

    // Historico recente (ultimas 20 entradas)
    svc
      .from('job_history')
      .select('event_type, description, created_at')
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (jobRes.error || !jobRes.data) {
    console.error('[ai-context] falha ao buscar job:', jobRes.error?.message);
    // Retornar contexto vazio em vez de quebrar
    return {
      job: {
        id: jobId,
        code: '',
        title: '',
        project_type: '',
        client_segment: null,
        complexity_level: null,
        status: '',
        priority: '',
        briefing_text: null,
        tags: [],
        media_type: null,
        briefing_date: null,
        expected_delivery_date: null,
        actual_delivery_date: null,
        closed_value: null,
        production_cost: null,
        margin_percentage: null,
        drive_folder_url: null,
      },
      client: null,
      team: [],
      deliverables: [],
      shooting_dates: [],
      recent_history: [],
    };
  }

  const j = jobRes.data as any;
  const clientData = j.clients;

  // Montar contexto do job (sem internal_notes)
  const jobContext: JobFullContext['job'] = {
    id: j.id,
    code: j.code,
    title: j.title,
    project_type: j.project_type,
    client_segment: j.client_segment,
    complexity_level: j.complexity_level,
    status: j.status,
    priority: j.priority_level,
    briefing_text: j.briefing_text,
    tags: j.tags ?? [],
    media_type: j.media_type,
    briefing_date: j.briefing_date,
    expected_delivery_date: j.expected_delivery_date,
    actual_delivery_date: j.actual_delivery_date,
    // Financeiros condicionais
    closed_value: includeFinancials ? j.closed_value : null,
    production_cost: includeFinancials ? j.production_cost : null,
    margin_percentage: includeFinancials ? j.margin_percentage : null,
    drive_folder_url: j.drive_folder_url,
  };

  // Montar client
  const client: JobFullContext['client'] = clientData
    ? {
        id: clientData.id,
        name: clientData.name,
        segment: clientData.segment,
      }
    : null;

  // Montar equipe
  const team: JobFullContext['team'] = (teamRes.data ?? []).map((tm: any) => ({
    person_name: tm.people?.full_name ?? 'Desconhecido',
    role: tm.role,
    rate: includeFinancials ? tm.rate : null,
    hiring_status: tm.hiring_status,
  }));

  // Montar entregaveis
  const deliverables: JobFullContext['deliverables'] = (deliverablesRes.data ?? []).map(
    (d: any) => ({
      description: d.description,
      status: d.status,
      format: d.format,
    }),
  );

  // Montar datas de filmagem
  const shooting_dates: JobFullContext['shooting_dates'] = (shootingRes.data ?? []).map(
    (sd: any) => ({
      date: sd.shooting_date,
      location: sd.location,
      description: sd.description,
    }),
  );

  // Montar historico recente
  const recent_history: JobFullContext['recent_history'] = (historyRes.data ?? []).map(
    (h: any) => ({
      event_type: h.event_type,
      description: h.description,
      created_at: h.created_at,
    }),
  );

  if (teamRes.error) {
    console.error('[ai-context] falha ao buscar equipe:', teamRes.error.message);
  }
  if (deliverablesRes.error) {
    console.error('[ai-context] falha ao buscar entregaveis:', deliverablesRes.error.message);
  }
  if (shootingRes.error) {
    console.error('[ai-context] falha ao buscar datas filmagem:', shootingRes.error.message);
  }
  if (historyRes.error) {
    console.error('[ai-context] falha ao buscar historico:', historyRes.error.message);
  }

  console.log(
    `[ai-context] getJobFullContext: job ${j.code} — team=${team.length}, deliverables=${deliverables.length}, history=${recent_history.length}`,
  );

  return {
    job: jobContext,
    client,
    team,
    deliverables,
    shooting_dates,
    recent_history,
  };
}

// ---------------------------------------------------------------------------
// 3. getTenantMetrics — Metricas macro do tenant
// ---------------------------------------------------------------------------

/**
 * Busca metricas agregadas do tenant para injecao como contexto geral nos prompts.
 * Inclui total de jobs, margem media, top project_types e top clientes.
 */
export async function getTenantMetrics(
  client: SupabaseClient,
  tenantId: string,
): Promise<TenantMetrics> {
  const svc = client;

  // Buscar todas as queries em paralelo
  const [allJobsRes, activeJobsRes, finishedJobsRes, peopleRes] = await Promise.all([
    // Total de jobs
    svc
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),

    // Jobs ativos (nao finalizados/cancelados/entregues)
    svc
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('status', 'in', '("finalizado","cancelado","entregue")'),

    // Jobs finalizados/entregues com closed_value (para metricas financeiras e top_project_types)
    svc
      .from('jobs')
      .select('id, project_type, client_id, closed_value, margin_percentage')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('status', ['finalizado', 'entregue'])
      .not('closed_value', 'is', null),

    // Total de pessoas ativas
    svc
      .from('people')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null),
  ]);

  const totalJobs = allJobsRes.count ?? 0;
  const activeJobs = activeJobsRes.count ?? 0;
  const teamSize = peopleRes.count ?? 0;

  const finishedJobs = (finishedJobsRes.data ?? []) as any[];

  // Calcular metricas financeiras a partir dos jobs finalizados
  let avgMargin: number | null = null;
  let totalRevenue: number | null = null;

  if (finishedJobs.length > 0) {
    // Total revenue
    totalRevenue = finishedJobs.reduce(
      (sum: number, j: any) => sum + (j.closed_value ?? 0),
      0,
    );

    // Margem media (apenas jobs com margin_percentage definido)
    const jobsWithMargin = finishedJobs.filter((j: any) => j.margin_percentage != null);
    if (jobsWithMargin.length > 0) {
      const sumMargin = jobsWithMargin.reduce(
        (sum: number, j: any) => sum + j.margin_percentage,
        0,
      );
      avgMargin = Math.round((sumMargin / jobsWithMargin.length) * 100) / 100;
    }
  }

  // Top 5 project_types e top 5 clientes (baseado em TODOS os jobs do tenant)
  // Buscar project_type + client_id numa unica query
  const { data: allJobsSummary } = await svc
    .from('jobs')
    .select('project_type, client_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  const typeCounts = new Map<string, number>();
  for (const j of allJobsSummary ?? []) {
    const t = (j as any).project_type;
    if (t) {
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
  }
  const topProjectTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const clientJobCounts = new Map<string, number>();
  for (const j of allJobsSummary ?? []) {
    const cid = (j as any).client_id;
    if (cid) {
      clientJobCounts.set(cid, (clientJobCounts.get(cid) ?? 0) + 1);
    }
  }

  // Pegar top 5 client_ids
  const topClientIds = Array.from(clientJobCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Buscar nomes dos top clientes
  let topClients: TenantMetrics['top_clients'] = [];
  if (topClientIds.length > 0) {
    const { data: clientNames } = await svc
      .from('clients')
      .select('id, name')
      .in(
        'id',
        topClientIds.map(([id]) => id),
      )
      .eq('tenant_id', tenantId);

    const nameMap = new Map<string, string>();
    for (const c of clientNames ?? []) {
      nameMap.set((c as any).id, (c as any).name);
    }

    topClients = topClientIds.map(([id, count]) => ({
      name: nameMap.get(id) ?? 'Cliente desconhecido',
      jobs_count: count,
    }));
  }

  console.log(
    `[ai-context] getTenantMetrics: total=${totalJobs}, ativos=${activeJobs}, revenue=${totalRevenue}, team=${teamSize}`,
  );

  return {
    total_jobs: totalJobs,
    active_jobs: activeJobs,
    avg_margin: avgMargin,
    total_revenue: totalRevenue,
    top_project_types: topProjectTypes,
    top_clients: topClients,
    team_size: teamSize,
  };
}

// ---------------------------------------------------------------------------
// 4. getFreelancerCandidates — Candidatos para matching
// ---------------------------------------------------------------------------

/**
 * Busca candidatos para um determinado role, com metricas de historico.
 * Se startDate/endDate informados, detecta conflitos de alocacao.
 * project_type e opcional — se fornecido, conta jobs_same_type.
 */
export async function getFreelancerCandidates(
  client: SupabaseClient,
  tenantId: string,
  role: string,
  startDate?: string,
  endDate?: string,
  projectType?: string,
): Promise<FreelancerCandidate[]> {
  const svc = client;

  // 1. Buscar pessoas ativas do tenant que tem o role como default_role
  //    OU que ja trabalharam nesse role (via job_team)
  const { data: peopleByDefaultRole } = await svc
    .from('people')
    .select('id, full_name, default_role, default_rate, is_internal')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .eq('default_role', role);

  // Buscar pessoas que ja trabalharam nesse role via job_team (mesmo que default_role seja diferente)
  const { data: teamByRole } = await svc
    .from('job_team')
    .select('person_id')
    .eq('tenant_id', tenantId)
    .eq('role', role)
    .is('deleted_at', null);

  // Unificar IDs de pessoas candidatas (sem duplicatas)
  const candidateIds = new Set<string>();
  const peopleMap = new Map<string, any>();

  for (const p of peopleByDefaultRole ?? []) {
    candidateIds.add((p as any).id);
    peopleMap.set((p as any).id, p);
  }

  // IDs que vieram do job_team mas nao estao no mapa ainda
  const missingIds: string[] = [];
  for (const t of teamByRole ?? []) {
    const pid = (t as any).person_id;
    if (!candidateIds.has(pid)) {
      candidateIds.add(pid);
      missingIds.push(pid);
    }
  }

  // Buscar dados das pessoas que faltam
  if (missingIds.length > 0) {
    const { data: extraPeople } = await svc
      .from('people')
      .select('id, full_name, default_role, default_rate, is_internal')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .in('id', missingIds);

    for (const p of extraPeople ?? []) {
      peopleMap.set((p as any).id, p);
    }
  }

  if (peopleMap.size === 0) {
    console.log(`[ai-context] nenhum candidato encontrado para role "${role}" no tenant ${tenantId}`);
    return [];
  }

  const allIds = Array.from(peopleMap.keys());

  // 2. Buscar metricas de job_team para cada pessoa em batch
  const { data: teamEntries } = await svc
    .from('job_team')
    .select('person_id, job_id, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .in('person_id', allIds);

  // 3. Buscar health_score dos jobs associados (para media)
  const jobIdsFromTeam = new Set<string>();
  for (const te of teamEntries ?? []) {
    jobIdsFromTeam.add((te as any).job_id);
  }

  let jobHealthMap = new Map<string, number>();
  let jobTypeMap = new Map<string, string>();

  if (jobIdsFromTeam.size > 0) {
    const { data: jobsData } = await svc
      .from('jobs')
      .select('id, health_score, project_type')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('id', Array.from(jobIdsFromTeam));

    for (const jd of jobsData ?? []) {
      jobHealthMap.set((jd as any).id, (jd as any).health_score);
      jobTypeMap.set((jd as any).id, (jd as any).project_type);
    }
  }

  // 4. Buscar conflitos de alocacao (se datas informadas)
  let conflictsMap = new Map<string, FreelancerCandidate['conflicts']>();

  if (startDate && endDate) {
    const { data: overlappingAllocs } = await svc
      .from('allocations')
      .select('people_id, allocation_start, allocation_end, job_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('people_id', allIds)
      .lte('allocation_start', endDate)
      .gte('allocation_end', startDate);

    if (overlappingAllocs && overlappingAllocs.length > 0) {
      // Buscar dados dos jobs conflitantes
      const conflictJobIds = new Set<string>();
      for (const alloc of overlappingAllocs) {
        conflictJobIds.add((alloc as any).job_id);
      }

      const { data: conflictJobs } = await svc
        .from('jobs')
        .select('id, code, title, status')
        .eq('tenant_id', tenantId)
        .in('id', Array.from(conflictJobIds))
        .not('status', 'in', '("cancelado","pausado")');

      const conflictJobMap = new Map<string, { code: string; title: string }>();
      for (const cj of conflictJobs ?? []) {
        conflictJobMap.set((cj as any).id, {
          code: (cj as any).code,
          title: (cj as any).title,
        });
      }

      // Montar conflitos por pessoa
      for (const alloc of overlappingAllocs) {
        const pid = (alloc as any).people_id;
        const jobInfo = conflictJobMap.get((alloc as any).job_id);

        // So incluir se o job conflitante nao esta cancelado/pausado
        if (!jobInfo) continue;

        // Calcular overlap real
        const overlapStart =
          (alloc as any).allocation_start > startDate
            ? (alloc as any).allocation_start
            : startDate;
        const overlapEnd =
          (alloc as any).allocation_end < endDate
            ? (alloc as any).allocation_end
            : endDate;

        if (!conflictsMap.has(pid)) {
          conflictsMap.set(pid, []);
        }
        conflictsMap.get(pid)!.push({
          job_code: jobInfo.code,
          job_title: jobInfo.title,
          overlap_start: overlapStart,
          overlap_end: overlapEnd,
        });
      }
    }
  }

  // 5. Montar resultado final
  const candidates: FreelancerCandidate[] = [];

  for (const [personId, person] of peopleMap) {
    // Filtrar entradas de job_team desta pessoa
    const personTeamEntries = (teamEntries ?? []).filter(
      (te: any) => te.person_id === personId,
    );

    const totalJobs = personTeamEntries.length;

    // jobs_same_type: contar jobs onde project_type == projectType informado
    let jobsSameType = 0;
    if (projectType) {
      for (const te of personTeamEntries) {
        const jType = jobTypeMap.get((te as any).job_id);
        if (jType === projectType) {
          jobsSameType++;
        }
      }
    }

    // avg_health_score: media dos health_scores dos jobs em que participou
    const healthScores: number[] = [];
    for (const te of personTeamEntries) {
      const hs = jobHealthMap.get((te as any).job_id);
      if (hs != null) {
        healthScores.push(hs);
      }
    }
    const avgHealthScore =
      healthScores.length > 0
        ? Math.round(
            (healthScores.reduce((sum, h) => sum + h, 0) / healthScores.length) * 100,
          ) / 100
        : null;

    // last_job_date: data mais recente de entrada no job_team
    let lastJobDate: string | null = null;
    if (personTeamEntries.length > 0) {
      const dates = personTeamEntries.map((te: any) => te.created_at).sort();
      lastJobDate = dates[dates.length - 1];
    }

    candidates.push({
      person_id: personId,
      full_name: person.full_name,
      default_role: person.default_role ?? role,
      default_rate: person.default_rate,
      is_internal: person.is_internal,
      total_jobs: totalJobs,
      jobs_same_type: jobsSameType,
      avg_health_score: avgHealthScore,
      last_job_date: lastJobDate,
      conflicts: conflictsMap.get(personId) ?? [],
    });
  }

  // Ordenar: sem conflitos primeiro, depois por total_jobs DESC
  candidates.sort((a, b) => {
    // Priorizar quem nao tem conflito
    if (a.conflicts.length === 0 && b.conflicts.length > 0) return -1;
    if (a.conflicts.length > 0 && b.conflicts.length === 0) return 1;
    // Depois por total de jobs (experiencia)
    return b.total_jobs - a.total_jobs;
  });

  console.log(
    `[ai-context] getFreelancerCandidates: ${candidates.length} candidatos para role "${role}"`,
  );

  return candidates;
}

// ---------------------------------------------------------------------------
// 5. truncateContext — Trunca texto para caber no limite de tokens
// ---------------------------------------------------------------------------

/**
 * Trunca texto para caber dentro do limite de caracteres.
 * Corta no ultimo espaco antes de maxChars e adiciona indicador de truncamento.
 */
export function truncateContext(text: string, maxChars = 8000): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Reservar espaco para o indicador de truncamento
  const suffix = '\n\n[... contexto truncado por limite de tokens]';
  const cutPoint = maxChars - suffix.length;

  if (cutPoint <= 0) {
    return suffix.trim();
  }

  // Cortar no ultimo espaco antes do cutPoint
  const truncated = text.substring(0, cutPoint);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > cutPoint * 0.5) {
    // So corta no espaco se nao perderia mais que metade do texto
    return truncated.substring(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}
