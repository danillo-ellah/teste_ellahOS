import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Valores padrao para preferencias de notificacao
const DEFAULT_PREFERENCES = {
  in_app: true,
  whatsapp: false,
};

// Retorna preferencias de notificacao do usuario autenticado.
// Se nao existir registro, cria com valores padrao via UPSERT e retorna.
export async function getPreferences(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // UPSERT: garante que o registro existe com defaults se for o primeiro acesso.
  // onConflict usa a constraint UNIQUE(tenant_id, user_id).
  // ignoreDuplicates: true preserva os dados existentes sem sobrescrever.
  const { data: preferences, error: dbError } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        tenant_id: auth.tenantId,
        user_id: auth.userId,
        preferences: DEFAULT_PREFERENCES,
        muted_types: [],
      },
      {
        onConflict: 'tenant_id,user_id',
        ignoreDuplicates: true,
      },
    )
    .select()
    .single();

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  // Se o UPSERT com ignoreDuplicates nao retornou dados (registro ja existia),
  // busca o registro existente diretamente
  if (!preferences) {
    const { data: existing, error: fetchError } = await supabase
      .from('notification_preferences')
      .select()
      .eq('user_id', auth.userId)
      .single();

    if (fetchError) {
      throw new AppError('INTERNAL_ERROR', fetchError.message, 500);
    }

    return success(existing);
  }

  return success(preferences);
}
