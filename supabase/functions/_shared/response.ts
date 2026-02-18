import { corsHeaders } from './cors.ts';
import { AppError, type ErrorCode } from './errors.ts';

// Monta Response JSON com headers CORS
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Resposta de sucesso (200)
export function success<T>(data: T, status = 200): Response {
  return jsonResponse({ data }, status);
}

// Resposta de criacao (201)
export function created<T>(data: T): Response {
  return jsonResponse({ data }, 201);
}

// Meta de paginacao
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Resposta paginada (200)
export function paginated<T>(data: T[], meta: PaginationMeta): Response {
  return jsonResponse({ data, meta }, 200);
}

// Resposta com warnings (201 com avisos)
export function createdWithWarnings<T>(
  data: T,
  warnings: Array<{ code: string; message: string }>,
): Response {
  return jsonResponse({ data, warnings }, 201);
}

// Resposta de erro
export function error(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  return jsonResponse({ error: { code, message, details } }, status);
}

// Converte AppError em Response
export function fromAppError(err: AppError): Response {
  return error(err.code, err.message, err.statusCode, err.details);
}
