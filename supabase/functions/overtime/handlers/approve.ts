import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem aprovar horas extras
const APPROVAL_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

export async function handleApprove(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[overtime/approve] aprovando lancamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    entryId: id,
  });

  // Verificar role para aprovacao
  if (!APPROVAL_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para aprovar horas extras',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Verificar que o lancamento existe e pertence ao tenant
  const { data: existing } = await client
    .from('time_entries')
    .select('id, approved_by, overtime_hours, check_out')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Lancamento de ponto nao encontrado', 404);
  }

  // Nao pode aprovar lancamento sem check_out
  if (!existing.check_out) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel aprovar lancamento sem horario de saida (check_out)',
      422,
    );
  }

  // Nao re-aprovar (idempotencia: retorna sucesso se ja aprovado pelo mesmo usuario)
  if (existing.approved_by === auth.userId) {
    const { data: current } = await client
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();
    return success(current, 200, req);
  }

  if (existing.approved_by) {
    throw new AppError(
      'CONFLICT',
      'Lancamento ja aprovado por outro usuario',
      409,
    );
  }

  const { data: approvedEntry, error: updateError } = await client
    .from('time_entries')
    .update({
      approved_by: auth.userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[overtime/approve] erro ao aprovar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao aprovar lancamento de ponto', 500, {
      detail: updateError.message,
    });
  }

  console.log('[overtime/approve] lancamento aprovado', {
    id,
    overtime_hours: existing.overtime_hours,
  });
  return success(approvedEntry, 200, req);
}
