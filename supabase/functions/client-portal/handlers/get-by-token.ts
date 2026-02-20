import { getServiceClient } from '../_shared/supabase-client.ts';
import { success, error } from '../_shared/response.ts';

// UUID v4 regex para validacao rapida de formato
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /client-portal/public/:token
// Endpoint publico — sem auth. Chama RPC get_portal_timeline via service_role.
// Filtragem de dados sensiveis e feita dentro da propria RPC no banco.
export async function getByToken(
  _req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID antes de qualquer query
  if (!UUID_REGEX.test(token)) {
    return error('NOT_FOUND', 'Token invalido', 404);
  }

  const serviceClient = getServiceClient();

  console.log(`[client-portal/get-by-token] token=${token}`);

  // Chamar RPC get_portal_timeline — retorna session + timeline + documents + approvals + messages
  const { data: timeline, error: rpcError } = await serviceClient
    .rpc('get_portal_timeline', {
      p_token: token,
      p_limit: 50,
    });

  if (rpcError) {
    console.error(`[client-portal/get-by-token] erro rpc: ${rpcError.message}`);
    return error('INTERNAL_ERROR', 'Erro ao buscar dados do portal', 500);
  }

  // RPC retorna NULL quando sessao nao existe ou esta inativa
  if (!timeline) {
    return error('NOT_FOUND', 'Portal nao encontrado ou inativo', 404);
  }

  // RPC retorna { error: 'expired' } quando sessao expirou
  if ((timeline as { error?: string }).error === 'expired') {
    return error('BUSINESS_RULE_VIOLATION', 'Este link de acesso expirou. Entre em contato com a producao para solicitar um novo link.', 410);
  }

  console.log(`[client-portal/get-by-token] portal carregado para sessao ${(timeline as any)?.session?.id}`);

  return success(timeline);
}
