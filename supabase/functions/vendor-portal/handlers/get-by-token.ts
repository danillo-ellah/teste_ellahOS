import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';

// GET /vendor-portal/public/:token — retorna dados do convite e do vendor sem auth
// Usado para pre-preencher o formulario no portal publico do fornecedor
export async function getByToken(
  _req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID para evitar queries desnecessarias
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return error('NOT_FOUND', 'Link invalido', 404);
  }

  // Service client para bypass RLS — token publico nao tem sessao de usuario
  const serviceClient = getServiceClient();

  const { data: invite, error: fetchError } = await serviceClient
    .from('vendor_invite_tokens')
    .select(`
      id,
      token,
      email,
      name,
      expires_at,
      used_at,
      vendor_id,
      job_id,
      vendors (
        id,
        full_name,
        entity_type,
        cpf,
        cnpj,
        razao_social,
        rg,
        birth_date,
        email,
        phone,
        zip_code,
        address_street,
        address_number,
        address_complement,
        address_district,
        address_city,
        address_state,
        bank_accounts (
          id,
          bank_name,
          bank_code,
          agency,
          account_number,
          account_type,
          pix_key,
          pix_key_type,
          is_primary
        )
      ),
      jobs (
        id,
        title,
        code
      )
    `)
    .eq('token', token)
    .single();

  if (fetchError || !invite) {
    return error('NOT_FOUND', 'Link de convite nao encontrado', 404);
  }

  // Verificar expiracao
  if (new Date(invite.expires_at) < new Date()) {
    return error('GONE', 'Este link de convite expirou. Solicite um novo link a producao.', 410);
  }

  // Verificar se ja foi utilizado
  if (invite.used_at) {
    return success({
      status: 'used',
      used_at: invite.used_at,
      message: 'Este formulario ja foi preenchido. Obrigado!',
    });
  }

  // Retornar dados do convite + dados pre-existentes do vendor (sem informacoes sensiveis do tenant)
  return success({
    status: 'pending',
    invite: {
      id: invite.id,
      token: invite.token,
      email: invite.email,
      name: invite.name,
      expires_at: invite.expires_at,
      job: invite.jobs ? {
        id: (invite.jobs as Record<string, unknown>).id,
        title: (invite.jobs as Record<string, unknown>).title,
        code: (invite.jobs as Record<string, unknown>).code,
      } : null,
    },
    vendor: invite.vendors ?? null,
  });
}
