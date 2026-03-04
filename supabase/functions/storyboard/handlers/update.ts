import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const UpdateSceneSchema = z
  .object({
    scene_number: z.number().int().min(1, 'Numero de cena deve ser pelo menos 1'),
    title: z.string().min(1, 'Titulo e obrigatorio').max(200),
    description: z.string().max(5000).nullable(),
    shot_type: z.string().max(100).nullable(),
    location: z.string().max(200).nullable(),
    cast_notes: z.string().max(2000).nullable(),
    camera_notes: z.string().max(2000).nullable(),
    mood_references: z.array(z.string().url('URL de referencia invalida')).max(20),
    shoot_notes: z.string().max(2000).nullable(),
    status: z.enum(['pendente', 'em_preparo', 'filmada', 'aprovada']),
    sort_order: z.number().int(),
    shooting_date_id: z.string().uuid().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function handleUpdate(
  req: Request,
  auth: AuthContext,
  sceneId: string,
): Promise<Response> {
  console.log('[storyboard/update] atualizando cena', {
    sceneId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(UpdateSceneSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se a cena existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('storyboard_scenes')
    .select('id')
    .eq('id', sceneId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Cena nao encontrada', 404);
  }

  const { data: scene, error: updateErr } = await supabase
    .from('storyboard_scenes')
    .update(validated)
    .eq('id', sceneId)
    .eq('tenant_id', auth.tenantId)
    .select()
    .single();

  if (updateErr) {
    console.error('[storyboard/update] erro ao atualizar cena:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[storyboard/update] cena atualizada:', scene.id);

  return success(scene, 200, req);
}
