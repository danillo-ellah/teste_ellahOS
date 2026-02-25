import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error } from '../_shared/response.ts';
import { generateApprovalHandler } from './handlers/aprovacao-interna.ts';
import { previewHandler } from './handlers/preview.ts';

// ========================================================
// pdf-generator — Gera PDFs de aprovacao interna e outros documentos
// Endpoints:
//   POST /pdf-generator/aprovacao-interna   — Gera HTML de aprovacao, salva no Drive
//   GET  /pdf-generator/preview/:type/:jobId — Preview HTML (para debug/aprovacao)
// ========================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts: ['pdf-generator', 'aprovacao-interna'] ou ['pdf-generator', 'preview', 'aprovacao-interna', ':jobId']
  const action = pathParts[1] ?? '';

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    if (req.method === 'POST' && action === 'aprovacao-interna') {
      return await generateApprovalHandler(req, auth);
    }

    if (req.method === 'GET' && action === 'preview') {
      const previewType = pathParts[2] ?? '';
      const jobId = pathParts[3] ?? null;
      return await previewHandler(req, auth, previewType, jobId);
    }

    return error('NOT_FOUND', `Rota nao encontrada: ${req.method} ${action}`, 404);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const appErr = err as { code: string; message: string; statusCode: number };
      return new Response(
        JSON.stringify({ error: { code: appErr.code, message: appErr.message } }),
        { status: appErr.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    console.error('[pdf-generator] erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno no pdf-generator', 500);
  }
});
