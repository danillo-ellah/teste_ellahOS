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

// Parametros para o email de pedido de NF enviado a fornecedores
export interface NfRequestEmailParams {
  supplierName: string;
  items: Array<{
    description: string;
    amount: number;
    jobCode: string;
  }>;
  companyData: {
    name: string;
    cnpj: string;
    address: string;
    email: string;
  };
  customMessage?: string;
}

// Resultado da montagem do email (assunto + corpo HTML)
export interface NfRequestEmailResult {
  subject: string;
  htmlBody: string;
}

/**
 * Monta o email HTML de pedido de NF para um fornecedor.
 *
 * O HTML gerado e responsivo, com CSS inline, e inclui:
 * - Saudacao com nome do fornecedor
 * - Mensagem customizada (opcional)
 * - Tabela com os itens solicitados (descricao, job, valor)
 * - Total calculado automaticamente
 * - Dados da empresa emissora (razao social, CNPJ, endereco, email)
 * - Instrucao de envio da NF
 */
export function buildNfRequestEmail(
  params: NfRequestEmailParams,
): NfRequestEmailResult {
  const { supplierName, items, companyData, customMessage } = params;

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const subject = `Ellah Filmes - Pedido de Nota Fiscal`;

  // Linhas da tabela de itens
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
            ${escapeHtml(item.description)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; white-space: nowrap;">
            ${escapeHtml(item.jobCode)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right; white-space: nowrap;">
            ${escapeHtml(formatBrl(item.amount))}
          </td>
        </tr>`,
    )
    .join('');

  // Bloco de mensagem customizada (exibido somente se fornecida)
  const customMessageBlock = customMessage
    ? `
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${escapeHtml(customMessage)}
      </p>`
    : '';

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Container principal -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">

        <!-- Card central -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #09090b; padding: 24px 32px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Ellah Filmes
              </p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #a1a1aa;">
                Pedido de Nota Fiscal
              </p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px;">

              <!-- Saudacao -->
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; font-weight: 600;">
                Prezado(a) ${escapeHtml(supplierName)},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                Solicitamos o envio da(s) Nota(s) Fiscal(is) referente(s) ao(s) servico(s) abaixo relacionado(s).
                Por favor, emita a NF com os dados da nossa empresa e envie o arquivo PDF em resposta a este email.
              </p>

              ${customMessageBlock}

              <!-- Tabela de itens -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
                <!-- Cabecalho da tabela -->
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">
                    Descricao do Servico
                  </th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">
                    Job
                  </th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">
                    Valor (R$)
                  </th>
                </tr>
                ${itemRows}
                <!-- Linha de total -->
                <tr style="background-color: #f9fafb;">
                  <td colspan="2" style="padding: 12px 12px; font-size: 14px; font-weight: 700; color: #111827; border-top: 2px solid #e5e7eb;">
                    Total
                  </td>
                  <td style="padding: 12px 12px; font-size: 14px; font-weight: 700; color: #111827; text-align: right; border-top: 2px solid #e5e7eb; white-space: nowrap;">
                    ${escapeHtml(formatBrl(totalAmount))}
                  </td>
                </tr>
              </table>

              <!-- Dados para emissao da NF -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #0c4a6e; text-transform: uppercase; letter-spacing: 0.05em;">
                      Dados para Emissao da Nota Fiscal
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 3px 0; font-size: 13px; color: #374151; width: 110px; font-weight: 600; vertical-align: top;">
                          Razao Social:
                        </td>
                        <td style="padding: 3px 0; font-size: 13px; color: #111827; vertical-align: top;">
                          ${escapeHtml(companyData.name)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0; font-size: 13px; color: #374151; font-weight: 600; vertical-align: top;">
                          CNPJ:
                        </td>
                        <td style="padding: 3px 0; font-size: 13px; color: #111827; vertical-align: top;">
                          ${escapeHtml(companyData.cnpj)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0; font-size: 13px; color: #374151; font-weight: 600; vertical-align: top;">
                          Endereco:
                        </td>
                        <td style="padding: 3px 0; font-size: 13px; color: #111827; vertical-align: top;">
                          ${escapeHtml(companyData.address)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Instrucao de envio -->
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                Envie o arquivo PDF da Nota Fiscal para o email:
              </p>
              <p style="margin: 0 0 24px 0;">
                <a href="mailto:${escapeHtml(companyData.email)}"
                   style="font-size: 14px; color: #0284c7; font-weight: 600; text-decoration: none;">
                  ${escapeHtml(companyData.email)}
                </a>
              </p>

              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                Em caso de duvidas, responda a este email. Agradecemos a parceria.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Este email foi gerado automaticamente pelo sistema ELLAHOS. Nao responda a enderecos de no-reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card central -->

      </td>
    </tr>
  </table>
  <!-- /Container principal -->

</body>
</html>`;

  return { subject, htmlBody };
}

// Parametros para email de notificacao generica
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

  // Bloco do botao de acao (exibido somente se actionUrl for fornecido)
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
