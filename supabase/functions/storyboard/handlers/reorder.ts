import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ReorderSchema = z.object({
  scenes: z
    .array(
      z.object({
        id: z.string().uuid('id deve ser UUID valido'),
        sort_order: z.number().int('sort_order deve ser inteiro'),
      }),
    )
    .min(1, 'Pelo menos uma cena deve ser fornecida')
    .max(500, 'Maximo de 500 cenas por operacao de reordenacao'),
});

export async function handleReorder(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[storyboard/reorder] reordenando cenas', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(ReorderSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Atualizar sort_order de cada cena individualmente.
  // O RLS garante que apenas cenas do tenant do usuario serao atualizadas.
  const errors: Array<{ id: string; message: string }> = [];

  for (const item of validated.scenes) {
    const { error: updateErr } = await supabase
      .from('storyboard_scenes')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('tenant_id', auth.tenantId);

    if (updateErr) {
      console.error('[storyboard/reorder] erro ao atualizar cena:', item.id, updateErr.message);
      errors.push({ id: item.id, message: updateErr.message });
    }
  }

  if (errors.length > 0) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao reordenar ${errors.length} cena(s)`,
      500,
      { errors },
    );
  }

  console.log('[storyboard/reorder] reordenadas', validated.scenes.length, 'cenas');

  return success({ reordered: validated.scenes.length }, 200, req);
}
