import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success, created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de adicao de foto
const AddPhotoSchema = z.object({
  url: z.string().url('URL invalida').max(1000),
  caption: z.string().max(500).optional().nullable(),
  is_cover: z.boolean().optional().default(false),
});

// POST /locations/:id/photos — adicionar foto a uma locacao
export async function addLocationPhoto(
  req: Request,
  auth: AuthContext,
  locationId: string,
): Promise<Response> {
  console.log('[locations/photos/add] adicionando foto', {
    locationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const body = await req.json();
  const validated = validate(AddPhotoSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se locacao existe e pertence ao tenant
  const { data: location, error: findErr } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !location) {
    throw new AppError('NOT_FOUND', 'Locacao nao encontrada', 404);
  }

  // Se is_cover = true, desmarcar outras fotos de capa desta locacao
  if (validated.is_cover) {
    await supabase
      .from('location_photos')
      .update({ is_cover: false })
      .eq('location_id', locationId)
      .eq('tenant_id', auth.tenantId)
      .eq('is_cover', true);
  }

  const { data: photo, error: insertErr } = await supabase
    .from('location_photos')
    .insert({
      location_id: locationId,
      tenant_id: auth.tenantId,
      url: validated.url,
      caption: validated.caption ?? null,
      is_cover: validated.is_cover,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[locations/photos/add] erro ao inserir foto:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[locations/photos/add] foto adicionada:', photo.id);

  return created(photo);
}

// DELETE /locations/:id/photos/:photoId — remover foto
export async function deleteLocationPhoto(
  req: Request,
  auth: AuthContext,
  locationId: string,
  photoId: string,
): Promise<Response> {
  console.log('[locations/photos/delete] removendo foto', {
    locationId,
    photoId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar existencia da foto
  const { data: existing, error: findErr } = await supabase
    .from('location_photos')
    .select('id')
    .eq('id', photoId)
    .eq('location_id', locationId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Foto nao encontrada', 404);
  }

  const { error: deleteErr } = await supabase
    .from('location_photos')
    .delete()
    .eq('id', photoId)
    .eq('location_id', locationId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[locations/photos/delete] erro ao remover foto:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[locations/photos/delete] foto removida:', photoId);

  return success({ deleted: true });
}
