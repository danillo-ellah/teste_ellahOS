import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// DELETE /client-portal/sessions/:id
// Soft delete de uma sessao. O token fica invalido imediatamente (deleted_at IS NOT NULL).
// Mensagens historicas sao preservadas (cascade nao deleta client_portal_messages).
export async function deleteSession(
  req: Request,
  auth: AuthContext,
  sessionId: string,
): Promise<Response> {
  // Validar UUID do sessionId
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(sessionId)) {
    throw new AppError('VALIDATION_ERROR', 'ID de sessao invalido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/delete-session] tenant=${auth.tenantId}, session_id=${sessionId}`);

  // Verificar que a sessao existe (RLS garante isolamento por tenant)
  const { data: existing, error: findError } = await supabase
    .from('client_portal_sessions')
    .select('id, label')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .single();

  if (findError || !existing) {
    throw new AppError('NOT_FOUND', 'Sessao nao encontrada', 404);
  }

  // Soft delete: definir deleted_at para invalidar o token imediatamente
  const { error: deleteError } = await supabase
    .from('client_portal_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (deleteError) {
    console.error(`[client-portal/delete-session] erro soft delete: ${deleteError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao excluir sessao', 500);
  }

  console.log(`[client-portal/delete-session] sessao removida: id=${sessionId}, label="${(existing as any).label}"`);

  return success({ id: sessionId, deleted: true });
}
