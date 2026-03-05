import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

const updateSchema = z
  .object({
    phase_key: z.string().min(1).max(100),
    phase_label: z.string().min(1).max(200),
    phase_emoji: z.string().max(10).nullable(),
    phase_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hexadecimal (ex: #F59E0B)')
      .nullable(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
      .nullable(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
      .nullable(),
    complement: z.string().max(1000).nullable(),
    skip_weekends: z.boolean(),
    sort_order: z.number().int().min(0),
    status: z.enum(['pending', 'in_progress', 'completed']),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function handleUpdate(
  req: Request,
  auth: AuthContext,
  jobId: string,
  phaseId: string,
): Promise<Response> {
  console.log('[job-timeline/update] atualizando fase', {
    jobId,
    phaseId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para editar fases', 403);
  }

  const body = await req.json();
  const validated = validate(updateSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se a fase existe, pertence ao job e ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('job_phases')
    .select('id')
    .eq('id', phaseId)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Fase nao encontrada', 404);
  }

  const { data: phase, error: updateErr } = await supabase
    .from('job_phases')
    .update(validated)
    .eq('id', phaseId)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .select()
    .single();

  if (updateErr) {
    console.error('[job-timeline/update] erro ao atualizar fase:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[job-timeline/update] fase atualizada:', phase.id);

  return success(phase, 200, req);
}
