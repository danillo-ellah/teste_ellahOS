// Helper para montar emails HTML formatados para pedidos de NF e notificacoes.
// Todos os valores monetarios sao formatados em BRL (R$).
// CSS e aplicado inline para maxima compatibilidade com clientes de email.

// Formata valor numerico como moeda BRL
function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Escapa caracteres HTML para prevenir injecao em campos vindos de dados do usuario
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Email de pedido de NF (usado por nf-processor/request-send.ts)
// ============================================================

export interface NfRequestItem {
  description: string;
  amount: number;
  job_code: string;
  job_title: string;
  financial_record_id: string;
}

export interface CompanyInfo {
  name: string;
  cnpj?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface NfRequestEmailParams {
  supplier_name: string;
  supplier_email: string;
  items: NfRequestItem[];
  company_info: CompanyInfo;
  custom_message?: string;
  reply_to?: string;
}

// Monta o HTML do email de pedido de NF
// Retorna { subject, html, text }
export function buildNfRequestEmail(params: NfRequestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { supplier_name, items, company_info, custom_message } = params;

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // Montar linhas da tabela HTML
  const tableRows = items
    .map(
      (item, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.job_code)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.job_title)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${escapeHtml(formatBrl(item.amount))}</td>
        </tr>`,
    )
    .join('');

  const companyBlock = `
    <strong>${escapeHtml(company_info.name)}</strong><br/>
    ${company_info.cnpj ? `CNPJ: ${escapeHtml(company_info.cnpj)}<br/>` : ''}
    ${company_info.address ? `${escapeHtml(company_info.address)}<br/>` : ''}
    ${company_info.email ? `E-mail: ${escapeHtml(company_info.email)}<br/>` : ''}
    ${company_info.phone ? `Telefone: ${escapeHtml(company_info.phone)}` : ''}
  `;

  const customMessageBlock = custom_message
    ? `<p style="margin: 16px 0; color: #374151;">${escapeHtml(custom_message)}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pedido de Nota Fiscal</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 14px; color: #111827; background: #f3f4f6;">
  <div style="max-width: 680px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: #09090B; padding: 28px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">
        ${escapeHtml(company_info.name)}
      </h1>
      <p style="margin: 4px 0 0; color: #9ca3af; font-size: 13px;">Pedido de Nota Fiscal</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #374151;">
        Ola <strong>${escapeHtml(supplier_name)}</strong>,
      </p>
      <p style="margin: 0 0 24px; color: #374151;">
        Solicitamos o envio da(s) nota(s) fiscal(is) referente(s) ao(s) servico(s) abaixo:
      </p>

      ${customMessageBlock}

      <!-- Tabela de itens -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #111827; color: #ffffff;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Job</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Titulo</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Descricao</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr style="background: #f9fafb;">
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: 700; color: #111827;">Total</td>
            <td style="padding: 12px; text-align: right; font-weight: 700; color: #111827;">${escapeHtml(formatBrl(totalAmount))}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin: 0 0 8px; color: #374151; font-size: 13px;">
        Por favor, encaminhe a(s) nota(s) fiscal(is) em resposta a este e-mail.
      </p>

      <!-- Dados da empresa emissora -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
        <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Dados para emissao da NF</p>
        <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.7;">
          ${companyBlock}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
        Este e-mail foi enviado automaticamente pelo sistema ELLAHOS — ${escapeHtml(company_info.name)}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Versao texto puro para clientes sem suporte a HTML
  const itemsText = items
    .map(item => `  - [${item.job_code}] ${item.job_title}: ${item.description} — ${formatBrl(item.amount)}`)
    .join('\n');

  const text = `
Ola ${supplier_name},

Solicitamos o envio da(s) nota(s) fiscal(is) referente(s) ao(s) servico(s) abaixo:

${custom_message ? custom_message + '\n\n' : ''}Itens:
${itemsText}

Total: ${formatBrl(totalAmount)}

Por favor, encaminhe a(s) nota(s) fiscal(is) em resposta a este e-mail.

---
Dados para emissao da NF:
${company_info.name}
${company_info.cnpj ? 'CNPJ: ' + company_info.cnpj : ''}
${company_info.address ?? ''}
${company_info.email ?? ''}

Este e-mail foi enviado automaticamente pelo sistema ELLAHOS.
  `.trim();

  const jobCodes = [...new Set(items.map(i => i.job_code))].join(', ');
  const subject = `${company_info.name} - Pedido de NF - Job ${jobCodes}`;

  return { subject, html, text };
}

// ============================================================
// Email de notificacao generica
// ============================================================

export interface NotificationEmailParams {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Monta HTML de email de notificacao generica (status de job, alertas, etc).
 * Retorna somente o htmlBody — o assunto deve ser o proprio title.
 */
export function buildNotificationEmail(params: NotificationEmailParams): string {
  const { title, body, actionUrl, actionLabel } = params;

  const actionBlock =
    actionUrl
      ? `
      <div style="text-align: center; margin-top: 24px;">
        <a href="${escapeHtml(actionUrl)}"
           style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 14px; font-weight: 600;
                  text-decoration: none; padding: 12px 28px; border-radius: 6px;">
          ${escapeHtml(actionLabel ?? 'Ver no ELLAHOS')}
        </a>
      </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #09090b; padding: 20px 32px;">
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">Ellah Filmes</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #a1a1aa;">ELLAHOS — Sistema de Producao</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #111827; line-height: 1.3;">
                ${escapeHtml(title)}
              </h2>
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                ${escapeHtml(body)}
              </p>
              ${actionBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Notificacao automatica do ELLAHOS. Nao responda a este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
