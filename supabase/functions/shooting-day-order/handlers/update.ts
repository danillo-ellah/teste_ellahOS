import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema para chamada de equipe por departamento
const crewCallItemSchema = z
  .object({
    role: z.string(),
    call_time: z.string().regex(/^\d{2}:\d{2}$/, 'call_time deve estar no formato HH:MM'),
    notes: z.string().optional(),
  })
  .passthrough();

// Schema para bloco de filmagem
const filmingBlockItemSchema = z
  .object({
    block_number: z.number(),
    description: z.string(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

// Schema para entrada do elenco no dia
const castScheduleItemSchema = z
  .object({
    person_name: z.string(),
    role: z.string().optional(),
    call_time: z.string().regex(/^\d{2}:\d{2}$/, 'call_time deve estar no formato HH:MM'),
    scenes: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const updateSchema = z
  .object({
    title: z.string().min(1).max(300),
    day_number: z.number().int().positive().nullable(),
    general_location: z.string().max(500).nullable(),
    weather_summary: z.string().max(500).nullable(),
    weather_data: z.record(z.unknown()).nullable(),
    first_call: z.string().nullable(),
    production_call: z.string().nullable(),
    filming_start: z.string().nullable(),
    breakfast_time: z.string().nullable(),
    lunch_time: z.string().nullable(),
    camera_wrap: z.string().nullable(),
    deproduction: z.string().nullable(),
    crew_calls: z.array(crewCallItemSchema).nullable(),
    filming_blocks: z.array(filmingBlockItemSchema).nullable(),
    cast_schedule: z.array(castScheduleItemSchema).nullable(),
    important_info: z.string().max(5000).nullable(),
    pdf_template: z.enum(['classico', 'moderno']),
    status: z.enum(['rascunho', 'publicada', 'compartilhada']),
    pdf_url: z.string().url().nullable(),
    shared_at: z.string().nullable(),
    shooting_date_id: z.string().uuid().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

// Roles permitidos para operacoes de escrita na ordem do dia
const ALLOWED_ROLES_WRITE = ['admin', 'ceo', 'produtor_executivo', 'diretor', 'assistente_direcao'];

export async function handleUpdate(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
  // Verificacao de RBAC: apenas roles autorizados podem atualizar ordens do dia
  if (!ALLOWED_ROLES_WRITE.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para esta operacao', 403);
  }

  console.log('[shooting-day-order/update] atualizando ordem do dia', {
    odId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(updateSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se a ordem do dia existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('shooting_day_orders')
    .select('id')
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Ordem do dia nao encontrada', 404);
  }

  const { data: order, error: updateErr } = await supabase
    .from('shooting_day_orders')
    .update(validated)
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .select()
    .single();

  if (updateErr) {
    console.error('[shooting-day-order/update] erro ao atualizar ordem do dia:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[shooting-day-order/update] ordem do dia atualizada:', order.id);

  return success(order, 200, req);
}
