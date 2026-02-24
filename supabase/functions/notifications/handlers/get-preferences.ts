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

  // 1. Tentar buscar registro existente
  const { data: existing, error: fetchError } = await supabase
    .from('notification_preferences')
    .select()
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (fetchError) {
    throw new AppError('INTERNAL_ERROR', fetchError.message, 500);
  }

  if (existing) {
    return success(existing);
  }

  // 2. Primeiro acesso: criar com defaults
  const { data: created, error: insertError } = await supabase
    .from('notification_preferences')
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      preferences: DEFAULT_PREFERENCES,
      muted_types: [],
    })
    .select()
    .single();

  if (insertError) {
    // Race condition: registro criado entre o SELECT e INSERT
    if (insertError.code === '23505') {
      const { data: retry } = await supabase
        .from('notification_preferences')
        .select()
        .eq('user_id', auth.userId)
        .single();
      return success(retry);
    }
    throw new AppError('INTERNAL_ERROR', insertError.message, 500);
  }

  return success(created);
}
