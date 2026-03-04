import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const CreateSceneSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  scene_number: z.number().int().min(1, 'Numero de cena deve ser pelo menos 1'),
  title: z.string().min(1, 'Titulo e obrigatorio').max(200),
  description: z.string().max(5000).optional(),
  shot_type: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  cast_notes: z.string().max(2000).optional(),
  camera_notes: z.string().max(2000).optional(),
  mood_references: z.array(z.string().url('URL de referencia invalida')).max(20).optional(),
  shoot_notes: z.string().max(2000).optional(),
  status: z.enum(['pendente', 'em_preparo', 'filmada', 'aprovada']).optional(),
  sort_order: z.number().int().optional(),
  shooting_date_id: z.string().uuid().nullable().optional(),
});

export async function handleCreate(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[storyboard/create] iniciando criacao de cena', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(CreateSceneSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', validated.job_id)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Calcular sort_order automaticamente se nao fornecido (max + 1)
  let sortOrder = validated.sort_order;
  if (sortOrder === undefined) {
    const { data: maxRow } = await supabase
      .from('storyboard_scenes')
      .select('sort_order')
      .eq('job_id', validated.job_id)
      .eq('tenant_id', auth.tenantId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    sortOrder = maxRow ? (maxRow.sort_order ?? 0) + 1 : 0;
  }

  const { data: scene, error: insertErr } = await supabase
    .from('storyboard_scenes')
    .insert({
      job_id: validated.job_id,
      scene_number: validated.scene_number,
      title: validated.title,
      description: validated.description ?? null,
      shot_type: validated.shot_type ?? null,
      location: validated.location ?? null,
      cast_notes: validated.cast_notes ?? null,
      camera_notes: validated.camera_notes ?? null,
      mood_references: validated.mood_references ?? [],
      shoot_notes: validated.shoot_notes ?? null,
      status: validated.status ?? 'pendente',
      sort_order: sortOrder,
      shooting_date_id: validated.shooting_date_id ?? null,
      tenant_id: auth.tenantId,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[storyboard/create] erro ao inserir cena:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[storyboard/create] cena criada:', scene.id);

  return created(scene, req);
}
