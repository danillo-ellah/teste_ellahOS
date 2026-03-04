import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Tipos de retorno do call sheet
interface CallSheetJob {
  code: string;
  title: string;
  client_name: string | null;
  agency_name: string | null;
  director: string | null;
}

interface CallSheetDate {
  shooting_date: string | null;
  description: string | null;
  call_time: string | null;
  wrap_time: string | null;
  weather: string | null;
}

interface CallSheetTeamMember {
  name: string;
  phone: string | null;
  role: string;
  is_responsible_producer: boolean;
}

interface CallSheetScene {
  scene_number: number;
  title: string | null;
  shot_type: string | null;
  location: string | null;
  status: string;
}

interface CallSheetLocation {
  name: string;
  address: string | null;
  notes: string | null;
}

interface CallSheetResponse {
  job: CallSheetJob;
  date: CallSheetDate;
  team: CallSheetTeamMember[];
  scenes: CallSheetScene[];
  locations: CallSheetLocation[];
  notes: string | null;
}

export async function handleGenerate(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  });

  const { job_id, shooting_date_id } = body;

  if (!job_id) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  console.log('[call-sheet/generate] gerando call sheet', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId: job_id,
    shootingDateId: shooting_date_id ?? null,
  });

  const client = getSupabaseClient(auth.token);

  // 1. Buscar dados do job com cliente e agencia
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select(`
      id,
      code,
      job_aba,
      title,
      director,
      client_id,
      agency_id,
      clients!client_id (
        id,
        name
      ),
      agencies!agency_id (
        id,
        name
      )
    `)
    .eq('id', job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (jobError) {
    console.error('[call-sheet/generate] erro ao buscar job:', jobError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do job', 500, {
      detail: jobError.message,
    });
  }

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar equipe com perfis (nome e telefone)
  const { data: teamRaw, error: teamError } = await client
    .from('job_team')
    .select(`
      id,
      role,
      is_responsible_producer,
      person_id,
      people!person_id (
        id,
        name,
        phone
      )
    `)
    .eq('job_id', job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('is_responsible_producer', { ascending: false });

  if (teamError) {
    console.error('[call-sheet/generate] erro ao buscar equipe:', teamError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar equipe do job', 500, {
      detail: teamError.message,
    });
  }

  // 3. Buscar data de filmagem (especifica ou primeira futura)
  let shootingDateData: Record<string, unknown> | null = null;

  if (shooting_date_id) {
    const { data: dateRow } = await client
      .from('job_shooting_dates')
      .select('id, shooting_date, description, call_time, wrap_time, weather')
      .eq('id', shooting_date_id)
      .eq('job_id', job_id)
      .maybeSingle();
    shootingDateData = dateRow as Record<string, unknown> | null;
  } else {
    // Buscar a proxima data de filmagem futura (ou mais recente se nao houver futuras)
    const today = new Date().toISOString().split('T')[0];
    const { data: dateRow } = await client
      .from('job_shooting_dates')
      .select('id, shooting_date, description, call_time, wrap_time, weather')
      .eq('job_id', job_id)
      .eq('tenant_id', auth.tenantId)
      .gte('shooting_date', today)
      .order('shooting_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (dateRow) {
      shootingDateData = dateRow as Record<string, unknown>;
    } else {
      // Fallback: data mais recente de qualquer tipo
      const { data: fallbackRow } = await client
        .from('job_shooting_dates')
        .select('id, shooting_date, description, call_time, wrap_time, weather')
        .eq('job_id', job_id)
        .eq('tenant_id', auth.tenantId)
        .order('shooting_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      shootingDateData = fallbackRow as Record<string, unknown> | null;
    }
  }

  // 4. Buscar entrada do diario de producao para a data (se existir)
  let diaryNotes: string | null = null;
  if (shootingDateData?.shooting_date) {
    const { data: diary } = await client
      .from('production_diary_entries')
      .select('observations, id')
      .eq('job_id', job_id)
      .eq('shooting_date', shootingDateData.shooting_date)
      .is('deleted_at', null)
      .maybeSingle();
    if (diary) {
      diaryNotes = (diary.observations as string | null) ?? null;
    }
  }

  // 5. Buscar cenas do storyboard para a data especifica (se shooting_date_id fornecido)
  let scenesRaw: Array<Record<string, unknown>> = [];
  {
    let scenesQuery = client
      .from('storyboard_scenes')
      .select('id, scene_number, title, shot_type, location, status')
      .eq('job_id', job_id)
      .eq('tenant_id', auth.tenantId)
      .order('sort_order', { ascending: true });

    if (shooting_date_id) {
      scenesQuery = scenesQuery.eq('shooting_date_id', shooting_date_id);
    }

    const { data: scenesData } = await scenesQuery;
    scenesRaw = (scenesData ?? []) as Array<Record<string, unknown>>;
  }

  // 6. Buscar locacoes do job (tabela job_locations via locations EF)
  // Tenta a consulta; se a tabela nao existir, retorna array vazio sem lancar erro
  let locationsData: CallSheetLocation[] = [];
  try {
    const { data: jobLocations, error: locationsError } = await client
      .from('job_locations')
      .select(`
        id,
        notes,
        locations!location_id (
          id,
          name,
          address
        )
      `)
      .eq('job_id', job_id)
      .eq('tenant_id', auth.tenantId);

    if (!locationsError && jobLocations) {
      locationsData = (jobLocations as Array<Record<string, unknown>>).map((jl) => {
        const loc = jl.locations as Record<string, unknown> | null;
        return {
          name: (loc?.name as string) ?? 'Locacao sem nome',
          address: (loc?.address as string | null) ?? null,
          notes: (jl.notes as string | null) ?? null,
        };
      });
    }
  } catch (_locErr) {
    // Tabela pode nao existir — continua sem locacoes
    console.warn('[call-sheet/generate] tabela job_locations nao acessivel, ignorando locacoes');
  }

  // Montar resposta estruturada
  const jobObj = job as Record<string, unknown>;
  const clientObj = (jobObj.clients as Record<string, unknown> | null);
  const agencyObj = (jobObj.agencies as Record<string, unknown> | null);

  const callSheetJob: CallSheetJob = {
    code: [jobObj.code, jobObj.job_aba].filter(Boolean).join('') as string,
    title: (jobObj.title as string) ?? '',
    client_name: (clientObj?.name as string | null) ?? null,
    agency_name: (agencyObj?.name as string | null) ?? null,
    director: (jobObj.director as string | null) ?? null,
  };

  const callSheetDate: CallSheetDate = shootingDateData
    ? {
        shooting_date: (shootingDateData.shooting_date as string | null) ?? null,
        description: (shootingDateData.description as string | null) ?? null,
        call_time: (shootingDateData.call_time as string | null) ?? null,
        wrap_time: (shootingDateData.wrap_time as string | null) ?? null,
        weather: (shootingDateData.weather as string | null) ?? null,
      }
    : {
        shooting_date: null,
        description: null,
        call_time: null,
        wrap_time: null,
        weather: null,
      };

  const callSheetTeam: CallSheetTeamMember[] = (teamRaw ?? []).map((member) => {
    const memberObj = member as Record<string, unknown>;
    const person = memberObj.people as Record<string, unknown> | null;
    return {
      name: (person?.name as string) ?? 'Sem nome',
      phone: (person?.phone as string | null) ?? null,
      role: (memberObj.role as string) ?? '',
      is_responsible_producer: (memberObj.is_responsible_producer as boolean) ?? false,
    };
  });

  const callSheetScenes: CallSheetScene[] = scenesRaw.map((scene) => ({
    scene_number: (scene.scene_number as number) ?? 0,
    title: (scene.title as string | null) ?? null,
    shot_type: (scene.shot_type as string | null) ?? null,
    location: (scene.location as string | null) ?? null,
    status: (scene.status as string) ?? 'pendente',
  }));

  const response: CallSheetResponse = {
    job: callSheetJob,
    date: callSheetDate,
    team: callSheetTeam,
    scenes: callSheetScenes,
    locations: locationsData,
    notes: diaryNotes,
  };

  console.log('[call-sheet/generate] call sheet gerado com sucesso', {
    jobId: job_id,
    teamCount: callSheetTeam.length,
    scenesCount: callSheetScenes.length,
    locationsCount: locationsData.length,
  });

  return success(response, 200, req);
}
