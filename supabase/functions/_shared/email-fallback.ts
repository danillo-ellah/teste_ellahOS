// Provedor de email de fallback via Resend API.
// Usado quando o n8n estiver offline ou indisponivel apos MAX_ATTEMPTS retries.
//
// Configuracao necessaria (Supabase Edge Function Secrets):
//   RESEND_API_KEY  — chave da Resend API (https://resend.com)
//   RESEND_FROM     — endereco de envio (ex: "ELLAHOS <noreply@ellahfilmes.com>")
//                     Se ausente, usa "ELLAHOS <noreply@ellahfilmes.com>" como padrao.
//
// Como configurar:
//   supabase secrets set RESEND_API_KEY=re_... --project-ref etvapcxesaxhsvzgaane
//   supabase secrets set RESEND_FROM="ELLAHOS <noreply@ellahfilmes.com>" --project-ref etvapcxesaxhsvzgaane

// Endpoint da Resend API (v1)
const RESEND_API_URL = 'https://api.resend.com/emails';

// Timeout para a chamada HTTP ao Resend (10s e suficiente para email transacional)
const RESEND_TIMEOUT_MS = 10_000;

// Tipo de retorno com diagnostico para facilitar debug nos logs
export interface FallbackEmailResult {
  sent: boolean;
  provider: 'resend' | 'none';
  message_id?: string;
  error?: string;
}

/**
 * Envia um email de fallback usando a Resend API.
 *
 * Deve ser chamado somente quando o canal primario (n8n) falhou definitivamente.
 * Retorna true se o email foi aceito pelo provedor, false caso contrario.
 *
 * Nunca lanca excecao — todos os erros sao logados e retornados no resultado.
 */
export async function sendFallbackEmail(
  to: string,
  subject: string,
  html: string,
  options?: {
    reply_to?: string;
    text?: string;
  },
): Promise<boolean> {
  const result = await _sendViaResend(to, subject, html, options);

  if (result.sent) {
    console.log(
      `[email-fallback] email enviado com sucesso via ${result.provider}: to=${to} message_id=${result.message_id ?? 'n/a'}`,
    );
  } else {
    console.error(
      `[email-fallback] falha ao enviar email via ${result.provider}: to=${to} error=${result.error ?? 'desconhecido'}`,
    );
  }

  return result.sent;
}

// Implementacao interna — chama a Resend API e trata todos os erros
async function _sendViaResend(
  to: string,
  subject: string,
  html: string,
  options?: { reply_to?: string; text?: string },
): Promise<FallbackEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');

  if (!apiKey) {
    console.warn(
      '[email-fallback] RESEND_API_KEY nao configurada — fallback de email indisponivel. ' +
        'Configure com: supabase secrets set RESEND_API_KEY=re_... --project-ref etvapcxesaxhsvzgaane',
    );
    return { sent: false, provider: 'none', error: 'RESEND_API_KEY ausente' };
  }

  const from =
    Deno.env.get('RESEND_FROM') ?? 'ELLAHOS <noreply@ellahfilmes.com>';

  // Montar corpo da requisicao
  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  };

  if (options?.text) {
    body.text = options.text;
  }

  if (options?.reply_to) {
    body.reply_to = options.reply_to;
  }

  try {
    const resp = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => '');
      return {
        sent: false,
        provider: 'resend',
        error: `HTTP ${resp.status}: ${errorBody.slice(0, 300)}`,
      };
    }

    const data = (await resp.json().catch(() => ({}))) as { id?: string };

    return {
      sent: true,
      provider: 'resend',
      message_id: data.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sent: false,
      provider: 'resend',
      error: msg,
    };
  }
}

// ============================================================
// Templates de fallback (HTML minimalista — garantia de entrega)
// Nao usa CSS externo nem imagens para maxima compatibilidade.
// ============================================================

// Escapa caracteres HTML para prevenir injecao em campos de dados do usuario
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Monta o HTML de fallback para eventos criticos do ELLAHOS.
 * Retorna { subject, html } prontos para sendFallbackEmail.
 *
 * Parametros:
 *   eventType  — tipo do evento (ex: 'nf_email_send', 'docuseal_create_batch')
 *   payload    — dados do evento (mostrados como tabela no corpo do email)
 *   errorInfo  — mensagem de erro que causou o fallback (opcional, para contexto do admin)
 */
export function buildFallbackEmailContent(
  eventType: string,
  payload: Record<string, unknown>,
  errorInfo?: string,
): { subject: string; html: string; text: string } {
  const subject = `[ELLAHOS] Notificacao: ${eventType}`;

  // Linhas da tabela de dados do payload (filtra valores nulos e muito longos)
  const payloadRows = Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      const valueStr =
        typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200);
      return `
        <tr>
          <td style="padding: 6px 12px; font-size: 13px; color: #6b7280; font-weight: 600; white-space: nowrap; vertical-align: top; border-bottom: 1px solid #f3f4f6;">${escapeHtml(k)}</td>
          <td style="padding: 6px 12px; font-size: 13px; color: #111827; border-bottom: 1px solid #f3f4f6; word-break: break-all;">${escapeHtml(valueStr)}</td>
        </tr>`;
    })
    .join('');

  const errorBlock = errorInfo
    ? `
    <div style="margin-top: 24px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px 18px;">
      <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em;">Motivo do Fallback</p>
      <p style="margin: 0; font-size: 13px; color: #7f1d1d; font-family: monospace; word-break: break-all;">${escapeHtml(errorInfo.slice(0, 500))}</p>
    </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: #09090b; padding: 20px 28px;">
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">ELLAHOS</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #a1a1aa;">Notificacao de evento critico (envio direto — n8n indisponivel)</p>
    </div>

    <!-- Corpo -->
    <div style="padding: 28px;">
      <h2 style="margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #111827;">Evento: ${escapeHtml(eventType)}</h2>
      <p style="margin: 0 0 20px; font-size: 13px; color: #6b7280;">
        Este email foi enviado pelo fallback do ELLAHOS porque o n8n nao estava disponivel.
        O evento abaixo requer atencao manual.
      </p>

      <!-- Dados do payload -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; font-size: 12px; color: #374151; text-align: left; border-bottom: 1px solid #e5e7eb;">Campo</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #374151; text-align: left; border-bottom: 1px solid #e5e7eb;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${payloadRows || '<tr><td colspan="2" style="padding: 12px; color: #9ca3af; font-size: 13px;">Nenhum dado disponivel</td></tr>'}
        </tbody>
      </table>

      ${errorBlock}

      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
        Acesse o ELLAHOS para verificar o status do evento e tomar a acao necessaria.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 14px 28px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">
        Notificacao automatica — ELLAHOS / Ellah Filmes. Nao responda a este email.
      </p>
    </div>
  </div>
</body>
</html>`;

  // Versao texto puro
  const payloadText = Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      const valueStr =
        typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200);
      return `  ${k}: ${valueStr}`;
    })
    .join('\n');

  const text = [
    `[ELLAHOS] Notificacao de evento critico`,
    `Evento: ${eventType}`,
    ``,
    `Este email foi enviado pelo fallback do ELLAHOS porque o n8n nao estava disponivel.`,
    ``,
    `Dados do evento:`,
    payloadText || '  (nenhum dado)',
    errorInfo ? `\nMotivo do fallback:\n  ${errorInfo.slice(0, 500)}` : '',
    ``,
    `Acesse o ELLAHOS para verificar o status e tomar a acao necessaria.`,
  ]
    .join('\n')
    .trim();

  return { subject, html, text };
}
