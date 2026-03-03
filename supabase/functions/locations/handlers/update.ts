import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de atualizacao parcial
const UpdateLocationSchema = z
  .object({
    name: z.string().min(2).max(200),
    description: z.string().max(2000).nullable(),
    address_street: z.string().max(300).nullable(),
    address_number: z.string().max(20).nullable(),
    address_complement: z.string().max(100).nullable(),
    address_neighborhood: z.string().max(200).nullable(),
    address_city: z.string().max(200).nullable(),
    address_state: z.string().max(100).nullable(),
    address_zip: z.string().max(20).nullable(),
    address_country: z.string().max(100).nullable(),
    contact_name: z.string().max(200).nullable(),
    contact_phone: z.string().max(50).nullable(),
    contact_email: z.string().email('Email invalido').max(200).nullable(),
    daily_rate: z.number().min(0).nullable(),
    notes: z.string().max(2000).nullable(),
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function updateLocation(
  req: Request,
  auth: AuthContext,
  locationId: string,
): Promise<Response> {
  console.log('[locations/update] atualizando locacao', {
    locationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(UpdateLocationSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se locacao existe
  const { data: existing, error: findErr } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Locacao nao encontrada', 404);
  }

  const { data: location, error: updateErr } = await supabase
    .from('locations')
    .update(validated)
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId)
    .select('*, location_photos(*)')
    .single();

  if (updateErr) {
    console.error('[locations/update] erro ao atualizar locacao:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[locations/update] locacao atualizada:', location.id);

  return success(location);
}
