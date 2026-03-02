import { corsHeaders, getCorsHeaders } from './cors.ts';
import { AppError, type ErrorCode } from './errors.ts';

// Monta Response JSON com headers CORS.
// Quando req e fornecido, usa CORS dinamico baseado no origin (endpoints autenticados).
// Sem req (undefined), usa corsHeaders com wildcard — reservado para endpoints publicos
// (approve/public, client-portal/public, nf-processor webhook).
function jsonResponse(body: unknown, status: number, req?: Request): Response {
  const cors = req ? getCorsHeaders(req) : corsHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Resposta de sucesso (200).
// Passe req para CORS dinamico (endpoints autenticados) ou omita para wildcard (publicos).
export function success<T>(data: T, status = 200, req?: Request): Response {
  return jsonResponse({ data }, status, req);
}

// Resposta de criacao (201)
export function created<T>(data: T, req?: Request): Response {
  return jsonResponse({ data }, 201, req);
}

// Meta de paginacao
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Resposta paginada (200)
export function paginated<T>(data: T[], meta: PaginationMeta, req?: Request): Response {
  return jsonResponse({ data, meta }, 200, req);
}

// Resposta com warnings (201 com avisos)
export function createdWithWarnings<T>(
  data: T,
  warnings: Array<{ code: string; message: string }>,
  req?: Request,
): Response {
  return jsonResponse({ data, warnings }, 201, req);
}

// Resposta de erro.
// Passe req para CORS dinamico (endpoints autenticados) ou omita para wildcard (publicos).
export function error(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  req?: Request,
): Response {
  return jsonResponse({ error: { code, message, details } }, status, req);
}

// Converte AppError em Response
export function fromAppError(err: AppError, req?: Request): Response {
  return error(err.code, err.message, err.statusCode, err.details, req);
}
