import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handlePay } from './handlers/pay.ts';
import { handleUndoPay } from './handlers/undo-pay.ts';
import { handleBatchPreview } from './handlers/batch-preview.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /payment-manager
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'payment-manager');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // POST /payment-manager/pay
    if (segment1 === 'pay' && !segment2 && method === 'POST') {
      return await handlePay(req, auth);
    }

    // POST /payment-manager/undo-pay/:id
    if (segment1 === 'undo-pay' && segment2 && method === 'POST') {
      return await handleUndoPay(req, auth, segment2);
    }

    // GET /payment-manager/batch-preview
    if (segment1 === 'batch-preview' && !segment2 && method === 'GET') {
      return await handleBatchPreview(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[payment-manager] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
