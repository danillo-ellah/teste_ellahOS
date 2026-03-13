// Envio de e-mails via Resend API
// Docs: https://resend.com/docs/api-reference/emails/send-email
//
// Requer RESEND_API_KEY configurado como secret no Supabase.
// Para desenvolvimento, Resend permite enviar de onboarding@resend.dev sem verificacao de dominio.
// Em producao, verificar o dominio (ex: ellahfilmes.com) para enviar como noreply@ellahfilmes.com.

const RESEND_API = 'https://api.resend.com/emails'

interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
  reply_to?: string
}

// Envia e-mail via Resend. Nao lanca excecao — apenas loga erro.
// Uso: fire-and-forget apos registro bem-sucedido.
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY nao configurado — e-mail nao enviado')
    return false
  }

  // Remetente padrao (pode ser sobrescrito por tenant no futuro)
  const from = payload.from ?? 'EllahOS <noreply@ellahfilmes.com>'

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.reply_to,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[email] Resend error ${res.status}: ${body}`)
      return false
    }

    const data = await res.json()
    console.log(`[email] enviado: id=${data.id} to=${payload.to}`)
    return true
  } catch (err) {
    console.error('[email] erro ao enviar:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Template HTML — comprovante de cadastro de equipe
// ---------------------------------------------------------------------------

interface CrewReceiptData {
  freelancer_name: string
  job_code: string
  job_title: string
  tenant_name: string
  job_role: string
  num_days: number
  daily_rate: number
  total: number
  is_veteran: boolean
  registered_at: string // ISO string
}

export function buildCrewReceiptHtml(data: CrewReceiptData): string {
  const formattedRate = formatBRL(data.daily_rate)
  const formattedTotal = formatBRL(data.total)
  const formattedDate = new Date(data.registered_at).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cadastro Confirmado</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#f43f5e,#ec4899,#8b5cf6);"></td>
          </tr>

          <!-- Logo -->
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">
                Ellah<span style="background:linear-gradient(135deg,#f43f5e,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">OS</span>
              </span>
            </td>
          </tr>

          <!-- Success icon + title -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;line-height:56px;text-align:center;font-size:28px;">
                &#10003;
              </div>
              <h1 style="margin:16px 0 4px;font-size:22px;font-weight:700;color:#18181b;">
                Cadastro confirmado!
              </h1>
              <p style="margin:0;font-size:14px;color:#71717a;">
                ${data.freelancer_name}, sua participacao foi registrada.
              </p>
            </td>
          </tr>

          <!-- Job badge -->
          <tr>
            <td style="padding:20px 32px 0;text-align:center;">
              <span style="display:inline-block;background:#fff1f2;color:#e11d48;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;">
                ${escapeHtml(data.job_code)} &mdash; ${escapeHtml(data.job_title)}
              </span>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #f4f4f5;">
                ${detailRow('Funcao', escapeHtml(data.job_role), false)}
                ${detailRow('Diarias', String(data.num_days), false)}
                ${detailRow('Cache/diaria', formattedRate, false)}
                ${detailRow('Total estimado', formattedTotal, true)}
              </table>
            </td>
          </tr>

          <!-- Legal disclaimer -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:11px;color:#92400e;line-height:1.6;">
                      <strong style="color:#78350f;">&#9888; Aviso importante:</strong>
                      Os valores informados sao apenas estimativos e nao representam um contrato ou compromisso financeiro.
                      O valor final sera definido e aprovado pela producao.
                      O preenchimento deste cadastro nao garante a contratacao.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metadata -->
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;">
                ${escapeHtml(data.tenant_name)} &bull; Registrado em ${formattedDate}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:10px;color:#d4d4d8;letter-spacing:0.5px;">
                Powered by EllahOS
              </p>
            </td>
          </tr>
        </table>

        <!-- Outside footer -->
        <p style="margin:24px 0 0;font-size:10px;color:#d4d4d8;text-align:center;">
          Este e-mail foi enviado automaticamente. Nao responda a esta mensagem.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Helpers

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function detailRow(label: string, value: string, highlight: boolean): string {
  const bgColor = highlight ? '#fff1f2' : '#ffffff'
  const valueColor = highlight ? '#e11d48' : '#27272a'
  const valueWeight = highlight ? '800' : '600'
  const fontSize = highlight ? '16px' : '13px'
  const borderTop = 'border-top:1px solid #f4f4f5;'

  return `
    <tr>
      <td style="padding:12px 16px;${borderTop}background:${bgColor};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#71717a;">${label}</td>
            <td style="font-size:${fontSize};color:${valueColor};font-weight:${valueWeight};text-align:right;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`
}
