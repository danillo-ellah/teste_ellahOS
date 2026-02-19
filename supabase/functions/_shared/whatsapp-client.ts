// ========================================================
// WhatsApp Client — Evolution API v2 integration
// sanitizePhone, buildMessageFromTemplate, sendText
// ========================================================

// --- Types ---

export interface SendTextOptions {
  instanceUrl: string;    // ex: "https://evolution.empresa.com"
  instanceName: string;   // ex: "ellah-prod"
  apiKey: string;
  phone: string;          // qualquer formato; sanitizado internamente
  message: string;
}

export interface SendTextResult {
  success: boolean;
  externalMessageId: string | null;
  error?: string;
}

export type WhatsAppTemplate =
  | 'payment_approaching'
  | 'shooting_date_approaching'
  | 'deliverable_overdue';

// --- sanitizePhone ---
// Evolution API espera: 55XXXXXXXXXXX (codigo pais + DDD + numero, apenas digitos)
// Remove tudo que nao e digito, prepend "55" se nao comeca com 55
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

// --- buildMessageFromTemplate ---
// Renderiza template por nome + dados via interpolacao simples {key}
// Keys ausentes ficam como {key} no texto (visivel, nao quebra)
export function buildMessageFromTemplate(
  template: WhatsAppTemplate | string,
  data: Record<string, string | number | undefined>,
): string {
  const TEMPLATES: Record<string, string> = {
    payment_approaching:
      '*Pagamento em {days_until_due} dia(s)* \u{1F4B0}\nJob: {job_code}\nR$ {amount}\nVence: {due_date}',
    shooting_date_approaching:
      '*Diaria em 3 dias* \u{1F3AC}\nJob: {job_code}\nData: {shooting_date}\nLocal: {location}',
    deliverable_overdue:
      '*Entregavel atrasado* \u{26A0}\u{FE0F}\nJob: {job_code}\n{deliverable}\nAtrasado {days_overdue} dia(s) (prazo: {delivery_date})',
  };

  const raw = TEMPLATES[template] ?? template;
  return raw.replace(/\{(\w+)\}/g, (match, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

// --- sendText ---
// POST /message/sendText/{instanceName}
// Evolution API v2: payload { number, text }, header { apikey }
// Retorna external message ID no sucesso; lanca erro em falha HTTP.
export async function sendText(opts: SendTextOptions): Promise<SendTextResult> {
  const phone = sanitizePhone(opts.phone);
  const baseUrl = opts.instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/message/sendText/${opts.instanceName}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': opts.apiKey,
      },
      body: JSON.stringify({ number: phone, text: opts.message }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Evolution API network error: ${msg}`);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Evolution API HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  const body = await resp.json().catch(() => ({}));
  // Evolution v2 retorna: { key: { id: "..." }, ... }
  const externalId = body?.key?.id ?? body?.id ?? null;

  return { success: true, externalMessageId: externalId };
}
