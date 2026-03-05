import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

const createSchema = z.object({
  phase_key: z.string().min(1).max(100),
  phase_label: z.string().min(1).max(200),
  phase_emoji: z.string().max(10).optional().nullable(),
  phase_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hexadecimal (ex: #F59E0B)')
    .optional()
    .nullable(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  complement: z.string().max(1000).optional().nullable(),
  skip_weekends: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
});

export async function handleCreate(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[job-timeline/create] criando fase', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar fases', 403);
  }

  const body = await req.json();
  const validated = validate(createSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: phase, error: insertErr } = await supabase
    .from('job_phases')
    .insert({
      job_id: jobId,
      tenant_id: auth.tenantId,
      phase_key: validated.phase_key,
      phase_label: validated.phase_label,
      phase_emoji: validated.phase_emoji ?? null,
      phase_color: validated.phase_color ?? null,
      start_date: validated.start_date ?? null,
      end_date: validated.end_date ?? null,
      complement: validated.complement ?? null,
      skip_weekends: validated.skip_weekends,
      sort_order: validated.sort_order,
      status: validated.status,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[job-timeline/create] erro ao inserir fase:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[job-timeline/create] fase criada:', phase.id);

  return created(phase, req);
}
