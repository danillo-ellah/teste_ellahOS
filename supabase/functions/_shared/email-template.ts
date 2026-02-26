// Helper para montar emails HTML formatados para pedidos de NF e notificacoes.
// Todos os valores monetarios sao formatados em BRL (R$).
// CSS e aplicado inline para maxima compatibilidade com clientes de email.
// Template de NF segue o modelo oficial da planilha de custos da Ellah Filmes.

// Formata valor numerico como moeda BRL
function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formata data no padrao brasileiro extenso: "Domingo, 08 de Fevereiro de 2026"
function formatDatePtBr(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${days[date.getUTCDay()]}, ${day} de ${months[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
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
// Modelo: planilha de custos Ellah Filmes (Apps Script)
// ============================================================

export interface NfRequestItem {
  description: string;
  amount: number;
  job_code: string;
  job_title: string;
  job_client_name: string;
  financial_record_id: string;
  due_date: string | null;
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

// Monta o HTML do email de pedido de NF (modelo planilha Ellah)
// Retorna { subject, html, text }
export function buildNfRequestEmail(params: NfRequestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { supplier_name, items, company_info, custom_message } = params;

  // --- Subject: "{job_code} - {client} - {title} / {supplier} / SOLICITACAO DE NOTA" ---
  const jobParts = [...new Map(items.map(i => [i.job_code, i])).values()];
  const subjectJobId = jobParts
    .map(i => {
      const parts = [i.job_code, i.job_client_name, i.job_title].filter(Boolean);
      return parts.join(' - ');
    })
    .join(', ');
  const subject = `${subjectJobId} / ${supplier_name} / SOLICITAÇÃO DE NOTA`;

  // --- Bloco: DISCRIMINACAO DOS SERVICOS (1 card por item) ---
  const itemCards = items
    .map((item) => {
      const jobLabel = [item.job_code, item.job_client_name, item.job_title].filter(Boolean).join(' - ');
      const dueDateLabel = item.due_date ? formatDatePtBr(item.due_date) : 'A definir';
      return `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; font-weight: 600; width: 200px; border-bottom: 1px solid #e5e7eb;">IDENTIFICAÇÃO DO JOB</td>
              <td style="padding: 10px 14px; font-size: 14px; color: #111827; font-weight: 700; border-bottom: 1px solid #e5e7eb;">${escapeHtml(jobLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">VALOR DA NOTA</td>
              <td style="padding: 10px 14px; font-size: 14px; color: #111827; font-weight: 700; border-bottom: 1px solid #e5e7eb;">${escapeHtml(formatBrl(item.amount))}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">DATA PARA PAGAMENTO</td>
              <td style="padding: 10px 14px; font-size: 14px; color: #111827; border-bottom: 1px solid #e5e7eb;">${escapeHtml(dueDateLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">SERVIÇO PRESTADO</td>
              <td style="padding: 10px 14px; font-size: 14px; color: #111827; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; font-weight: 600;">NOME COMPLETO DO PRESTADOR</td>
              <td style="padding: 10px 14px; font-size: 14px; color: #111827;">Informar caso seja diferente da Razão Social</td>
            </tr>
          </table>`;
    })
    .join('');

  const customMessageBlock = custom_message
    ? `<p style="margin: 16px 0; color: #374151;">${escapeHtml(custom_message)}</p>`
    : '';

  const companyEmail = company_info.email ?? 'financeiro@ellahfilmes.com';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Solicitação de Nota Fiscal</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 14px; color: #111827; background: #f3f4f6;">
  <div style="max-width: 680px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: #09090B; padding: 28px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">
        ${escapeHtml(company_info.name)}
      </h1>
      <p style="margin: 4px 0 0; color: #9ca3af; font-size: 13px;">Solicitação de Nota Fiscal</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #374151;">
        Prezado(a) <strong>${escapeHtml(supplier_name)}</strong>,
      </p>
      <p style="margin: 0 0 24px; color: #374151;">
        Seguem as instruções para a emissão da Nota Fiscal:
      </p>

      ${customMessageBlock}

      <!-- OBSERVACOES IMPORTANTES -->
      <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-weight: 700; color: #92400E; font-size: 14px;">OBSERVAÇÕES IMPORTANTES:</p>
        <ol style="margin: 0; padding-left: 20px; color: #92400E; font-size: 13px; line-height: 1.7;">
          <li>Caso o descritivo da nota esteja incompleto, sem as informações apresentadas no quadro abaixo, a Nota será <strong>RECUSADA</strong> e a liberação dos recursos ficará pendente até o envio da Nota corretamente preenchida.</li>
          <li><strong>NÃO</strong> enviar Dados Bancários no corpo do Email. Estes dados devem ser informados na <strong>DESCRIÇÃO da NFe</strong>.</li>
          <li>É <strong>OBRIGATÓRIO</strong> o envio da NFe para o email: <strong>${escapeHtml(companyEmail)}</strong> e <strong>RESPONDER O E-MAIL ENVIADO COM A NOTA</strong>.</li>
        </ol>
      </div>

      <!-- EMISSAO DE NOTA PARA (TOMADOR DO SERVICO) -->
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-weight: 700; color: #111827; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Emissão de Nota Para (Tomador do Serviço)</p>
        <table style="width: 100%; border-collapse: collapse;">
          ${company_info.cnpj ? `<tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; width: 140px; vertical-align: top;">CNPJ:</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827; font-weight: 700;">${escapeHtml(company_info.cnpj)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; vertical-align: top;">RAZÃO SOCIAL:</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827; font-weight: 700;">${escapeHtml(company_info.name)}</td>
          </tr>
          ${company_info.address ? `<tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; vertical-align: top;">ENDEREÇO:</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827;">${escapeHtml(company_info.address)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; vertical-align: top;">EMAIL:</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827; font-weight: 700;">${escapeHtml(companyEmail)} <span style="color: #DC2626; font-size: 11px;">(envio OBRIGATÓRIO)</span></td>
          </tr>
        </table>
      </div>

      <!-- DISCRIMINACAO DOS SERVICOS -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 4px; font-weight: 700; color: #111827; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Discriminação dos Serviços</p>
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 12px;">Os dados abaixo <strong>DEVEM</strong> constar no "corpo" da NFe</p>
        ${itemCards}
      </div>

      <!-- DADOS BANCARIOS -->
      <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #0C4A6E; font-size: 13px;">DADOS BANCÁRIOS: OBRIGATÓRIOS</p>
        <p style="margin: 0; color: #0C4A6E; font-size: 12px; line-height: 1.7;">
          Informar na descrição da NFe: Nome do Banco, Número da Agência, Número da Conta + Dígito,
          Tipo da Conta (Corrente ou Poupança), Nome do Favorecido, Tipo de Pessoa (PF ou PJ),
          Número do CPF (se PF), Chave PIX (se for a preferência).
        </p>
      </div>

      <!-- COMO ENVIAR SUA NOTA FISCAL (checklist a prova de erros) -->
      <div style="background: #ECFDF5; border: 2px solid #10B981; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 14px; font-weight: 800; color: #065F46; font-size: 15px; text-transform: uppercase; letter-spacing: 0.03em;">COMO ENVIAR SUA NOTA FISCAL</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 36px;">
              <span style="display: inline-block; background: #10B981; color: #fff; font-weight: 800; font-size: 16px; width: 28px; height: 28px; text-align: center; line-height: 28px; border-radius: 50%;">1</span>
            </td>
            <td style="padding: 8px 0; font-size: 14px; color: #065F46; line-height: 1.5;">
              <strong>RESPONDA ESTE EMAIL</strong> — não crie um email novo. O código no assunto identifica seu pagamento automaticamente.
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top;">
              <span style="display: inline-block; background: #10B981; color: #fff; font-weight: 800; font-size: 16px; width: 28px; height: 28px; text-align: center; line-height: 28px; border-radius: 50%;">2</span>
            </td>
            <td style="padding: 8px 0; font-size: 14px; color: #065F46; line-height: 1.5;">
              <strong>ANEXE A NOTA EM PDF</strong> — clique em "Anexar arquivo" e selecione o PDF da sua NF. O arquivo deve estar <strong>ANEXADO no email</strong>.
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top;">
              <span style="display: inline-block; background: #10B981; color: #fff; font-weight: 800; font-size: 16px; width: 28px; height: 28px; text-align: center; line-height: 28px; border-radius: 50%;">3</span>
            </td>
            <td style="padding: 8px 0; font-size: 14px; color: #065F46; line-height: 1.5;">
              <strong>NÃO ALTERE O ASSUNTO</strong> — o assunto do email contém o código do seu serviço. Se alterar, não conseguiremos identificar a nota.
            </td>
          </tr>
        </table>
      </div>

      <!-- NAO SERA ACEITO (alerta vermelho) -->
      <div style="background: #FEF2F2; border: 2px solid #EF4444; border-radius: 8px; padding: 18px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-weight: 800; color: #991B1B; font-size: 14px;">&#10060; NÃO SERÁ ACEITO:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #991B1B; line-height: 1.5;">
              &#10007; Nota em formato de <strong>IMAGEM</strong> (foto, print de tela, JPG, PNG)
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #991B1B; line-height: 1.5;">
              &#10007; <strong>LINK</strong> para download (Google Drive, WeTransfer, etc.) — a nota DEVE estar <strong>anexada</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #991B1B; line-height: 1.5;">
              &#10007; Email <strong>novo</strong> sem o código de identificação no assunto
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #991B1B; line-height: 1.5;">
              &#10007; Nota sem <strong>dados bancários</strong> na descrição da NFe
            </td>
          </tr>
        </table>
        <p style="margin: 12px 0 0; color: #991B1B; font-size: 13px; font-weight: 700; line-height: 1.5;">
          &#9888; Notas enviadas fora do padrão serão <strong>DEVOLVIDAS</strong> e o pagamento só será liberado após o reenvio correto.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
        Esta é uma mensagem automática. Em caso de dúvidas ou problemas, responda este e-mail.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Versao texto puro para clientes sem suporte a HTML
  const itemsText = items
    .map(item => {
      const jobLabel = [item.job_code, item.job_client_name, item.job_title].filter(Boolean).join(' - ');
      const dueDate = item.due_date ? formatDatePtBr(item.due_date) : 'A definir';
      return `  JOB: ${jobLabel}\n  VALOR: ${formatBrl(item.amount)}\n  PAGAMENTO: ${dueDate}\n  SERVIÇO: ${item.description}`;
    })
    .join('\n\n');

  const text = `
Prezado(a) ${supplier_name},

Seguem as instruções para a emissão da Nota Fiscal.

${custom_message ? custom_message + '\n\n' : ''}OBSERVAÇÕES IMPORTANTES:
1. NF será RECUSADA se o descritivo estiver incompleto.
2. NÃO enviar Dados Bancários no corpo do Email — informar na DESCRIÇÃO da NFe.
3. OBRIGATÓRIO enviar NFe para ${companyEmail} e RESPONDER ESTE EMAIL.

---
EMISSÃO DE NOTA PARA (TOMADOR DO SERVIÇO):
${company_info.cnpj ? 'CNPJ: ' + company_info.cnpj : ''}
RAZÃO SOCIAL: ${company_info.name}
${company_info.address ? 'ENDEREÇO: ' + company_info.address : ''}
EMAIL: ${companyEmail}

---
DISCRIMINAÇÃO DOS SERVIÇOS (devem constar no corpo da NFe):

${itemsText}

---
DADOS BANCÁRIOS (OBRIGATÓRIOS na descrição da NFe):
Informar: Nome do Banco, Agência, Conta + Dígito, Tipo da Conta, Nome do Favorecido, PF ou PJ, CPF, Chave PIX.

---
COMO ENVIAR SUA NOTA FISCAL:
1. RESPONDA ESTE EMAIL (não crie um email novo — o código no assunto identifica seu pagamento)
2. ANEXE A NOTA EM PDF (clique em "Anexar arquivo" e selecione o PDF)
3. NÃO ALTERE O ASSUNTO do email

NÃO SERÁ ACEITO:
x Nota em formato de IMAGEM (foto, print de tela, JPG, PNG)
x LINK para download (Google Drive, WeTransfer, etc.) — a nota DEVE estar ANEXADA
x Email novo sem o código de identificação no assunto
x Nota sem dados bancários na descrição da NFe

Notas enviadas fora do padrão serão DEVOLVIDAS e o pagamento só será liberado após o reenvio correto.

Esta é uma mensagem automática. Em caso de dúvidas, responda este e-mail.
  `.trim();

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
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #a1a1aa;">ELLAHOS — Sistema de Produção</p>
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
                Notificação automática do ELLAHOS. Não responda a este email.
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
