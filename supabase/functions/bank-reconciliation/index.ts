import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleImport } from './handlers/import.ts';
import { handleListStatements } from './handlers/list-statements.ts';
import { handleListTransactions } from './handlers/list-transactions.ts';
import { handleReconcile } from './handlers/reconcile.ts';
import { handleAutoReconcile } from './handlers/auto-reconcile.ts';

// Rotas nomeadas que devem ser verificadas antes do :id
const NAMED_ROUTES = new Set([
  'import',
  'statements',
  'transactions',
  'reconcile',
  'auto-reconcile',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /bank-reconciliation
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'bank-reconciliation');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    console.log('[bank-reconciliation] request', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // POST /bank-reconciliation/import
    if (segment1 === 'import' && method === 'POST') {
      return await handleImport(req, auth);
    }

    // GET /bank-reconciliation/statements
    if (segment1 === 'statements' && method === 'GET') {
      return await handleListStatements(req, auth);
    }

    // GET /bank-reconciliation/transactions?statement_id=X
    if (segment1 === 'transactions' && method === 'GET') {
      return await handleListTransactions(req, auth);
    }

    // POST /bank-reconciliation/reconcile
    if (segment1 === 'reconcile' && method === 'POST') {
      return await handleReconcile(req, auth);
    }

    // POST /bank-reconciliation/auto-reconcile
    if (segment1 === 'auto-reconcile' && method === 'POST') {
      return await handleAutoReconcile(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[bank-reconciliation] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
