import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Status de alvara permitidos
const PERMIT_STATUSES = ['nao_necessario', 'solicitado', 'aprovado', 'reprovado', 'em_analise'] as const;

// Schema de criacao de locacao
const CreateLocationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  description: z.string().max(2000).optional().nullable(),
  // Endereco
  address_street: z.string().max(300).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  address_neighborhood: z.string().max(200).optional().nullable(),
  address_city: z.string().max(200).optional().nullable(),
  address_state: z.string().max(100).optional().nullable(),
  address_zip: z.string().max(20).optional().nullable(),
  address_country: z.string().max(100).optional().nullable(),
  // Contato responsavel
  contact_name: z.string().max(200).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_email: z.string().email('Email invalido').max(200).optional().nullable(),
  // Financeiro
  daily_rate: z.number().min(0, 'Valor deve ser positivo').optional().nullable(),
  // Notas
  notes: z.string().max(2000).optional().nullable(),
});

export async function createLocation(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[locations/create] iniciando criacao de locacao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(CreateLocationSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Inserir locacao
  const { data: location, error: insertErr } = await supabase
    .from('locations')
    .insert({
      ...validated,
      tenant_id: auth.tenantId,
      is_active: true,
    })
    .select('*, location_photos(*)')
    .single();

  if (insertErr) {
    console.error('[locations/create] erro ao inserir locacao:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[locations/create] locacao criada:', location.id);

  return created(location);
}
