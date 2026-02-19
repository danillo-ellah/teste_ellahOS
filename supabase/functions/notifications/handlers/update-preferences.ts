import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de validacao do body de atualizacao de preferencias
const UpdatePreferencesSchema = z.object({
  preferences: z
    .object({
      in_app: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
    })
    .optional(),
  muted_types: z.array(z.string()).optional(),
});

type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

// Atualiza preferencias de notificacao do usuario autenticado.
// Faz UPSERT: cria o registro se nao existir, atualiza se existir.
export async function updatePreferences(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parsed = UpdatePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Dados invalidos',
      400,
      { issues: parsed.error.issues } as Record<string, unknown>,
    );
  }

  const input: UpdatePreferencesInput = parsed.data;

  // Verificar se ha pelo menos um campo para atualizar
  if (!input.preferences && input.muted_types === undefined) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Informe ao menos um campo para atualizar: preferences ou muted_types',
      400,
    );
  }

  const supabase = getSupabaseClient(auth.token);

  // Buscar registro atual para fazer merge de preferences (evitar sobrescrever campos nao enviados)
  const { data: current } = await supabase
    .from('notification_preferences')
    .select('preferences')
    .eq('user_id', auth.userId)
    .maybeSingle();

  // Merge das preferencias: mescla os campos existentes com os novos
  const currentPrefs = (current?.preferences as Record<string, boolean>) ?? {
    in_app: true,
    whatsapp: false,
  };
  const mergedPreferences = input.preferences
    ? { ...currentPrefs, ...input.preferences }
    : currentPrefs;

  // Montar payload de upsert
  const upsertPayload: Record<string, unknown> = {
    tenant_id: auth.tenantId,
    user_id: auth.userId,
    preferences: mergedPreferences,
  };

  if (input.muted_types !== undefined) {
    upsertPayload.muted_types = input.muted_types;
  }

  // UPSERT com merge: cria ou atualiza usando a constraint UNIQUE(tenant_id, user_id)
  const { data: updated, error: dbError } = await supabase
    .from('notification_preferences')
    .upsert(upsertPayload, { onConflict: 'tenant_id,user_id' })
    .select()
    .single();

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  return success(updated);
}
