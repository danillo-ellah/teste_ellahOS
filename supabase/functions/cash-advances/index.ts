import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleCreate } from './handlers/create.ts';
import { handleList } from './handlers/list.ts';
import { handleGet } from './handlers/get.ts';
import { handleDeposit } from './handlers/deposit.ts';
import { handleReceiptCreate } from './handlers/receipt-create.ts';
import { handleReceiptReview } from './handlers/receipt-review.ts';
import { handleClose } from './handlers/close.ts';

// Rotas nomeadas que devem ser verificadas antes de tratar segment1 como :id
const NAMED_ROUTES = new Set<string>([]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /cash-advances
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'cash-advances');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;
    const segment3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3]
      : null;

    // POST /cash-advances (sem segment1)
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // GET /cash-advances (sem segment1)
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // Rotas com :id (segment1 e UUID)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // GET /cash-advances/:id
      if (!segment2 && method === 'GET') {
        return await handleGet(req, auth, id);
      }

      // POST /cash-advances/:id/deposit
      if (segment2 === 'deposit' && !segment3 && method === 'POST') {
        return await handleDeposit(req, auth, id);
      }

      // POST /cash-advances/:id/receipts (criar comprovante)
      if (segment2 === 'receipts' && !segment3 && method === 'POST') {
        return await handleReceiptCreate(req, auth, id);
      }

      // PATCH /cash-advances/:id/receipts/:rid (revisar comprovante)
      if (segment2 === 'receipts' && segment3 && method === 'PATCH') {
        return await handleReceiptReview(req, auth, id, segment3);
      }

      // POST /cash-advances/:id/close
      if (segment2 === 'close' && !segment3 && method === 'POST') {
        return await handleClose(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[cash-advances] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
