// ========================================================
// WhatsApp Client — Z-API integration
// Mesma interface publica do whatsapp-client.ts (Evolution API)
// Docs: https://developer.z-api.io/
// ========================================================

// --- Types ---

export interface ZapiConfig {
  instanceId: string;    // ID da instancia Z-API
  token: string;         // Token da instancia Z-API
  clientToken: string;   // Security token do painel Z-API (Client-Token header)
}

export interface SendTextResult {
  success: boolean;
  externalMessageId: string | null;
  error?: string;
}

export interface SendImageResult {
  success: boolean;
  externalMessageId: string | null;
  error?: string;
}

// --- sanitizePhone ---
// Z-API espera: 5511999999999 (codigo pais 55 + DDD + numero, apenas digitos)
// Remove tudo que nao e digito, prepend "55" se nao comeca com 55
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

// Monta a base URL da instancia Z-API
function instanceBaseUrl(config: ZapiConfig): string {
  return `https://api.z-api.io/instances/${config.instanceId}/token/${config.token}`;
}

// --- sendText ---
// POST /send-text
// Payload: { phone, message }
// Header: { Client-Token: clientToken }
export async function sendText(opts: {
  config: ZapiConfig;
  phone: string;
  text: string;
}): Promise<SendTextResult> {
  const url = `${instanceBaseUrl(opts.config)}/send-text`;
  const sanitized = sanitizePhone(opts.phone);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': opts.config.clientToken,
      },
      body: JSON.stringify({
        phone: sanitized,
        message: opts.text,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[zapi-client] sendText network error:', msg);
    return { success: false, externalMessageId: null, error: `Z-API network error: ${msg}` };
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    const errMsg = `Z-API HTTP ${resp.status}: ${body.slice(0, 300)}`;
    console.error('[zapi-client] sendText failed:', errMsg);
    return { success: false, externalMessageId: null, error: errMsg };
  }

  const data = await resp.json().catch(() => ({}));
  // Z-API retorna: { messageId: "...", zaapId: "..." }
  const externalMessageId: string | null = data?.messageId ?? data?.zaapId ?? null;

  console.log('[zapi-client] sendText OK. messageId:', externalMessageId, 'phone:', sanitized);
  return { success: true, externalMessageId };
}

// --- sendImage ---
// POST /send-image
// Payload: { phone, image: "url", caption? }
export async function sendImage(opts: {
  config: ZapiConfig;
  phone: string;
  imageUrl: string;
  caption?: string;
}): Promise<SendImageResult> {
  const url = `${instanceBaseUrl(opts.config)}/send-image`;
  const sanitized = sanitizePhone(opts.phone);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': opts.config.clientToken,
      },
      body: JSON.stringify({
        phone: sanitized,
        image: opts.imageUrl,
        caption: opts.caption ?? '',
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[zapi-client] sendImage network error:', msg);
    return { success: false, externalMessageId: null, error: `Z-API network error: ${msg}` };
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    const errMsg = `Z-API HTTP ${resp.status}: ${body.slice(0, 300)}`;
    console.error('[zapi-client] sendImage failed:', errMsg);
    return { success: false, externalMessageId: null, error: errMsg };
  }

  const data = await resp.json().catch(() => ({}));
  const externalMessageId: string | null = data?.messageId ?? data?.zaapId ?? null;

  console.log('[zapi-client] sendImage OK. messageId:', externalMessageId, 'phone:', sanitized);
  return { success: true, externalMessageId };
}

// Re-exporta o buildMessageFromTemplate do whatsapp-client para compatibilidade
export { buildMessageFromTemplate } from './whatsapp-client.ts';
