import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem alterar o role de membros
const ADMIN_ROLES = ['admin', 'ceo'];

const VALID_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador',
  'diretor',
  'financeiro',
  'atendimento',
  'comercial',
  'freelancer',
] as const;

const UpdateMemberSchema = z.object({
  role: z.enum(VALID_ROLES),
});

/**
 * PATCH /tenant-management/members/:id
 * Atualiza o role de um membro do tenant.
 * Apenas admin/ceo podem alterar roles.
 * Nao e permitido alterar o proprio role.
 */
export async function handleUpdateMember(
  req: Request,
  auth: AuthContext,
  memberId: string,
): Promise<Response> {
  console.log('[tenant-management/update-member] atualizando membro', {
    memberId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas administradores podem alterar roles de membros', 403);
  }

  if (memberId === auth.userId) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Nao e permitido alterar o proprio role', 422);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateMemberSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { role } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar se o membro pertence ao tenant
  const { data: member, error: fetchError } = await client
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (fetchError) {
    console.error(
      '[tenant-management/update-member] erro ao buscar membro:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar membro', 500, {
      detail: fetchError.message,
    });
  }

  if (!member) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado', 404);
  }

  // Atualizar role no profile
  const { data: updated, error: updateError } = await client
    .from('profiles')
    .update({ role })
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .select('id, full_name, email, phone, role, avatar_url, created_at')
    .single();

  if (updateError) {
    console.error(
      '[tenant-management/update-member] erro ao atualizar membro:',
      updateError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar membro', 500, {
      detail: updateError.message,
    });
  }

  console.log('[tenant-management/update-member] membro atualizado', {
    memberId,
    oldRole: member.role,
    newRole: role,
  });

  return success(updated, 200, req);
}
