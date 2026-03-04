import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /tenant-management/settings
 * Retorna as configuracoes e branding do tenant.
 * Qualquer usuario autenticado do tenant pode consultar.
 */
export async function handleGetSettings(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[tenant-management/get-settings] buscando configuracoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  const { data: tenant, error: fetchError } = await client
    .from('tenants')
    .select(
      `
      id,
      name,
      slug,
      cnpj,
      logo_url,
      brand_color,
      company_name,
      onboarding_completed,
      settings
    `,
    )
    .eq('id', auth.tenantId)
    .single();

  if (fetchError) {
    console.error(
      '[tenant-management/get-settings] erro ao buscar tenant:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar configuracoes', 500, {
      detail: fetchError.message,
    });
  }

  if (!tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  console.log('[tenant-management/get-settings] configuracoes retornadas', {
    tenantId: auth.tenantId,
  });

  return success(tenant, 200, req);
}
