import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

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
    crew_calls: z.array(z.record(z.unknown())).nullable(),
    filming_blocks: z.array(z.record(z.unknown())).nullable(),
    cast_schedule: z.array(z.record(z.unknown())).nullable(),
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

export async function handleUpdate(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
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
