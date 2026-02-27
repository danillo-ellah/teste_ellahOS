import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para atualizar vendors
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de atualizacao parcial — pelo menos 1 campo obrigatorio
const UpdateVendorSchema = z
  .object({
    full_name: z.string().min(2).max(200),
    entity_type: z.enum(['pf', 'pj']),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 digitos').nullable(),
    cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 digitos').nullable(),
    razao_social: z.string().nullable(),
    email: z.string().email('Email invalido').nullable(),
    phone: z.string().nullable(),
    notes: z.string().nullable(),
    people_id: z.string().uuid().nullable(),
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function updateVendor(
  req: Request,
  auth: AuthContext,
  vendorId: string,
): Promise<Response> {
  console.log('[vendors/update] atualizando vendor', {
    vendorId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas financeiro, admin e ceo podem atualizar vendors',
      403,
    );
  }

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(UpdateVendorSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se vendor existe
  const { data: existing, error: findErr } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Vendor nao encontrado', 404);
  }

  // Remover campos que nao podem ser atualizados diretamente
  // (id, tenant_id, normalized_name e created_at sao gerenciados pelo banco)
  const { data: vendor, error: updateErr } = await supabase
    .from('vendors')
    .update(validated)
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .select('*, bank_accounts(*)')
    .single();

  if (updateErr) {
    console.error('[vendors/update] erro ao atualizar vendor:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[vendors/update] vendor atualizado:', vendor.id);

  return success(vendor);
}
