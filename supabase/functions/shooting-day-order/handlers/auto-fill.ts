import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Departamentos padrao para chamada de equipe quando nao ha configuracao no tenant
const DEFAULT_DEPARTMENTS = [
  'Producao',
  'Direcao',
  'Fotografia',
  'Arte',
  'Figurino',
  'Maquiagem',
  'Som',
  'Eletrica/Maquinaria',
  'Elenco',
];

// Interface de retorno do auto-fill
interface AutoFillResponse {
  shooting_date: {
    date: string | null;
    description: string | null;
    location: string | null;
  };
  weather: {
    summary: string;
    data: Record<string, unknown> | null;
  };
  suggested_crew_calls: Array<{ department: string; call_time: string }>;
  scenes: Array<{
    id: string;
    scene_number: number;
    title: string | null;
    shot_type: string | null;
    location: string | null;
    cast_notes: string | null;
    mood_references: string[];
  }>;
  cast: Array<{
    cast_id: string;
    name: string;
    character: string | null;
    phone: string | null;
  }>;
  locations: Array<{ name: string; address: string | null }>;
  important_info: string;
  tenant: {
    logo_url: string | null;
    brand_color: string | null;
    company_name: string | null;
  };
}

// Busca previsao do tempo via OpenWeather para uma cidade e data especificas
async function fetchWeatherForDate(
  location: string,
  targetDate: string,
  apiKey: string,
): Promise<{ summary: string; data: Record<string, unknown> | null }> {
  try {
    // Geocodificar o nome da locacao para coordenadas
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location + ',BR')}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(8000) });

    if (!geoRes.ok) {
      console.warn('[auto-fill] OpenWeather geocode retornou status', geoRes.status);
      return { summary: 'Previsao indisponivel', data: null };
    }

    const geoData = (await geoRes.json()) as Array<{ lat: number; lon: number; name: string }>;

    if (!geoData || geoData.length === 0) {
      console.warn('[auto-fill] OpenWeather geocode: nenhuma cidade encontrada para', location);
      return { summary: 'Locacao nao encontrada na base meteorologica', data: null };
    }

    const { lat, lon } = geoData[0];

    // Buscar previsao de 5 dias com intervalos de 3h
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(8000) });

    if (!weatherRes.ok) {
      console.warn('[auto-fill] OpenWeather forecast retornou status', weatherRes.status);
      return { summary: 'Previsao indisponivel', data: null };
    }

    const weatherData = (await weatherRes.json()) as {
      list?: Array<{
        dt_txt: string;
        main: { temp_min: number; temp_max: number; humidity: number };
        weather: Array<{ description: string; icon: string }>;
        wind: { speed: number };
        pop: number;
      }>;
    };

    if (!weatherData.list || weatherData.list.length === 0) {
      return { summary: 'Previsao indisponivel', data: null };
    }

    // Filtrar previsoes para a data alvo
    const targetForecasts = weatherData.list.filter((item) =>
      item.dt_txt.startsWith(targetDate)
    );
    const forecastItems = targetForecasts.length > 0 ? targetForecasts : [weatherData.list[0]];

    // Agregar dados do dia
    const tempMin = Math.round(Math.min(...forecastItems.map((f) => f.main.temp_min)) * 10) / 10;
    const tempMax = Math.round(Math.max(...forecastItems.map((f) => f.main.temp_max)) * 10) / 10;
    const rainProbability = Math.round(Math.max(...forecastItems.map((f) => (f.pop ?? 0) * 100)));
    const windSpeedKmh =
      Math.round(Math.max(...forecastItems.map((f) => f.wind.speed)) * 3.6 * 10) / 10;

    // Usar o horario com maior probabilidade de chuva como representativo
    const representative = forecastItems.reduce(
      (prev, curr) => ((curr.pop ?? 0) > (prev.pop ?? 0) ? curr : prev),
      forecastItems[0],
    );
    const description = representative.weather[0]?.description ?? 'sem informacao';

    const summary =
      `${description.charAt(0).toUpperCase() + description.slice(1)}, ` +
      `${tempMin}°C–${tempMax}°C, ` +
      `chuva ${rainProbability}%, ` +
      `vento ${windSpeedKmh} km/h`;

    const data: Record<string, unknown> = {
      temp_min: tempMin,
      temp_max: tempMax,
      description,
      rain_probability: rainProbability,
      wind_speed_kmh: windSpeedKmh,
      humidity: Math.round(
        forecastItems.reduce((acc, f) => acc + f.main.humidity, 0) / forecastItems.length,
      ),
      icon: representative.weather[0]?.icon ?? '01d',
      source: 'openweathermap',
    };

    return { summary, data };
  } catch (err) {
    console.error('[auto-fill] erro ao consultar clima:', err);
    return { summary: 'Previsao indisponivel', data: null };
  }
}

export async function handleAutoFill(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
  console.log('[shooting-day-order/auto-fill] iniciando auto-preenchimento', {
    odId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // 1. Buscar o registro da OD para obter job_id e shooting_date_id
  const { data: od, error: odErr } = await client
    .from('shooting_day_orders')
    .select('id, job_id, shooting_date_id, tenant_id')
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (odErr) {
    console.error('[shooting-day-order/auto-fill] erro ao buscar OD:', odErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar ordem do dia', 500, {
      detail: odErr.message,
    });
  }

  if (!od) {
    throw new AppError('NOT_FOUND', 'Ordem do dia nao encontrada', 404);
  }

  const odObj = od as Record<string, unknown>;
  const jobId = odObj.job_id as string;
  const shootingDateId = odObj.shooting_date_id as string | null;

  // 2. Validar que ha uma data de filmagem vinculada
  if (!shootingDateId) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Selecione uma data de filmagem antes de auto-preencher',
      422,
    );
  }

  // 3. Buscar todas as fontes de dados em paralelo
  const [
    shootingDateResult,
    scenesResult,
    teamResult,
    castResult,
    locationsResult,
    tenantResult,
  ] = await Promise.all([
    // a. Data de filmagem
    client
      .from('job_shooting_dates')
      .select('id, shooting_date, description, call_time, wrap_time, weather')
      .eq('id', shootingDateId)
      .eq('job_id', jobId)
      .maybeSingle(),

    // b. Cenas do storyboard vinculadas a esta data de filmagem
    client
      .from('storyboard_scenes')
      .select('id, scene_number, title, shot_type, location, cast_notes, mood_references')
      .eq('job_id', jobId)
      .eq('shooting_date_id', shootingDateId)
      .eq('tenant_id', auth.tenantId)
      .order('sort_order', { ascending: true }),

    // c. Equipe do job com dados de pessoas
    client
      .from('job_team')
      .select(`
        id,
        role,
        is_responsible_producer,
        people!person_id (
          id,
          name,
          phone
        )
      `)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('is_responsible_producer', { ascending: false }),

    // d. Elenco do job
    client
      .from('job_cast')
      .select('id, name, cast_category, character_name, phone')
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .order('name', { ascending: true }),

    // e. Locacoes do job
    client
      .from('job_locations')
      .select(`
        id,
        notes,
        locations!location_id (
          id,
          name,
          address_street,
          address_number,
          address_city
        )
      `)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId),

    // f. Dados de branding do tenant
    client
      .from('tenants')
      .select('settings, logo_url, brand_color, company_name')
      .eq('id', auth.tenantId)
      .maybeSingle(),
  ]);

  // Logar erros nao-fatais sem interromper o fluxo
  if (shootingDateResult.error) {
    console.warn(
      '[shooting-day-order/auto-fill] erro ao buscar data de filmagem:',
      shootingDateResult.error.message,
    );
  }
  if (scenesResult.error) {
    console.warn(
      '[shooting-day-order/auto-fill] erro ao buscar cenas:',
      scenesResult.error.message,
    );
  }
  if (teamResult.error) {
    console.warn(
      '[shooting-day-order/auto-fill] erro ao buscar equipe:',
      teamResult.error.message,
    );
  }
  if (castResult.error) {
    console.warn(
      '[shooting-day-order/auto-fill] erro ao buscar elenco:',
      castResult.error.message,
    );
  }

  // Extrair dados de cada fonte
  const shootingDate = shootingDateResult.data as Record<string, unknown> | null;
  const scenesRaw = (scenesResult.data ?? []) as Array<Record<string, unknown>>;
  const teamRaw = (teamResult.data ?? []) as Array<Record<string, unknown>>;
  const castRaw = (castResult.data ?? []) as Array<Record<string, unknown>>;
  const tenantRaw = tenantResult.data as Record<string, unknown> | null;

  // g. Clima (opcional — nunca deve travar o auto-fill)
  let weatherResult: { summary: string; data: Record<string, unknown> | null } = {
    summary: 'Previsao indisponivel',
    data: null,
  };

  const apiKey = Deno.env.get('OPENWEATHER_API_KEY') ?? null;
  const shootingDateLocation = shootingDate?.weather as string | null ?? null;
  const shootingDateStr = shootingDate?.shooting_date as string | null ?? null;

  if (apiKey && shootingDateLocation && shootingDateStr) {
    weatherResult = await fetchWeatherForDate(shootingDateLocation, shootingDateStr, apiKey);
  } else if (!apiKey) {
    console.warn('[shooting-day-order/auto-fill] OPENWEATHER_API_KEY nao configurada, pulando clima');
  }

  // 4. Montar departamentos para chamada de equipe
  const tenantSettings = (tenantRaw?.settings as Record<string, unknown> | null) ?? null;
  const odSettings = (tenantSettings?.od_settings as Record<string, unknown> | null) ?? null;
  const defaultDepts = (odSettings?.default_departments as string[] | null) ?? DEFAULT_DEPARTMENTS;
  const importantInfoDefault = (odSettings?.safety_text as string | null) ?? '';

  const suggestedCrewCalls = defaultDepts.map((dept: string) => ({
    department: dept,
    call_time: '',
  }));

  // 5. Montar cenas formatadas
  const scenes = scenesRaw.map((scene) => ({
    id: scene.id as string,
    scene_number: (scene.scene_number as number) ?? 0,
    title: (scene.title as string | null) ?? null,
    shot_type: (scene.shot_type as string | null) ?? null,
    location: (scene.location as string | null) ?? null,
    cast_notes: (scene.cast_notes as string | null) ?? null,
    mood_references: (scene.mood_references as string[] | null) ?? [],
  }));

  // 6. Montar elenco formatado
  const cast = castRaw.map((member) => ({
    cast_id: member.id as string,
    name: (member.name as string) ?? 'Sem nome',
    character: (member.character_name as string | null) ?? null,
    phone: (member.phone as string | null) ?? null,
  }));

  // 7. Montar locacoes formatadas (com tratamento de erro para tabela ausente)
  let locations: Array<{ name: string; address: string | null }> = [];
  try {
    const locationsRaw = (locationsResult.data ?? []) as Array<Record<string, unknown>>;
    locations = locationsRaw.map((jl) => {
      const loc = jl.locations as Record<string, unknown> | null;
      const street = (loc?.address_street as string | null) ?? '';
      const number = (loc?.address_number as string | null) ?? '';
      const city = (loc?.address_city as string | null) ?? '';
      const addressParts = [street, number].filter(Boolean).join(', ');
      const fullAddress = [addressParts, city].filter(Boolean).join(' — ');
      return {
        name: (loc?.name as string) ?? 'Locacao sem nome',
        address: fullAddress || null,
      };
    });
  } catch (_locErr) {
    console.warn('[shooting-day-order/auto-fill] erro ao processar locacoes, ignorando');
  }

  // 8. Construir resposta final
  const response: AutoFillResponse = {
    shooting_date: {
      date: shootingDateStr,
      description: (shootingDate?.description as string | null) ?? null,
      location: (shootingDate?.weather as string | null) ?? null,
    },
    weather: weatherResult,
    suggested_crew_calls: suggestedCrewCalls,
    scenes,
    cast,
    locations,
    important_info: importantInfoDefault,
    tenant: {
      logo_url: (tenantRaw?.logo_url as string | null) ?? null,
      brand_color: (tenantRaw?.brand_color as string | null) ?? null,
      company_name: (tenantRaw?.company_name as string | null) ?? null,
    },
  };

  console.log('[shooting-day-order/auto-fill] auto-preenchimento concluido', {
    odId,
    jobId,
    shootingDateId,
    scenesCount: scenes.length,
    castCount: cast.length,
    locationsCount: locations.length,
    teamCount: teamRaw.length,
    weatherAvailable: weatherResult.data !== null,
  });

  return success(response, 200, req);
}
