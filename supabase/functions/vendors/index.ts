import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { createVendor } from './handlers/create.ts';
import { listVendors } from './handlers/list.ts';
import { getVendor } from './handlers/get.ts';
import { updateVendor } from './handlers/update.ts';
import { deleteVendor } from './handlers/delete.ts';
import { mergeVendor } from './handlers/merge.ts';
import { suggestVendors } from './handlers/suggest.ts';
import { listBanks } from './handlers/banks.ts';
import { createBankAccount } from './handlers/bank-accounts-create.ts';
import { updateBankAccount } from './handlers/bank-accounts-update.ts';
import { deleteBankAccount } from './handlers/bank-accounts-delete.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Encontrar indice do segmento 'vendors' na URL
    // Formato esperado: /functions/v1/vendors[/segment1[/segment2[/segment3]]]
    const fnIndex = pathSegments.findIndex((s) => s === 'vendors');
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;
    const segment2 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 2
        ? pathSegments[fnIndex + 2]
        : null;
    const segment3 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 3
        ? pathSegments[fnIndex + 3]
        : null;

    const method = req.method;

    console.log('[vendors/index] request recebido', {
      method,
      segment1,
      segment2,
      segment3,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // === Rotas estáticas (ANTES do :id para evitar conflito) ===

    // GET /vendors/suggest?q=xxx
    if (method === 'GET' && segment1 === 'suggest') {
      return await suggestVendors(req, auth);
    }

    // GET /vendors/banks
    if (method === 'GET' && segment1 === 'banks') {
      return await listBanks(req, auth);
    }

    // === Rotas de vendors base ===

    // GET /vendors
    if (method === 'GET' && !segment1) {
      return await listVendors(req, auth);
    }

    // POST /vendors
    if (method === 'POST' && !segment1) {
      return await createVendor(req, auth);
    }

    // GET /vendors/:id
    if (method === 'GET' && segment1 && !segment2) {
      return await getVendor(req, auth, segment1);
    }

    // PATCH /vendors/:id
    if (method === 'PATCH' && segment1 && !segment2) {
      return await updateVendor(req, auth, segment1);
    }

    // DELETE /vendors/:id
    if (method === 'DELETE' && segment1 && !segment2) {
      return await deleteVendor(req, auth, segment1);
    }

    // === Rotas de sub-recursos ===

    // POST /vendors/:id/merge
    if (method === 'POST' && segment1 && segment2 === 'merge') {
      return await mergeVendor(req, auth, segment1);
    }

    // POST /vendors/:id/bank-accounts
    if (method === 'POST' && segment1 && segment2 === 'bank-accounts' && !segment3) {
      return await createBankAccount(req, auth, segment1);
    }

    // PATCH /vendors/:id/bank-accounts/:bid
    if (method === 'PATCH' && segment1 && segment2 === 'bank-accounts' && segment3) {
      return await updateBankAccount(req, auth, segment1, segment3);
    }

    // DELETE /vendors/:id/bank-accounts/:bid
    if (method === 'DELETE' && segment1 && segment2 === 'bank-accounts' && segment3) {
      return await deleteBankAccount(req, auth, segment1, segment3);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[vendors] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
