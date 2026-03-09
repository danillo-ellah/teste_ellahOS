import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem atualizar o proprio perfil no onboarding
const ADMIN_ROLES = ['admin', 'ceo'];

// Schema do passo 2: dados do perfil do usuario
const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Nome completo e obrigatorio').max(200),
  phone: z.string().max(20).optional().nullable(),
});

/**
 * PATCH /onboarding/profile
 * Passo 2 do wizard: salva nome completo e telefone do usuario atual.
 * Tambem avanca o indicador de passo para 3 dentro de settings do tenant.
 */
export async function handleUpdateProfile(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[onboarding/update-profile] atualizando perfil do usuario', {
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

  const parseResult = UpdateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { full_name, phone } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Atualizar perfil do usuario atual na tabela profiles
  const profilePayload: Record<string, unknown> = { full_name };
  if (phone !== undefined) profilePayload.phone = phone;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .update(profilePayload)
    .eq('id', auth.userId)
    .select('full_name, phone')
    .single();

  if (profileError) {
    console.error('[onboarding/update-profile] erro ao atualizar perfil:', profileError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar dados do perfil', 500, {
      detail: profileError.message,
    });
  }

  // Ler settings atual do tenant para merge sem perder chaves existentes
  const { data: current, error: fetchError } = await client
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError) {
    console.error('[onboarding/update-profile] erro ao buscar settings do tenant:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do tenant', 500, {
      detail: fetchError.message,
    });
  }

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

  // Avanca o passo do wizard para 3
  const updatedSettings: Record<string, unknown> = {
    ...currentSettings,
    onboarding_step: 3,
  };

  const { error: settingsError } = await client
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', auth.tenantId);

  if (settingsError) {
    console.error('[onboarding/update-profile] erro ao atualizar step do tenant:', settingsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar progresso do onboarding', 500, {
      detail: settingsError.message,
    });
  }

  console.log('[onboarding/update-profile] perfil atualizado', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  return success(profile, 200, req);
}
