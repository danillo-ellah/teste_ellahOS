import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para criar entradas no diario
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

// Schema de validacao para criacao de entrada
const CreateDiaryEntrySchema = z.object({
  job_id: z.string().uuid(),
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  day_number: z.number().int().min(1).optional(), // auto-calculado se omitido
  weather_condition: z.enum(['sol', 'nublado', 'chuva', 'noturna']).default('sol'),
  call_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM').nullable().optional(),
  wrap_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM').nullable().optional(),
  planned_scenes: z.string().max(2000).nullable().optional(),
  filmed_scenes: z.string().max(2000).nullable().optional(),
  total_takes: z.number().int().min(0).nullable().optional(),
  observations: z.string().max(5000).nullable().optional(),
  issues: z.string().max(5000).nullable().optional(),
  highlights: z.string().max(5000).nullable().optional(),
});

/**
 * Auto-calcula o numero do dia com base na contagem de entries existentes no job.
 * Retorna o proximo numero sequencial.
 */
async function calculateDayNumber(
  client: ReturnType<typeof import('../../_shared/supabase-client.ts').getSupabaseClient>,
  jobId: string,
  tenantId: string,
): Promise<number> {
  const { count } = await client
    .from('production_diary_entries')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  return (count ?? 0) + 1;
}

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[production-diary/create] criando entrada', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para criar entradas no diario de producao',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateDiaryEntrySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que o job pertence ao tenant
  const { data: job } = await client
    .from('jobs')
    .select('id')
    .eq('id', data.job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar entrada duplicada para a mesma data
  const { data: existing } = await client
    .from('production_diary_entries')
    .select('id')
    .eq('job_id', data.job_id)
    .eq('shooting_date', data.shooting_date)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    throw new AppError(
      'CONFLICT',
      `Ja existe uma entrada no diario para a data ${data.shooting_date}`,
      409,
    );
  }

  // Auto-calcular day_number se nao fornecido
  const dayNumber = data.day_number ?? await calculateDayNumber(client, data.job_id, auth.tenantId);

  // Inserir entrada
  const insertData = {
    tenant_id: auth.tenantId,
    job_id: data.job_id,
    shooting_date: data.shooting_date,
    day_number: dayNumber,
    weather_condition: data.weather_condition,
    call_time: data.call_time ?? null,
    wrap_time: data.wrap_time ?? null,
    planned_scenes: data.planned_scenes ?? null,
    filmed_scenes: data.filmed_scenes ?? null,
    total_takes: data.total_takes ?? null,
    observations: data.observations ?? null,
    issues: data.issues ?? null,
    highlights: data.highlights ?? null,
    created_by: auth.userId,
  };

  const { data: createdEntry, error: insertError } = await client
    .from('production_diary_entries')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[production-diary/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar entrada no diario', 500, {
      detail: insertError.message,
    });
  }

  console.log('[production-diary/create] entrada criada com sucesso', { id: createdEntry.id });
  return created(createdEntry, req);
}
