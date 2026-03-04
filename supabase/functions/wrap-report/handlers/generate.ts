import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Tipos de retorno do wrap report
interface WrapReportJob {
  code: string;
  title: string;
}

interface WrapReportDiary {
  call_time: string | null;
  wrap_time: string | null;
  weather_condition: string | null;
  observations: string | null;
  issues: string | null;
  highlights: string | null;
}

interface WrapReportScenesSummary {
  total: number;
  filmed: number;
  approved: number;
  pending: number;
}

interface WrapReportScene {
  scene_number: number;
  title: string | null;
  status: string;
}

interface WrapReportOvertime {
  person_name: string;
  hours: number;
  type: string | null;
  notes: string | null;
}

interface WrapReportResponse {
  job: WrapReportJob;
  date: string;
  diary: WrapReportDiary | null;
  scenes_summary: WrapReportScenesSummary;
  scenes: WrapReportScene[];
  overtime: WrapReportOvertime[];
  total_overtime_hours: number;
}

export async function handleGenerate(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  });

  const { job_id, shooting_date } = body;

  if (!job_id) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }
  if (!shooting_date) {
    throw new AppError('VALIDATION_ERROR', 'shooting_date e obrigatorio (formato YYYY-MM-DD)', 400);
  }

  // Validar formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shooting_date)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'shooting_date deve estar no formato YYYY-MM-DD',
      400,
    );
  }

  console.log('[wrap-report/generate] gerando wrap report', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId: job_id,
    shootingDate: shooting_date,
  });

  const client = getSupabaseClient(auth.token);

  // 1. Buscar job (verifica acesso do tenant)
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, code, job_aba, title')
    .eq('id', job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (jobError) {
    console.error('[wrap-report/generate] erro ao buscar job:', jobError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do job', 500, {
      detail: jobError.message,
    });
  }

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const jobObj = job as Record<string, unknown>;

  // 2. Buscar entrada do diario de producao para a data
  const { data: diary } = await client
    .from('production_diary_entries')
    .select('call_time, wrap_time, weather_condition, observations, issues, highlights')
    .eq('job_id', job_id)
    .eq('shooting_date', shooting_date)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  const diaryObj = diary as Record<string, unknown> | null;
  const wrapDiary: WrapReportDiary | null = diaryObj
    ? {
        call_time: (diaryObj.call_time as string | null) ?? null,
        wrap_time: (diaryObj.wrap_time as string | null) ?? null,
        weather_condition: (diaryObj.weather_condition as string | null) ?? null,
        observations: (diaryObj.observations as string | null) ?? null,
        issues: (diaryObj.issues as string | null) ?? null,
        highlights: (diaryObj.highlights as string | null) ?? null,
      }
    : null;

  // 3. Buscar horas extras do dia (tabela time_entries, alias overtime_entries)
  // A tabela usa entry_date para filtrar por dia de trabalho
  const { data: overtimeRaw, error: overtimeError } = await client
    .from('time_entries')
    .select(`
      id,
      hours,
      entry_type,
      notes,
      job_team!team_member_id (
        id,
        role,
        person_id,
        people!person_id (
          id,
          name
        )
      )
    `)
    .eq('job_id', job_id)
    .eq('entry_date', shooting_date)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (overtimeError) {
    console.error('[wrap-report/generate] erro ao buscar horas extras:', overtimeError.message);
    // Nao lanca erro — retorna vazio e continua
  }

  const overtimeList: WrapReportOvertime[] = ((overtimeRaw ?? []) as Array<Record<string, unknown>>).map(
    (entry) => {
      const teamMember = entry.job_team as Record<string, unknown> | null;
      const person = teamMember?.people as Record<string, unknown> | null;
      return {
        person_name: (person?.name as string) ?? 'Membro desconhecido',
        hours: (entry.hours as number) ?? 0,
        type: (entry.entry_type as string | null) ?? null,
        notes: (entry.notes as string | null) ?? null,
      };
    },
  );

  const totalOvertimeHours = overtimeList.reduce((acc, e) => acc + e.hours, 0);

  // 4. Buscar cenas do storyboard com link a data de filmagem
  // Tenta buscar via shooting_date_id (data da tabela job_shooting_dates)
  let scenesRaw: Array<Record<string, unknown>> = [];

  // Primeiro tenta encontrar o shooting_date_id da data informada
  const { data: shootingDateRow } = await client
    .from('job_shooting_dates')
    .select('id')
    .eq('job_id', job_id)
    .eq('shooting_date', shooting_date)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (shootingDateRow) {
    const { data: scenes } = await client
      .from('storyboard_scenes')
      .select('scene_number, title, status')
      .eq('job_id', job_id)
      .eq('shooting_date_id', (shootingDateRow as Record<string, unknown>).id)
      .eq('tenant_id', auth.tenantId)
      .order('sort_order', { ascending: true });
    scenesRaw = (scenes ?? []) as Array<Record<string, unknown>>;
  }

  // Calcular resumo de cenas
  const scenesTotal = scenesRaw.length;
  const scenesFilmed = scenesRaw.filter((s) => s.status === 'filmada').length;
  const scenesApproved = scenesRaw.filter((s) => s.status === 'aprovada').length;
  const scenesPending = scenesRaw.filter((s) => s.status === 'pendente' || !s.status).length;

  const scenesSummary: WrapReportScenesSummary = {
    total: scenesTotal,
    filmed: scenesFilmed,
    approved: scenesApproved,
    pending: scenesPending,
  };

  const scenesList: WrapReportScene[] = scenesRaw.map((scene) => ({
    scene_number: (scene.scene_number as number) ?? 0,
    title: (scene.title as string | null) ?? null,
    status: (scene.status as string) ?? 'pendente',
  }));

  const response: WrapReportResponse = {
    job: {
      code: [jobObj.code, jobObj.job_aba].filter(Boolean).join('') as string,
      title: (jobObj.title as string) ?? '',
    },
    date: shooting_date,
    diary: wrapDiary,
    scenes_summary: scenesSummary,
    scenes: scenesList,
    overtime: overtimeList,
    total_overtime_hours: totalOvertimeHours,
  };

  console.log('[wrap-report/generate] wrap report gerado com sucesso', {
    jobId: job_id,
    shootingDate: shooting_date,
    scenesTotal,
    overtimeCount: overtimeList.length,
    totalOvertimeHours,
  });

  return success(response, 200, req);
}
