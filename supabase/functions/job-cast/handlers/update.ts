import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const UpdateSchema = z
  .object({
    name: z.string().min(1, 'Nome e obrigatorio'),
    cast_category: z.string(),
    character_name: z.string().nullable(),
    cpf: z.string().nullable(),
    rg: z.string().nullable(),
    birth_date: z.string().nullable(),
    drt: z.string().nullable(),
    profession: z.string().nullable(),
    email: z.string().email('Email invalido').nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zip_code: z.string().nullable(),
    service_fee: z.number(),
    image_rights_fee: z.number(),
    agency_fee: z.number(),
    total_fee: z.number(),
    num_days: z.number().int(),
    scenes_description: z.string().nullable(),
    casting_agency: z.any().nullable(),
    data_status: z.enum(['completo', 'incompleto']),
    contract_status: z.enum(['pendente', 'enviado', 'assinado', 'cancelado']),
    sort_order: z.number().int(),
    notes: z.string().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function handleUpdate(
  req: Request,
  auth: AuthContext,
  memberId: string,
): Promise<Response> {
  console.log('[job-cast/update] atualizando membro do elenco', {
    memberId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(UpdateSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o registro existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('job_cast')
    .select('id')
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Membro do elenco nao encontrado', 404);
  }

  const { data: member, error: updateErr } = await supabase
    .from('job_cast')
    .update(validated)
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .select()
    .single();

  if (updateErr) {
    console.error('[job-cast/update] erro ao atualizar membro:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[job-cast/update] membro atualizado:', member.id);

  return success(member, 200, req);
}
