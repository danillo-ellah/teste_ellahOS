import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem configurar integracoes no onboarding
const ADMIN_ROLES = ['admin', 'ceo'];

// Schema do passo 4: confirmacao de ciencia das integracoes
const UpdateIntegrationsSchema = z.object({
  drive_acknowledged: z.boolean().optional(),
  whatsapp_acknowledged: z.boolean().optional(),
});

/**
 * PATCH /onboarding/integrations
 * Passo 4 do wizard: registra que o admin tomou ciencia das instrucoes de
 * configuracao de integracoes (Drive, WhatsApp). Avanca o passo para 5.
 */
export async function handleUpdateIntegrations(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[onboarding/update-integrations] registrando ciencia das integracoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem configurar o onboarding',
      403,
    );
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateIntegrationsSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { drive_acknowledged, whatsapp_acknowledged } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Ler settings atual para merge sem perder chaves existentes
  const { data: current, error: fetchError } = await client
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError) {
    console.error(
      '[onboarding/update-integrations] erro ao buscar settings:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do tenant', 500, {
      detail: fetchError.message,
    });
  }

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};
  const currentIntegrations =
    (currentSettings.integrations as Record<string, unknown>) ?? {};

  // Merge de integracoes: preserva flags ja existentes
  const updatedIntegrations: Record<string, unknown> = { ...currentIntegrations };
  if (drive_acknowledged !== undefined) {
    updatedIntegrations.drive_acknowledged = drive_acknowledged;
  }
  if (whatsapp_acknowledged !== undefined) {
    updatedIntegrations.whatsapp_acknowledged = whatsapp_acknowledged;
  }

  const updatedSettings: Record<string, unknown> = {
    ...currentSettings,
    integrations: updatedIntegrations,
    onboarding_step: 5,
  };

  const { error: updateError } = await client
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', auth.tenantId);

  if (updateError) {
    console.error(
      '[onboarding/update-integrations] erro ao atualizar settings:',
      updateError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar configuracoes de integracoes', 500, {
      detail: updateError.message,
    });
  }

  console.log('[onboarding/update-integrations] ciencia das integracoes registrada', {
    tenantId: auth.tenantId,
    drive_acknowledged,
    whatsapp_acknowledged,
  });

  return success(
    {
      integrations: updatedIntegrations,
      onboarding_step: 5,
    },
    200,
    req,
  );
}
