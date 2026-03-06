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

const UpdateLogisticsSchema = z.object({
  item_type: z.enum(['passagem_aerea', 'hospedagem', 'transfer', 'alimentacao', 'outro']).optional(),
  description: z.string().min(1).max(2000).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  responsible_name: z.string().max(255).optional().nullable(),
  status: z.enum(['pendente', 'confirmado', 'cancelado']).optional(),
  sent_to_client: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
}).strict();

export async function handleLogisticsUpdate(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/logistics-update] atualizando logistica', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para atualizar logistica', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateLogisticsSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  if (Object.keys(updates).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
  }

  const client = getSupabaseClient(auth.token);

  const { data: current, error: fetchError } = await client
    .from('client_logistics')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Item de logistica nao encontrado', 404);
  }

  const { data: updated, error: updateError } = await client
    .from('client_logistics')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[attendance/logistics-update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar logistica', 500, {
      detail: updateError.message,
    });
  }

  console.log('[attendance/logistics-update] logistica atualizada', { id });
  return success(updated, 200, req);
}
