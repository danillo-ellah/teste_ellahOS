import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

const reorderSchema = z.object({
  phase_ids: z
    .array(z.string().uuid())
    .min(1, 'Lista de IDs nao pode ser vazia'),
});

export async function handleReorder(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[job-timeline/reorder] reordenando fases', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para reordenar fases', 403);
  }

  const body = await req.json();
  const validated = validate(reorderSchema, body);

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

  // Atualizar sort_order de cada fase na ordem recebida
  const updates = validated.phase_ids.map((id, index) =>
    supabase
      .from('job_phases')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null),
  );

  const results = await Promise.all(updates);

  // Checar se alguma atualizacao falhou
  const errors = results
    .map((r, i) => (r.error ? { index: i, id: validated.phase_ids[i], error: r.error.message } : null))
    .filter(Boolean);

  if (errors.length > 0) {
    console.error('[job-timeline/reorder] erros ao reordenar:', errors);
    throw new AppError('INTERNAL_ERROR', 'Erro ao reordenar fases', 500);
  }

  console.log('[job-timeline/reorder] reordenamento concluido para', validated.phase_ids.length, 'fases');

  return success({ reordered: validated.phase_ids.length }, 200, req);
}
