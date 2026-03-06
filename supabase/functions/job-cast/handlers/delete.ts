import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para operacoes de escrita no elenco
const ALLOWED_ROLES_WRITE = ['admin', 'ceo', 'produtor_executivo', 'diretor'];

export async function handleDelete(
  req: Request,
  auth: AuthContext,
  memberId: string,
): Promise<Response> {
  // Verificacao de RBAC: apenas roles autorizados podem remover membros do elenco
  if (!ALLOWED_ROLES_WRITE.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para esta operacao', 403);
  }

  console.log('[job-cast/delete] deletando membro do elenco', {
    memberId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o registro existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('job_cast')
    .select('id')
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Membro do elenco nao encontrado', 404);
  }

  // Hard delete — RLS policy garante isolamento por tenant
  const { error: deleteErr } = await supabase
    .from('job_cast')
    .delete()
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[job-cast/delete] erro ao deletar membro:', deleteErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover membro do elenco', 500);
  }

  console.log('[job-cast/delete] membro deletado:', memberId);

  return success({ deleted: true }, 200, req);
}
