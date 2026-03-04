import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const createSchema = z.object({
  job_id: z.string().uuid(),
  shooting_date_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(300),
  day_number: z.number().int().positive().nullable().optional(),
  general_location: z.string().max(500).nullable().optional(),
  pdf_template: z.enum(['classico', 'moderno']).default('classico'),
});

export async function handleCreate(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[shooting-day-order/create] iniciando criacao de ordem do dia', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(createSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', validated.job_id)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: order, error: insertErr } = await supabase
    .from('shooting_day_orders')
    .insert({
      job_id: validated.job_id,
      shooting_date_id: validated.shooting_date_id ?? null,
      title: validated.title,
      day_number: validated.day_number ?? null,
      general_location: validated.general_location ?? null,
      pdf_template: validated.pdf_template,
      status: 'rascunho',
      tenant_id: auth.tenantId,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[shooting-day-order/create] erro ao inserir ordem do dia:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[shooting-day-order/create] ordem do dia criada:', order.id);

  return created(order, req);
}
