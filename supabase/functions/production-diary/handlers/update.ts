import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para atualizar entradas no diario
const ALLOWED_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'diretor_producao',
  'cco',
];

// Roles que podem editar entradas criadas por outros usuarios (RN-06)
const ROLES_EDIT_OTHERS = ['ceo', 'produtor_executivo', 'admin'];

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

// Schema de atualizacao (todos os campos opcionais — sem .strict() para permitir novos campos)
const UpdateDiaryEntrySchema = z.object({
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD').optional(),
  day_number: z.number().int().min(1).optional(),
  weather_condition: z.enum(['sol', 'nublado', 'chuva', 'noturna', 'indoor']).optional(),
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
  scenes_list: z.array(SceneItemSchema).optional(),
  day_status: z.enum(['no_cronograma', 'adiantado', 'atrasado']).nullable().optional(),
  executive_summary: z.string().max(2000).nullable().optional(),
  attendance_list: z.array(AttendanceItemSchema).optional(),
  equipment_list: z.array(EquipmentItemSchema).optional(),
  next_steps: z.string().max(5000).nullable().optional(),
  director_signature: z.string().max(200).nullable().optional(),
});

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[production-diary/update] atualizando entrada', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para atualizar entradas do diario de producao',
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

  const parseResult = UpdateDiaryEntrySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que a entrada existe e pertence ao tenant
  // Inclui created_by para validacao RN-06
  const { data: current, error: fetchError } = await client
    .from('production_diary_entries')
    .select('id, job_id, shooting_date, created_by')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Entrada do diario nao encontrada', 404);
  }

  // RN-06: usuario sem permissao de edicao de outros nao pode editar entrada de terceiro
  if (current.created_by !== auth.userId && !ROLES_EDIT_OTHERS.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Voce nao tem permissao para editar entradas criadas por outros usuarios',
      403,
    );
  }

  // Verificar conflito de data se shooting_date mudou
  if (updates.shooting_date && updates.shooting_date !== current.shooting_date) {
    const { data: conflict } = await client
      .from('production_diary_entries')
      .select('id')
      .eq('job_id', current.job_id)
      .eq('shooting_date', updates.shooting_date)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .neq('id', id)
      .maybeSingle();

    if (conflict) {
      throw new AppError(
        'CONFLICT',
        `Ja existe uma entrada no diario para a data ${updates.shooting_date}`,
        409,
      );
    }
  }

  // Validar shooting_date_id: deve pertencer ao mesmo job
  if (updates.shooting_date_id) {
    const { data: sd } = await client
      .from('job_shooting_dates')
      .select('id, job_id')
      .eq('id', updates.shooting_date_id)
      .eq('job_id', current.job_id)
      .maybeSingle();

    if (!sd) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Data de filmagem nao encontrada ou nao pertence a este job',
        400,
      );
    }
  }

  const { data: updated, error: updateError } = await client
    .from('production_diary_entries')
    .update({ ...updates, updated_by: auth.userId })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[production-diary/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar entrada do diario', 500, {
      detail: updateError.message,
    });
  }

  console.log('[production-diary/update] entrada atualizada com sucesso', { id });
  return success(updated, 200, req);
}
