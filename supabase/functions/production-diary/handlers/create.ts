import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para criar entradas no diario
const ALLOWED_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'diretor_producao',
  'cco',
];

// Regex reutilizavel para horario HH:MM
const HH_MM = z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM');

// Sub-schema: cena filmada
const SceneItemSchema = z.object({
  scene_number: z.string().min(1).max(50),
  description: z.string().max(500).nullable().optional(),
  takes: z.number().int().min(0).default(0),
  ok_take: z.number().int().min(0).nullable().optional(),
  status: z.enum(['ok', 'incompleta', 'nao_gravada']).default('ok'),
});

// Sub-schema: presenca de membro da equipe
const AttendanceItemSchema = z.object({
  person_id: z.string().uuid().nullable().optional(),
  person_name: z.string().min(1).max(200),
  role: z.string().max(100),
  present: z.boolean().default(true),
  arrival_time: HH_MM.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Sub-schema: equipamento utilizado
const EquipmentItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Schema de validacao para criacao de entrada
const CreateDiaryEntrySchema = z.object({
  job_id: z.string().uuid(),
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  day_number: z.number().int().min(1).optional(), // auto-calculado se omitido
  weather_condition: z.enum(['sol', 'nublado', 'chuva', 'noturna', 'indoor']).default('sol'),
  call_time: HH_MM.nullable().optional(),
  wrap_time: HH_MM.nullable().optional(),
  planned_scenes: z.string().max(2000).nullable().optional(),
  filmed_scenes: z.string().max(2000).nullable().optional(),
  total_takes: z.number().int().min(0).nullable().optional(),
  observations: z.string().max(5000).nullable().optional(),
  issues: z.string().max(5000).nullable().optional(),
  highlights: z.string().max(5000).nullable().optional(),
  // Campos novos Onda 2.3
  shooting_date_id: z.string().uuid().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  filming_start_time: HH_MM.nullable().optional(),
  lunch_time: HH_MM.nullable().optional(),
  scenes_list: z.array(SceneItemSchema).default([]),
  day_status: z.enum(['no_cronograma', 'adiantado', 'atrasado']).nullable().optional(),
  executive_summary: z.string().max(2000).nullable().optional(),
  attendance_list: z.array(AttendanceItemSchema).default([]),
  equipment_list: z.array(EquipmentItemSchema).default([]),
  next_steps: z.string().max(5000).nullable().optional(),
  director_signature: z.string().max(200).nullable().optional(),
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

  // Validar shooting_date_id: deve pertencer ao mesmo job
  if (data.shooting_date_id) {
    const { data: sd } = await client
      .from('job_shooting_dates')
      .select('id, job_id')
      .eq('id', data.shooting_date_id)
      .eq('job_id', data.job_id)
      .maybeSingle();

    if (!sd) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Data de filmagem nao encontrada ou nao pertence a este job',
        400,
      );
    }
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
    // Campos novos Onda 2.3
    shooting_date_id: data.shooting_date_id ?? null,
    location: data.location ?? null,
    filming_start_time: data.filming_start_time ?? null,
    lunch_time: data.lunch_time ?? null,
    scenes_list: data.scenes_list,
    day_status: data.day_status ?? null,
    executive_summary: data.executive_summary ?? null,
    attendance_list: data.attendance_list,
    equipment_list: data.equipment_list,
    next_steps: data.next_steps ?? null,
    director_signature: data.director_signature ?? null,
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
