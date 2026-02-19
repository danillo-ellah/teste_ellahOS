import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { getIntegrations } from './handlers/get-integrations.ts';
import { updateIntegration } from './handlers/update-integration.ts';
import { testIntegration } from './handlers/test-integration.ts';
import { listLogs } from './handlers/list-logs.ts';

// Roles que podem acessar configuracoes de integracao
const ALLOWED_ROLES = ['admin', 'ceo'];

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao
    const auth = await getAuthContext(req);

    // Verificar role: apenas admin/ceo
    if (!ALLOWED_ROLES.includes(auth.role)) {
      throw new AppError(
        'FORBIDDEN',
        'Apenas administradores podem acessar configuracoes de integracao',
        403,
      );
    }

    // Parsear URL para roteamento
    // Formatos:
    //   GET    /tenant-settings/integrations                        -> get-integrations
    //   PATCH  /tenant-settings/integrations/:integration           -> update-integration
    //   POST   /tenant-settings/integrations/:integration/test      -> test-integration
    //   GET    /tenant-settings/integration-logs                    -> list-logs
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    const fnIndex = pathSegments.findIndex(s => s === 'tenant-settings');

    // Segmentos apos "tenant-settings"
    const seg1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const seg2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;
    const seg3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3]
      : null;

    const method = req.method;

    // GET /tenant-settings/integrations -> listar config de todas integracoes
    if (method === 'GET' && seg1 === 'integrations' && !seg2) {
      return await getIntegrations(req, auth);
    }

    // PATCH /tenant-settings/integrations/:integration -> atualizar config
    if (method === 'PATCH' && seg1 === 'integrations' && seg2 && !seg3) {
      return await updateIntegration(req, auth, seg2);
    }

    // POST /tenant-settings/integrations/:integration/test -> testar conexao
    if (method === 'POST' && seg1 === 'integrations' && seg2 && seg3 === 'test') {
      return await testIntegration(req, auth, seg2);
    }

    // GET /tenant-settings/integration-logs -> logs paginados
    if (method === 'GET' && seg1 === 'integration-logs') {
      return await listLogs(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em tenant-settings:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
