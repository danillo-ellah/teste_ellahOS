import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

// Tipos de retorno
type AlertLevel = 'ok' | 'attention' | 'danger';

interface WeatherForecast {
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  rain_probability: number; // 0-100
}

interface WeatherAlert {
  shooting_date: string;
  location: string;
  forecast: WeatherForecast | null;
  alert_level: AlertLevel;
  alert_message: string | null;
}

interface WeatherAlertsResponse {
  data: WeatherAlert[];
  warnings: string[];
}

// Classifica nivel de alerta com base nos dados de previsao
function classifyAlertLevel(forecast: WeatherForecast): AlertLevel {
  const desc = forecast.description.toLowerCase();
  if (
    forecast.rain_probability > 70 ||
    desc.includes('chuva forte') ||
    desc.includes('tempestade') ||
    desc.includes('trovoada') ||
    desc.includes('granizo')
  ) {
    return 'danger';
  }
  if (
    forecast.rain_probability > 40 ||
    forecast.wind_speed > 30 ||
    desc.includes('chuva') ||
    desc.includes('garoa') ||
    desc.includes('ventania')
  ) {
    return 'attention';
  }
  return 'ok';
}

// Gera mensagem de alerta humanizada
function buildAlertMessage(level: AlertLevel, forecast: WeatherForecast): string | null {
  if (level === 'ok') return null;

  const parts: string[] = [];

  if (level === 'danger') {
    if (forecast.rain_probability > 70) {
      parts.push(`Alta probabilidade de chuva (${forecast.rain_probability}%)`);
    }
    if (
      forecast.description.toLowerCase().includes('tempestade') ||
      forecast.description.toLowerCase().includes('trovoada')
    ) {
      parts.push('Risco de tempestade');
    }
  } else if (level === 'attention') {
    if (forecast.rain_probability > 40) {
      parts.push(`Possibilidade de chuva (${forecast.rain_probability}%)`);
    }
    if (forecast.wind_speed > 30) {
      parts.push(`Vento forte (${forecast.wind_speed.toFixed(0)} km/h)`);
    }
  }

  return parts.length > 0 ? parts.join('. ') : `Condicao climatica: ${forecast.description}`;
}

// Busca previsao da API OpenWeather para uma cidade
async function fetchOpenWeatherForecast(
  city: string,
  targetDate: string,
  apiKey: string,
): Promise<WeatherForecast | null> {
  try {
    const encodedCity = encodeURIComponent(`${city},BR`);
    const url =
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${apiKey}&units=metric&lang=pt_br`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      console.warn(
        `[weather-alerts/check] OpenWeather retornou status ${response.status} para cidade: ${city}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      list?: Array<{
        dt: number;
        dt_txt: string;
        main: { temp_min: number; temp_max: number; humidity: number };
        weather: Array<{ description: string; icon: string }>;
        wind: { speed: number };
        pop: number; // probabilidade de precipitacao (0-1)
      }>;
    };

    if (!data.list || data.list.length === 0) return null;

    // Filtrar previsoes para a data alvo
    const targetForecasts = data.list.filter((item) => item.dt_txt.startsWith(targetDate));

    // Se nao ha previsoes para a data exata, pega o primeiro registro disponivel
    const forecastItems = targetForecasts.length > 0 ? targetForecasts : [data.list[0]];

    // Agregar: menor temp_min, maior temp_max, maior pop, maior wind_speed
    const tempMin = Math.min(...forecastItems.map((f) => f.main.temp_min));
    const tempMax = Math.max(...forecastItems.map((f) => f.main.temp_max));
    const humidity = Math.round(
      forecastItems.reduce((acc, f) => acc + f.main.humidity, 0) / forecastItems.length,
    );
    const rainProbability = Math.round(
      Math.max(...forecastItems.map((f) => (f.pop ?? 0) * 100)),
    );
    const windSpeedMs = Math.max(...forecastItems.map((f) => f.wind.speed));
    const windSpeedKmh = windSpeedMs * 3.6;

    // Usar descricao e icone do horario com maior probabilidade de chuva
    const representativeItem = forecastItems.reduce(
      (prev, curr) => ((curr.pop ?? 0) > (prev.pop ?? 0) ? curr : prev),
      forecastItems[0],
    );
    const description =
      representativeItem.weather[0]?.description ?? 'sem informacao';
    const icon = representativeItem.weather[0]?.icon ?? '01d';

    return {
      temp_min: Math.round(tempMin * 10) / 10,
      temp_max: Math.round(tempMax * 10) / 10,
      description,
      icon,
      humidity,
      wind_speed: Math.round(windSpeedKmh * 10) / 10,
      rain_probability: rainProbability,
    };
  } catch (err) {
    console.error('[weather-alerts/check] erro ao consultar OpenWeather:', err);
    return null;
  }
}

// Dados mock para quando nao ha API key configurada
function getMockForecast(date: string): WeatherForecast {
  // Gera dados deterministicos baseados na data para testes
  const dateHash = date.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rainProb = dateHash % 80; // 0-79%
  return {
    temp_min: 18 + (dateHash % 8),
    temp_max: 26 + (dateHash % 10),
    description: rainProb > 60 ? 'chuva leve' : rainProb > 30 ? 'nuvens dispersas' : 'ceu limpo',
    icon: rainProb > 60 ? '10d' : rainProb > 30 ? '02d' : '01d',
    humidity: 55 + (dateHash % 35),
    wind_speed: 5 + (dateHash % 25),
    rain_probability: rainProb,
  };
}

export async function handleCheck(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  console.log('[weather-alerts/check] verificando alertas meteorologicos', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId,
  });

  const client = getSupabaseClient(auth.token);
  const warnings: string[] = [];

  // 1. Verificar se o job pertence ao tenant
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, code, title')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (jobError) {
    console.error('[weather-alerts/check] erro ao buscar job:', jobError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do job', 500, {
      detail: jobError.message,
    });
  }

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar datas de filmagem dos proximos 7 dias
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const limitStr = sevenDaysFromNow.toISOString().split('T')[0];

  const { data: shootingDates, error: datesError } = await client
    .from('job_shooting_dates')
    .select('id, shooting_date, description')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .gte('shooting_date', todayStr)
    .lte('shooting_date', limitStr)
    .order('shooting_date', { ascending: true });

  if (datesError) {
    console.error('[weather-alerts/check] erro ao buscar datas de filmagem:', datesError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar datas de filmagem', 500, {
      detail: datesError.message,
    });
  }

  if (!shootingDates || shootingDates.length === 0) {
    console.log('[weather-alerts/check] nenhuma data de filmagem nos proximos 7 dias');
    const result: WeatherAlertsResponse = { data: [], warnings: [] };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  // 3. Buscar locacoes vinculadas ao job para extrair cidades
  let locationsByDate: Map<string, string> = new Map();

  try {
    const { data: jobLocations } = await client
      .from('job_locations')
      .select(`
        id,
        notes,
        locations!location_id (
          id,
          name,
          city,
          address
        )
      `)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId);

    if (jobLocations && jobLocations.length > 0) {
      // Mapa de locacoes disponiveis para o job (usaremos a primeira como fallback)
      const locations = (jobLocations as Array<Record<string, unknown>>).map((jl) => {
        const loc = jl.locations as Record<string, unknown> | null;
        return {
          city: (loc?.city as string | null) ?? null,
          name: (loc?.name as string) ?? 'Locacao',
          address: (loc?.address as string | null) ?? null,
        };
      });

      // Tentar extrair cidade das locacoes; usar primeira com cidade disponivel
      const primaryLocation = locations.find((l) => l.city) ?? locations[0];
      const primaryCity =
        primaryLocation?.city ??
        // Fallback: tentar extrair cidade do endereco (ultimo segmento separado por virgula)
        primaryLocation?.address?.split(',').at(-1)?.trim() ??
        null;

      if (primaryCity) {
        // Aplicar essa cidade para todas as datas de filmagem
        (shootingDates as Array<Record<string, unknown>>).forEach((sd) => {
          locationsByDate.set(sd.shooting_date as string, primaryCity);
        });
      }
    }
  } catch (_locErr) {
    console.warn('[weather-alerts/check] erro ao buscar locacoes, continuando sem cidade');
  }

  // 4. Verificar disponibilidade da API key
  const apiKey = Deno.env.get('OPENWEATHER_API_KEY') ?? null;
  const hasApiKey = Boolean(apiKey);

  if (!hasApiKey) {
    warnings.push(
      'API key do OpenWeather nao configurada (OPENWEATHER_API_KEY). Retornando dados simulados para demonstracao.',
    );
  }

  // 5. Para cada data de filmagem, buscar ou simular previsao
  const alerts: WeatherAlert[] = [];

  for (const dateRow of shootingDates as Array<Record<string, unknown>>) {
    const shootingDateStr = dateRow.shooting_date as string;
    const locationCity = locationsByDate.get(shootingDateStr) ?? null;
    const locationLabel = locationCity ?? 'Locacao nao informada';

    let forecast: WeatherForecast | null = null;

    if (hasApiKey && locationCity) {
      forecast = await fetchOpenWeatherForecast(shootingDateStr, shootingDateStr, apiKey!);
      if (!forecast) {
        warnings.push(
          `Nao foi possivel obter previsao para a cidade "${locationCity}" em ${shootingDateStr}.`,
        );
      }
    } else if (!hasApiKey) {
      // Retorna dados mock para demonstracao
      forecast = getMockForecast(shootingDateStr);
    } else if (hasApiKey && !locationCity) {
      warnings.push(
        `Data ${shootingDateStr}: nenhuma locacao com cidade informada encontrada para consulta meteorologica.`,
      );
    }

    const alertLevel = forecast ? classifyAlertLevel(forecast) : 'ok';
    const alertMessage = forecast ? buildAlertMessage(alertLevel, forecast) : null;

    alerts.push({
      shooting_date: shootingDateStr,
      location: locationLabel,
      forecast,
      alert_level: alertLevel,
      alert_message: alertMessage,
    });
  }

  const result: WeatherAlertsResponse = {
    data: alerts,
    warnings,
  };

  console.log('[weather-alerts/check] alertas gerados com sucesso', {
    jobId,
    totalDates: alerts.length,
    dangerDates: alerts.filter((a) => a.alert_level === 'danger').length,
    attentionDates: alerts.filter((a) => a.alert_level === 'attention').length,
    hasApiKey,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
