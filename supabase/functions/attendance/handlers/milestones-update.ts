import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const UpdateMilestoneSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  responsible_name: z.string().max(255).optional().nullable(),
  status: z.enum(['pendente', 'concluido', 'atrasado', 'cancelado']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  completed_at: z.string().datetime({ offset: true }).optional().nullable(),
}).strict();

export async function handleMilestonesUpdate(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/milestones-update] atualizando marco', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para atualizar marcos', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateMilestoneSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data as Record<string, unknown>;
  if (Object.keys(updates).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
  }

  const client = getSupabaseClient(auth.token);

  const { data: current, error: fetchError } = await client
    .from('client_milestones')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Marco nao encontrado', 404);
  }

  // Auto-set completed_at quando status muda para concluido
  if (updates.status === 'concluido' && current.status !== 'concluido') {
    if (!updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
  }
  // Limpar completed_at quando status sai de concluido
  if (updates.status && updates.status !== 'concluido' && current.status === 'concluido') {
    updates.completed_at = null;
  }

  const { data: updated, error: updateError } = await client
    .from('client_milestones')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[attendance/milestones-update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar marco', 500, {
      detail: updateError.message,
    });
  }

  console.log('[attendance/milestones-update] marco atualizado', { id });
  return success(updated, 200, req);
}
