import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const CreateSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  name: z.string().min(1, 'Nome e obrigatorio'),
  cast_category: z.string().default('ator_principal'),
  character_name: z.string().nullish(),
  cpf: z.string().nullish(),
  rg: z.string().nullish(),
  birth_date: z.string().nullish(),
  drt: z.string().nullish(),
  profession: z.string().nullish(),
  email: z.string().email('Email invalido').nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zip_code: z.string().nullish(),
  service_fee: z.number().default(0),
  image_rights_fee: z.number().default(0),
  agency_fee: z.number().default(0),
  total_fee: z.number().default(0),
  num_days: z.number().int().default(1),
  scenes_description: z.string().nullish(),
  casting_agency: z.any().nullish(),
  data_status: z.enum(['completo', 'incompleto']).default('incompleto'),
  contract_status: z.enum(['pendente', 'enviado', 'assinado', 'cancelado']).default('pendente'),
  sort_order: z.number().int().default(0),
  notes: z.string().nullish(),
});

export async function handleCreate(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[job-cast/create] iniciando criacao de membro do elenco', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const validated = validate(CreateSchema, body);

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

  const { data: member, error: insertErr } = await supabase
    .from('job_cast')
    .insert({
      tenant_id: auth.tenantId,
      job_id: validated.job_id,
      name: validated.name,
      cast_category: validated.cast_category,
      character_name: validated.character_name ?? null,
      cpf: validated.cpf ?? null,
      rg: validated.rg ?? null,
      birth_date: validated.birth_date ?? null,
      drt: validated.drt ?? null,
      profession: validated.profession ?? null,
      email: validated.email ?? null,
      phone: validated.phone ?? null,
      address: validated.address ?? null,
      city: validated.city ?? null,
      state: validated.state ?? null,
      zip_code: validated.zip_code ?? null,
      service_fee: validated.service_fee,
      image_rights_fee: validated.image_rights_fee,
      agency_fee: validated.agency_fee,
      total_fee: validated.service_fee + validated.image_rights_fee + validated.agency_fee,
      num_days: validated.num_days,
      scenes_description: validated.scenes_description ?? null,
      casting_agency: validated.casting_agency ?? null,
      data_status: validated.data_status,
      contract_status: validated.contract_status,
      sort_order: validated.sort_order,
      notes: validated.notes ?? null,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[job-cast/create] erro ao inserir membro:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[job-cast/create] membro criado:', member.id);

  return created(member, req);
}
