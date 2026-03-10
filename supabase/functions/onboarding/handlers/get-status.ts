import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem acessar o status do onboarding
const ADMIN_ROLES = ['admin', 'ceo'];

/**
 * GET /onboarding/status
 * Retorna os dados do tenant e do perfil do usuario atual para pre-preencher
 * o wizard de onboarding. Apenas admin e ceo podem acessar.
 */
export async function handleGetStatus(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[onboarding/get-status] buscando status do onboarding', {
    userId: auth.userId.substring(0, 8),
    tenantId: auth.tenantId.substring(0, 8),
  });

  // Verificar permissao
  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem acessar o onboarding',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar dados do tenant
  const { data: tenant, error: tenantError } = await client
    .from('tenants')
    .select('id, name, cnpj, logo_url, settings, onboarding_completed')
    .eq('id', auth.tenantId)
    .single();

  if (tenantError) {
    console.error('[onboarding/get-status] erro ao buscar tenant:', tenantError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do tenant', 500, {
      detail: tenantError.message,
    });
  }

  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  // Buscar dados do perfil do usuario atual
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('full_name, phone, role')
    .eq('id', auth.userId)
    .single();

  if (profileError) {
    console.error('[onboarding/get-status] erro ao buscar perfil:', profileError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do perfil', 500, {
      detail: profileError.message,
    });
  }

  console.log('[onboarding/get-status] status retornado', {
    tenantId: auth.tenantId.substring(0, 8),
    onboarding_completed: tenant.onboarding_completed,
  });

  return success(
    {
      tenant,
      profile: profile ?? { full_name: null, phone: null },
    },
    200,
    req,
  );
}
