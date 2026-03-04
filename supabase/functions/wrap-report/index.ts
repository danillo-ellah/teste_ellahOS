import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleGenerate } from './handlers/generate.ts';

// ========================================================
// wrap-report — Relatorio de encerramento do dia de filmagem
// Rotas:
//   POST /wrap-report/generate   -> agrega dados do dia e retorna relatorio estruturado
// ========================================================

// Roles com permissao para gerar wrap report
const ALLOWED_ROLES = new Set([
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'ceo',
  'diretor',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Verificar permissao de role
    if (!ALLOWED_ROLES.has(auth.role)) {
      throw new AppError(
        'FORBIDDEN',
        'Apenas produtores executivos, coordenadores, diretores, admin ou ceo podem gerar wrap reports',
        403,
      );
    }

    // Extrair segmentos do path apos /wrap-report
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'wrap-report');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    console.log('[wrap-report/index] request recebido', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.role,
    });

    // POST /wrap-report/generate
    if (segment1 === 'generate' && method === 'POST') {
      return await handleGenerate(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[wrap-report] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
