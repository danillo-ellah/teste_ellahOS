import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Soft delete: apenas quem criou ou admin/ceo pode deletar
const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const ADMIN_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function handleCommunicationsDelete(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/communications-delete] soft delete de comunicacao', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para deletar comunicacoes', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar registro para checar ownership
  const { data: current, error: fetchError } = await client
    .from('client_communications')
    .select('id, created_by')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Comunicacao nao encontrada', 404);
  }

  // Apenas o criador ou admin/ceo/pe podem deletar
  const isOwner = current.created_by === auth.userId;
  const isAdmin = ADMIN_ROLES.includes(auth.role);
  if (!isOwner && !isAdmin) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas o autor ou administrador pode remover esta comunicacao',
      403,
    );
  }

  const { error: deleteError } = await client
    .from('client_communications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[attendance/communications-delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover comunicacao', 500, {
      detail: deleteError.message,
    });
  }

  console.log('[attendance/communications-delete] comunicacao removida (soft delete)', { id });
  return success({ id, deleted: true }, 200, req);
}
