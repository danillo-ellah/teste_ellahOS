// POST /budget-letter/:id/export
//
// Converte o conteudo Markdown de uma Carta Orcamento em HTML profissional
// pronto para impressao / geracao de PDF pelo frontend (via window.print() ou html2pdf).
// Retorna HTML completo como string no campo data.html.

import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles com permissao de exportacao
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Conversao Markdown -> HTML (implementacao interna sem dependencias externas)
// ---------------------------------------------------------------------------

/**
 * Converte Markdown estruturado para HTML.
 * Suporta: h1-h3 (#, ##, ###), negrito (**), italico (*),
 *          tabelas (|col|col|), listas (- item), paragrafos.
 */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const htmlLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  function flushTable(): void {
    if (tableRows.length === 0) return;

    // Primeira linha = header, segunda = separador (---), restante = body
    const [headerLine, , ...bodyLines] = tableRows;
    const headers = headerLine
      .split('|')
      .map((h) => h.trim())
      .filter(Boolean);

    const thCells = headers
      .map(
        (h) =>
          `<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; background: #f9fafb;">${escapeHtml(h)}</th>`,
      )
      .join('');

    const trRows = bodyLines
      .filter((l) => l.trim().startsWith('|'))
      .map((l) => {
        const cells = l
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);

        const tdCells = cells
          .map(
            (c) =>
              `<td style="padding: 10px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${applyInline(c)}</td>`,
          )
          .join('');

        return `<tr>${tdCells}</tr>`;
      })
      .join('\n');

    htmlLines.push(
      `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">`,
      `<thead><tr>${thCells}</tr></thead>`,
      `<tbody>${trRows}</tbody>`,
      `</table>`,
    );

    tableRows = [];
    inTable = false;
  }

  function flushList(): void {
    if (listItems.length === 0) return;
    const items = listItems
      .map(
        (item) =>
          `<li style="margin-bottom: 4px; font-size: 12px; color: #374151;">${applyInline(item)}</li>`,
      )
      .join('');
    htmlLines.push(
      `<ul style="margin: 12px 0 16px 20px; padding: 0; list-style: disc;">`,
      items,
      `</ul>`,
    );
    listItems = [];
    inList = false;
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyInline(text: string): string {
    // Negrito: **texto** -> <strong>
    let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italico: *texto* -> <em>
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Codigo inline: `texto`
    result = result.replace(
      /`(.+?)`/g,
      '<code style="font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px;">$1</code>',
    );
    return result;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Linha de tabela
    if (line.startsWith('|')) {
      if (inList) flushList();
      inTable = true;
      tableRows.push(line);
      continue;
    }

    // Saiu da tabela — flush
    if (inTable && !line.startsWith('|')) {
      flushTable();
    }

    // Item de lista
    if (/^[-*]\s+/.test(line)) {
      if (inTable) flushTable();
      inList = true;
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    // Saiu da lista — flush
    if (inList && !/^[-*]\s+/.test(line)) {
      flushList();
    }

    // Headings
    if (line.startsWith('### ')) {
      htmlLines.push(
        `<h3 style="margin: 24px 0 8px 0; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; background-color: #1f2937; padding: 6px 10px; border-radius: 4px;">${escapeHtml(line.slice(4))}</h3>`,
      );
      continue;
    }

    if (line.startsWith('## ')) {
      htmlLines.push(
        `<h2 style="margin: 28px 0 10px 0; font-size: 16px; font-weight: 700; color: #09090b; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">${escapeHtml(line.slice(3))}</h2>`,
      );
      continue;
    }

    if (line.startsWith('# ')) {
      htmlLines.push(
        `<h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.5px;">${escapeHtml(line.slice(2))}</h1>`,
      );
      continue;
    }

    // Linha horizontal
    if (/^---+$/.test(line.trim())) {
      htmlLines.push(`<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />`);
      continue;
    }

    // Linha em branco
    if (line.trim() === '') {
      htmlLines.push(`<div style="height: 8px;"></div>`);
      continue;
    }

    // Paragrafo normal
    htmlLines.push(
      `<p style="margin: 0 0 12px 0; font-size: 12px; color: #374151; line-height: 1.6;">${applyInline(escapeHtml(line))}</p>`,
    );
  }

  // Flush pendentes
  if (inTable) flushTable();
  if (inList) flushList();

  return htmlLines.join('\n');
}

// ---------------------------------------------------------------------------
// Montagem do HTML completo de exportacao
// ---------------------------------------------------------------------------

function buildExportHtml(params: {
  content: string;
  companyName: string;
  jobCode: string;
  jobTitle: string;
  clientName: string;
  version: number;
}): string {
  const { content, companyName, jobCode, jobTitle, clientName, version } = params;

  const hoje = new Date();
  const dataHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const bodyHtml = markdownToHtml(content);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Carta Orcamento — ${escapeHtml(jobCode)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 20mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #111827;
      background: #ffffff;
      max-width: 794px;
      margin: 0 auto;
      padding: 32px 40px;
    }
  </style>
</head>
<body>

  <!-- CABECALHO DA PAGINA -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 28px; border-bottom: 3px solid #09090b; padding-bottom: 16px;">
    <tr>
      <td style="vertical-align: middle;">
        <p style="font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.5px; margin: 0;">
          ${escapeHtml(companyName)}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
          Producao Audiovisual
        </p>
      </td>
      <td style="text-align: right; vertical-align: top; white-space: nowrap;">
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #09090b; text-transform: uppercase; letter-spacing: 0.05em;">
          Carta Orcamento
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">Job: <strong>${escapeHtml(jobCode)}</strong></p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Versao: ${version}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Emitido em: ${dataHoje}</p>
      </td>
    </tr>
  </table>

  <!-- META DO JOB -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      <td style="width: 50%; padding: 10px 14px; vertical-align: top; border-right: 1px solid #e5e7eb;">
        <p style="font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">
          Projeto
        </p>
        <p style="font-size: 13px; color: #111827; font-weight: 600; margin: 0;">
          ${escapeHtml(jobTitle)}
        </p>
      </td>
      <td style="width: 50%; padding: 10px 14px; vertical-align: top;">
        <p style="font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">
          Cliente
        </p>
        <p style="font-size: 13px; color: #111827; font-weight: 600; margin: 0;">
          ${escapeHtml(clientName)}
        </p>
      </td>
    </tr>
  </table>

  <!-- CORPO DO DOCUMENTO (Markdown convertido) -->
  <div style="margin-bottom: 40px;">
    ${bodyHtml}
  </div>

  <!-- AREA DE ASSINATURAS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="border-top: 1px solid #374151; padding-top: 8px; margin-top: 48px;">
          <p style="font-size: 12px; color: #374151; font-weight: 600;">${escapeHtml(companyName)}</p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Produtora</p>
        </div>
      </td>
      <td style="width: 10%;"></td>
      <td style="width: 45%; text-align: center;">
        <div style="border-top: 1px solid #374151; padding-top: 8px; margin-top: 48px;">
          <p style="font-size: 12px; color: #374151; font-weight: 600;">${escapeHtml(clientName)}</p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Cliente / Aprovador</p>
        </div>
      </td>
    </tr>
  </table>

  <!-- RODAPE -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
    <tr>
      <td style="text-align: center; font-size: 10px; color: #9ca3af;">
        Documento gerado pelo ELLAHOS em ${dataHoje} — Job ${escapeHtml(jobCode)} v${version}.
        Este documento nao tem valor juridico sem assinatura das partes.
      </td>
    </tr>
  </table>

  <!-- Botao de impressao (apenas no browser, oculto no PDF) -->
  <div class="no-print" style="position: fixed; bottom: 24px; right: 24px;">
    <button
      onclick="window.print()"
      style="background: #09090b; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
      Imprimir / Salvar PDF
    </button>
  </div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function exportPdfHandler(
  req: Request,
  auth: AuthContext,
  fileId: string,
): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para exportar Carta Orcamento',
      403,
    );
  }

  // Validar fileId
  if (!fileId || !UUID_REGEX.test(fileId)) {
    throw new AppError('VALIDATION_ERROR', 'ID do arquivo deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(
    `[budget-letter/export] user=${auth.userId} tenant=${auth.tenantId} file_id=${fileId}`,
  );

  // 1. Buscar o arquivo de carta orcamento
  const { data: jobFile, error: fileError } = await supabase
    .from('job_files')
    .select('id, job_id, version, metadata, category, file_name')
    .eq('id', fileId)
    .eq('tenant_id', auth.tenantId)
    .eq('category', 'budget_letter')
    .is('deleted_at', null)
    .maybeSingle();

  if (fileError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao buscar arquivo: ${fileError.message}`,
      500,
    );
  }

  if (!jobFile) {
    throw new AppError('NOT_FOUND', 'Carta Orcamento nao encontrada', 404);
  }

  const meta = (jobFile.metadata as Record<string, unknown>) ?? {};
  const content = meta.content as string | undefined;

  if (!content) {
    throw new AppError(
      'NOT_FOUND',
      'Conteudo da Carta Orcamento nao encontrado. Regenere a carta.',
      404,
    );
  }

  const jobId = jobFile.job_id as string;
  const version = (jobFile.version as number) ?? 1;

  // 2. Buscar dados do job para o cabecalho
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      id, code, title,
      clients ( name, company_name )
    `)
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  const jobCode = (job?.code as string) ?? jobId.slice(0, 8);
  const jobTitle = (job?.title as string) ?? 'Projeto';
  const clientData = (job?.clients as Record<string, unknown>) ?? {};
  const clientName =
    (clientData.name as string) ?? (clientData.company_name as string) ?? 'Cliente';

  // 3. Buscar nome da produtora
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('name, settings')
    .eq('id', auth.tenantId)
    .single();

  const tenantSettings = (tenant?.settings as Record<string, unknown>) ?? {};
  const companyInfo = (tenantSettings.company_info as Record<string, unknown>) ?? {};
  const companyName =
    (companyInfo.name as string) || (tenant?.name as string) || 'Ellah Filmes';

  // 4. Montar HTML
  const html = buildExportHtml({
    content,
    companyName,
    jobCode,
    jobTitle,
    clientName,
    version,
  });

  console.log(
    `[budget-letter/export] HTML montado (${html.length} chars) para file ${fileId} job ${jobId} v${version}`,
  );

  return success(
    {
      file_id: fileId,
      job_id: jobId,
      version,
      html,
      html_length: html.length,
      exported_at: new Date().toISOString(),
    },
    200,
    req,
  );
}
