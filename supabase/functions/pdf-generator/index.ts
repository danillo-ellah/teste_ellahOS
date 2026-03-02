import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error } from '../_shared/response.ts';
import { generateApprovalHandler } from './handlers/aprovacao-interna.ts';
import { previewHandler } from './handlers/preview.ts';
import { approveInternalDocHandler } from './handlers/approve.ts';

// ========================================================
// pdf-generator — Gera PDFs de aprovacao interna e outros documentos
// Endpoints:
//   POST /pdf-generator/aprovacao-interna        — Gera HTML de aprovacao, salva no Drive
//   GET  /pdf-generator/preview/:type/:jobId     — Preview HTML (para debug/aprovacao)
//   POST /pdf-generator/approve                  — Registra decisao (approve/reject) sobre documento interno
//   GET  /pdf-generator/files/:jobId             — Lista versoes de job_files por category
// ========================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts[0] = 'pdf-generator', pathParts[1] = acao, pathParts[2+] = parametros
  const action = pathParts[1] ?? '';

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    // POST /aprovacao-interna — gera documento de aprovacao interna e salva no Drive
    if (req.method === 'POST' && action === 'aprovacao-interna') {
      return await generateApprovalHandler(req, auth);
    }

    // POST /approve — registra decisao de aprovacao (approve/reject) sobre documento interno
    if (req.method === 'POST' && action === 'approve') {
      return await approveInternalDocHandler(req, auth);
    }

    // GET /preview/:type/:jobId — preview HTML para iframe no frontend
    if (req.method === 'GET' && action === 'preview') {
      const previewType = pathParts[2] ?? '';
      const jobId = pathParts[3] ?? null;
      return await previewHandler(req, auth, previewType, jobId);
    }

    // GET /files/:jobId — lista versoes de job_files da category aprovacao_interna
    if (req.method === 'GET' && action === 'files') {
      const jobId = pathParts[2] ?? null;
      const { listApprovalFilesHandler } = await import('./handlers/list-files.ts');
      return await listApprovalFilesHandler(req, auth, jobId);
    }

    return error('NOT_FOUND', `Rota nao encontrada: ${req.method} ${action}`, 404, undefined, req);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const appErr = err as { code: string; message: string; statusCode: number };
      return new Response(
        JSON.stringify({ error: { code: appErr.code, message: appErr.message } }),
        { status: appErr.statusCode, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }
    console.error('[pdf-generator] erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno no pdf-generator', 500, undefined, req);
  }
});
