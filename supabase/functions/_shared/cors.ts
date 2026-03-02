// Origins permitidos para endpoints autenticados
const ALLOWED_ORIGINS = [
  'https://teste-ellah-os.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Retorna headers CORS dinamicos baseados no origin do request.
// Se o origin nao esta na lista de permitidos, retorna o primeiro origin da lista
// (producao). O browser vai bloquear a requisicao de um origin nao autorizado.
// Header Vary: Origin e necessario para que CDN/proxies cacheiem corretamente
// por origin.
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin',
  };
}

// corsHeaders com wildcard — mantido para uso explicito por endpoints publicos
// (ex: approvals/public, client-portal/public) que precisam aceitar qualquer origin.
// Endpoints autenticados devem usar getCorsHeaders(req) ou handleCors(req).
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// Responde pre-flight OPTIONS request com CORS dinamico baseado no origin.
// Retorna null se nao for OPTIONS.
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
