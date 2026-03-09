import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem concluir o onboarding
const ADMIN_ROLES = ['admin', 'ceo'];

/**
 * PATCH /onboarding/complete
 * Passo final do wizard: marca o onboarding como concluido.
 * Define onboarding_completed = true na coluna dedicada e no JSONB settings.
 * Remove a chave onboarding_step do settings (limpeza de estado intermediario).
 */
export async function handleComplete(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[onboarding/complete] concluindo onboarding', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem concluir o onboarding',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Ler settings atual para fazer merge e remover onboarding_step
  const { data: current, error: fetchError } = await client
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError) {
    console.error('[onboarding/complete] erro ao buscar settings:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do tenant', 500, {
      detail: fetchError.message,
    });
  }

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

  // Remover onboarding_step (estado intermediario nao e mais necessario)
  // e registrar conclusao dentro do JSONB
  const { onboarding_step: _removed, ...settingsWithoutStep } = currentSettings as {
    onboarding_step?: unknown;
    [key: string]: unknown;
  };

  const updatedSettings: Record<string, unknown> = {
    ...settingsWithoutStep,
    onboarding_completed: true,
  };

  const { data: tenant, error: updateError } = await client
    .from('tenants')
    .update({
      onboarding_completed: true,
      settings: updatedSettings,
    })
    .eq('id', auth.tenantId)
    .select('id, name, onboarding_completed, settings')
    .single();

  if (updateError) {
    console.error('[onboarding/complete] erro ao concluir onboarding:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao concluir onboarding', 500, {
      detail: updateError.message,
    });
  }

  console.log('[onboarding/complete] onboarding concluido com sucesso', {
    tenantId: auth.tenantId,
  });

  return success(
    {
      onboarding_completed: true,
      tenant_id: tenant.id,
    },
    200,
    req,
  );
}
