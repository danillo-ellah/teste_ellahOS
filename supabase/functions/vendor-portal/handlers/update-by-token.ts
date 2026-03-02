import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, z } from '../../_shared/validation.ts';

// Schema de validacao do formulario do fornecedor
// Todos os campos sao opcionais — fornecedor pode preencher parcialmente
const VendorPortalSchema = z.object({
  // Dados pessoais
  full_name:          z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(300),
  entity_type:        z.enum(['pf', 'pj']).optional(),
  cpf:                z.string().max(14).optional().nullable(),
  cnpj:               z.string().max(18).optional().nullable(),
  razao_social:       z.string().max(300).optional().nullable(),
  rg:                 z.string().max(30).optional().nullable(),
  birth_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  email:              z.string().email('E-mail invalido').max(300).optional().nullable(),
  phone:              z.string().max(30).optional().nullable(),

  // Endereco
  zip_code:            z.string().max(10).optional().nullable(),
  address_street:      z.string().max(300).optional().nullable(),
  address_number:      z.string().max(30).optional().nullable(),
  address_complement:  z.string().max(100).optional().nullable(),
  address_district:    z.string().max(200).optional().nullable(),
  address_city:        z.string().max(200).optional().nullable(),
  address_state:       z.string().length(2).optional().nullable(),

  // Dados bancarios (opcao de criar/atualizar uma conta bancaria principal)
  bank_account: z.object({
    bank_name:      z.string().max(200).optional().nullable(),
    bank_code:      z.string().max(10).optional().nullable(),
    agency:         z.string().max(20).optional().nullable(),
    account_number: z.string().max(30).optional().nullable(),
    account_type:   z.enum(['corrente', 'poupanca']).optional().nullable(),
    pix_key:        z.string().max(100).optional().nullable(),
    pix_key_type:   z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional().nullable(),
  }).optional().nullable(),
});

// POST /vendor-portal/public/:token — fornecedor preenche/atualiza seus dados sem auth
export async function updateByToken(
  req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return error('NOT_FOUND', 'Link invalido', 404);
  }

  const serviceClient = getServiceClient();

  // Buscar convite
  const { data: invite, error: inviteError } = await serviceClient
    .from('vendor_invite_tokens')
    .select('id, tenant_id, vendor_id, used_at, expires_at')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return error('NOT_FOUND', 'Link de convite nao encontrado', 404);
  }

  // Verificar expiracao
  if (new Date(invite.expires_at) < new Date()) {
    return error('GONE', 'Este link de convite expirou.', 410);
  }

  // Verificar uso duplo
  if (invite.used_at) {
    return error('CONFLICT', 'Este formulario ja foi preenchido.', 409);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const validated = validate(VendorPortalSchema, body);

  // Sanitizar CPF e CNPJ (remover mascara)
  const cpfClean  = validated.cpf  ? validated.cpf.replace(/\D/g, '')  : undefined;
  const cnpjClean = validated.cnpj ? validated.cnpj.replace(/\D/g, '') : undefined;

  let vendorId = invite.vendor_id as string | null;

  if (vendorId) {
    // Atualizar vendor existente
    const { error: updateError } = await serviceClient
      .from('vendors')
      .update({
        full_name:          validated.full_name,
        entity_type:        validated.entity_type ?? undefined,
        cpf:                cpfClean ?? undefined,
        cnpj:               cnpjClean ?? undefined,
        razao_social:       validated.razao_social ?? undefined,
        rg:                 validated.rg ?? undefined,
        birth_date:         validated.birth_date ?? undefined,
        email:              validated.email ?? undefined,
        phone:              validated.phone ?? undefined,
        zip_code:           validated.zip_code ?? undefined,
        address_street:     validated.address_street ?? undefined,
        address_number:     validated.address_number ?? undefined,
        address_complement: validated.address_complement ?? undefined,
        address_district:   validated.address_district ?? undefined,
        address_city:       validated.address_city ?? undefined,
        address_state:      validated.address_state ?? undefined,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', vendorId)
      .eq('tenant_id', invite.tenant_id);

    if (updateError) {
      console.error('[vendor-portal/update-by-token] erro update vendor:', updateError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao salvar dados', 500);
    }
  } else {
    // Criar novo vendor vinculado ao tenant do convite
    const { data: newVendor, error: insertError } = await serviceClient
      .from('vendors')
      .insert({
        tenant_id:          invite.tenant_id,
        full_name:          validated.full_name,
        normalized_name:    validated.full_name.toLowerCase().trim(),
        entity_type:        validated.entity_type ?? 'pf',
        cpf:                cpfClean ?? null,
        cnpj:               cnpjClean ?? null,
        razao_social:       validated.razao_social ?? null,
        rg:                 validated.rg ?? null,
        birth_date:         validated.birth_date ?? null,
        email:              validated.email ?? null,
        phone:              validated.phone ?? null,
        zip_code:           validated.zip_code ?? null,
        address_street:     validated.address_street ?? null,
        address_number:     validated.address_number ?? null,
        address_complement: validated.address_complement ?? null,
        address_district:   validated.address_district ?? null,
        address_city:       validated.address_city ?? null,
        address_state:      validated.address_state ?? null,
        is_active:          true,
        import_source:      'vendor_portal',
      })
      .select('id')
      .single();

    if (insertError || !newVendor) {
      console.error('[vendor-portal/update-by-token] erro insert vendor:', insertError?.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao criar fornecedor', 500);
    }

    vendorId = newVendor.id;

    // Atualizar o convite com o vendor_id criado
    await serviceClient
      .from('vendor_invite_tokens')
      .update({ vendor_id: vendorId })
      .eq('id', invite.id);
  }

  // Salvar conta bancaria, se fornecida
  if (validated.bank_account && vendorId) {
    const ba = validated.bank_account;
    const hasData = ba.bank_name || ba.pix_key || ba.account_number;

    if (hasData) {
      // Verificar se ja existe conta principal
      const { data: existingPrimary } = await serviceClient
        .from('bank_accounts')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('is_primary', true)
        .is('deleted_at', null)
        .single();

      if (existingPrimary) {
        // Atualizar conta principal existente
        await serviceClient
          .from('bank_accounts')
          .update({
            bank_name:      ba.bank_name ?? null,
            bank_code:      ba.bank_code ?? null,
            agency:         ba.agency ?? null,
            account_number: ba.account_number ?? null,
            account_type:   ba.account_type ?? null,
            pix_key:        ba.pix_key ?? null,
            pix_key_type:   ba.pix_key_type ?? null,
            updated_at:     new Date().toISOString(),
          })
          .eq('id', existingPrimary.id);
      } else {
        // Criar nova conta bancaria principal
        await serviceClient
          .from('bank_accounts')
          .insert({
            tenant_id:      invite.tenant_id,
            vendor_id:      vendorId,
            bank_name:      ba.bank_name ?? null,
            bank_code:      ba.bank_code ?? null,
            agency:         ba.agency ?? null,
            account_number: ba.account_number ?? null,
            account_type:   ba.account_type ?? null,
            pix_key:        ba.pix_key ?? null,
            pix_key_type:   ba.pix_key_type ?? null,
            is_primary:     true,
            is_active:      true,
          });
      }
    }
  }

  // Marcar convite como utilizado
  await serviceClient
    .from('vendor_invite_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id);

  return success({ vendor_id: vendorId, message: 'Dados salvos com sucesso!' });
}
