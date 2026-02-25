// Helper para geracao de PDFs server-side.
//
// Estrategia v1: Este modulo monta HTML formatado pronto para conversao em PDF.
// A conversao HTML -> PDF ocorre na Edge Function pdf-generator (via Puppeteer/html-to-pdf).
// O HTML usa CSS inline para maxima fidelidade na conversao.
//
// Referencia arquitetural: docs/architecture/fase-9-automacoes-architecture.md, secao 13.3

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Formata valor numerico como moeda BRL
function formatBrl(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formata data ISO (YYYY-MM-DD ou ISO completo) para DD/MM/YYYY
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Escapa caracteres HTML para prevenir injecao de markup
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Retorna valor de um campo ou '—' se nulo/undefined
function val(v: unknown): string {
  if (v == null || v === '') return '—';
  return escapeHtml(String(v));
}

// ===== Parametros =====

export interface ApprovalInternalHtmlParams {
  job: Record<string, unknown>;
  client: Record<string, unknown>;
  team: Array<Record<string, unknown>>;
  shootingDates: Array<Record<string, unknown>>;
  companyInfo: Record<string, unknown>;
}

// ===== HTML de Aprovacao Interna =====

/**
 * Monta o HTML do documento de Aprovacao Interna de um job.
 *
 * O HTML gerado tem layout A4 com CSS inline, pronto para conversao em PDF.
 * Secoes incluidas:
 *   1. Header com nome da produtora e data de emissao
 *   2. Dados do Cliente (razao social, CNPJ)
 *   3. Dados do Job (numero, nome, campanha, produto, projeto)
 *   4. Equipe (diretor, PE, produtora de som)
 *   5. Detalhes Tecnicos (secundagem, pecas, diarias, datas)
 *   6. Elenco (lista com cache)
 *   7. Veiculacao (periodo, midias)
 *
 * Campos ausentes sao exibidos como '—' para manter o layout integro.
 */
export function buildApprovalInternalHtml(
  params: ApprovalInternalHtmlParams,
): string {
  const { job, client, team, shootingDates, companyInfo } = params;

  // --- Extrair dados da equipe por role ---
  const findTeamMember = (role: string): string => {
    const member = team.find((m) => m.role === role);
    if (!member) return '—';
    // Suporta tanto person_name (join) quanto name diretamente
    return escapeHtml(String(member.person_name ?? member.name ?? '—'));
  };

  const director = findTeamMember('diretor');
  const pe = findTeamMember('produtor_executivo');
  const soundProducer = findTeamMember('som_direto');

  // --- Elenco: filtrar membros com role em lista de elenco ---
  const castRoles = ['produtor_casting'];
  const castMembers = team.filter(
    (m) =>
      typeof m.role === 'string' &&
      (castRoles.includes(m.role) || String(m.role).startsWith('ator') || String(m.role).startsWith('modelo')),
  );

  // --- Datas de filmagem ---
  const shootingDatesFormatted = shootingDates
    .map((d) => formatDate(d.shooting_date as string))
    .join(', ') || '—';

  // --- Data de emissao ---
  const emissionDate = formatDate(new Date().toISOString());

  // --- Linhas de datas de filmagem como secao separada ---
  const shootingDateRows = shootingDates.length > 0
    ? shootingDates
        .map(
          (d) => `
        <tr>
          <td style="${tdStyle}">${formatDate(d.shooting_date as string)}</td>
          <td style="${tdStyle}">${val(d.location)}</td>
          <td style="${tdStyle}">${val(d.description)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="${tdStyle} color: #9ca3af; text-align: center;">Nenhuma diaria cadastrada</td></tr>`;

  // --- Linhas de elenco ---
  const castRows = castMembers.length > 0
    ? castMembers
        .map(
          (m) => `
        <tr>
          <td style="${tdStyle}">${val(m.person_name ?? m.name)}</td>
          <td style="${tdStyle}">${val(m.role)}</td>
          <td style="${tdStyle} text-align: right;">${formatBrl(m.rate as number)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="${tdStyle} color: #9ca3af; text-align: center;">Nenhum membro de elenco cadastrado</td></tr>`;

  // Estilos reutilizaveis inline
  const sectionTitleStyle =
    'margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; background-color: #1f2937; padding: 6px 10px; border-radius: 4px;';
  const thStyle =
    'padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb;';
  const tdStyle =
    'padding: 7px 10px; font-size: 11px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: top;';
  const labelStyle =
    'font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;';
  const valueStyle =
    'font-size: 12px; color: #111827; font-weight: 500;';

  // Helper para bloco campo/valor
  const field = (label: string, value: string, width = '50%'): string =>
    `<td style="width: ${width}; padding: 8px 12px; vertical-align: top;">
      <p style="${labelStyle}">${label}</p>
      <p style="${valueStyle} margin: 0;">${value}</p>
    </td>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Aprovacao Interna — ${escapeHtml(String(job.code ?? job.title ?? 'Job'))}</title>
  <style>
    /* Reset minimo para impressao/PDF */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    @page { size: A4; margin: 20mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #111827; max-width: 794px; margin: 0 auto;">

  <!-- ===== HEADER ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 24px; border-bottom: 3px solid #09090b; padding-bottom: 16px;">
    <tr>
      <td style="vertical-align: middle;">
        <p style="margin: 0; font-size: 20px; font-weight: 800; color: #09090b; letter-spacing: -0.5px;">
          ${val(companyInfo.name)}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
          CNPJ: ${val(companyInfo.cnpj)} &nbsp;|&nbsp; ${val(companyInfo.address)}
        </p>
      </td>
      <td style="text-align: right; vertical-align: top; white-space: nowrap;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #09090b; text-transform: uppercase; letter-spacing: 0.05em;">
          Aprovacao Interna
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">Emitido em ${emissionDate}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">Job: <strong>${val(job.code)}</strong></p>
      </td>
    </tr>
  </table>

  <!-- ===== SECAO: DADOS DO CLIENTE ===== -->
  <p style="${sectionTitleStyle}">Dados do Cliente</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Razao Social', val(client.name ?? client.company_name))}
      ${field('CNPJ', val(client.cnpj))}
    </tr>
    <tr>
      ${field('Agencia', val(job.agency_name ?? '—'))}
      ${field('Contato', val(job.client_contact_name ?? '—'))}
    </tr>
  </table>

  <!-- ===== SECAO: DADOS DO JOB ===== -->
  <p style="${sectionTitleStyle}">Dados do Job</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Numero do Job', val(job.code), '25%')}
      ${field('Titulo', val(job.title), '75%')}
    </tr>
    <tr>
      ${field('Campanha / Marca', val(job.brand))}
      ${field('Tipo de Projeto', val(job.project_type))}
    </tr>
    <tr>
      ${field('Formato', val(job.format))}
      ${field('Segmento', val(job.segment))}
    </tr>
    <tr>
      ${field('PO / Numero do Pedido', val(job.po_number))}
      ${field('Responsavel Comercial', val(job.commercial_responsible))}
    </tr>
  </table>

  <!-- ===== SECAO: EQUIPE ===== -->
  <p style="${sectionTitleStyle}">Equipe Principal</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Diretor(a)', director)}
      ${field('Produtor(a) Executivo(a)', pe)}
    </tr>
    <tr>
      ${field('Som Direto / Produtora de Som', soundProducer)}
      ${field('DOP / Diretor de Fotografia', findTeamMember('dop'))}
    </tr>
  </table>

  <!-- ===== SECAO: DETALHES TECNICOS ===== -->
  <p style="${sectionTitleStyle}">Detalhes Tecnicos</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Secundagem Total', job.total_duration_seconds ? `${job.total_duration_seconds}s` : '—')}
      ${field('Numero de Pecas', val(job.pieces_count ?? '—'))}
    </tr>
    <tr>
      ${field('Data de Aprovacao', formatDate(job.approval_date as string))}
      ${field('Prazo de Entrega', formatDate(job.expected_delivery_date as string))}
    </tr>
    <tr>
      ${field('Inicio Pos-Producao', formatDate(job.post_start_date as string))}
      ${field('Deadline Pos-Producao', formatDate(job.post_deadline as string))}
    </tr>
    <tr>
      ${field('Audio Contratado?', job.has_contracted_audio ? 'Sim' : 'Nao')}
      ${field('CGI / Motion?', job.has_computer_graphics ? 'Sim' : 'Nao')}
    </tr>
    <tr>
      ${field('Numero ANCINE', val(job.ancine_number))}
      ${field('Empresa de Audio', val(job.audio_company))}
    </tr>
  </table>

  <!-- ===== SECAO: DIARIAS DE FILMAGEM ===== -->
  <p style="${sectionTitleStyle}">Diarias de Filmagem (${shootingDates.length})</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <thead>
      <tr>
        <th style="${thStyle} width: 20%;">Data</th>
        <th style="${thStyle} width: 35%;">Locacao</th>
        <th style="${thStyle}">Descricao</th>
      </tr>
    </thead>
    <tbody>
      ${shootingDateRows}
    </tbody>
  </table>

  <!-- ===== SECAO: ELENCO ===== -->
  <p style="${sectionTitleStyle}">Elenco</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <thead>
      <tr>
        <th style="${thStyle}">Nome</th>
        <th style="${thStyle} width: 30%;">Funcao</th>
        <th style="${thStyle} width: 20%; text-align: right;">Cache</th>
      </tr>
    </thead>
    <tbody>
      ${castRows}
    </tbody>
  </table>

  <!-- ===== SECAO: VEICULACAO ===== -->
  <p style="${sectionTitleStyle}">Veiculacao</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Tipo de Midia', val(job.media_type))}
      ${field('Periodo de Veiculacao', val(job.broadcast_period ?? '—'))}
    </tr>
    <tr>
      ${field('Aprovacao Interna por', val(job.approved_by_name))}
      ${field('Email do Aprovador', val(job.approved_by_email))}
    </tr>
  </table>

  <!-- ===== SECAO: VALORES ===== -->
  <p style="${sectionTitleStyle}">Resumo Financeiro</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <tr>
      ${field('Valor Fechado (Receita)', formatBrl(job.closed_value as number))}
      ${field('Custo de Producao', formatBrl(job.production_cost as number))}
    </tr>
    <tr>
      ${field('Impostos', formatBrl(job.tax_value as number))}
      ${field('Lucro Bruto', formatBrl(job.gross_profit as number))}
    </tr>
    <tr>
      ${field('Margem (%)', job.margin_percentage != null ? `${Number(job.margin_percentage).toFixed(1)}%` : '—')}
      ${field('Termos de Pagamento', val(job.payment_terms))}
    </tr>
  </table>

  <!-- ===== RODAPE ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
    <tr>
      <td style="font-size: 10px; color: #9ca3af; text-align: center;">
        Documento gerado automaticamente pelo ELLAHOS em ${emissionDate}.
        Este documento e de uso interno e nao substitui contrato ou proposta formal.
      </td>
    </tr>
    <tr>
      <td style="padding-top: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 45%; text-align: center; padding-top: 32px; border-top: 1px solid #374151;">
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #374151;">
                ${val(companyInfo.name)}
              </p>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #9ca3af;">
                Produtor(a) Executivo(a)
              </p>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; text-align: center; padding-top: 32px; border-top: 1px solid #374151;">
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #374151;">
                ${val(client.name ?? client.company_name)}
              </p>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #9ca3af;">
                Cliente / Aprovador
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

// ===== Helpers de persistencia =====

// Informacoes de saida apos salvar o PDF no Drive e registrar em job_files
export interface SavePdfResult {
  driveFileId: string;
  driveUrl: string;
  jobFileId: string;
}

// Parametros para salvar PDF no Drive e registrar em job_files
export interface SavePdfParams {
  tenantId: string;
  jobId: string;
  pdfBytes: Uint8Array;
  fileName: string;
  /** Chave da pasta no Drive. Ex: 'documentos', 'contratos' */
  folderKey: string;
  /** Tipo do arquivo para o registro em job_files. Ex: 'aprovacao_interna', 'claquete' */
  fileType?: string;
}

/**
 * Salva um PDF (Uint8Array) no Google Drive na pasta correta do job
 * e cria um registro em job_files com a URL de acesso.
 *
 * Fluxo:
 *   1. Busca o drive_folder_id da pasta via drive_folders table
 *   2. Faz upload do PDF para o Drive via google-drive-client
 *   3. Insere registro em job_files com a URL e metadados
 *   4. Atualiza jobs.internal_approval_doc_url se fileType = 'aprovacao_interna'
 *
 * Retorna driveFileId, driveUrl e jobFileId do registro criado.
 */
export async function savePdfToDrive(
  serviceClient: SupabaseClient,
  params: SavePdfParams,
): Promise<SavePdfResult> {
  const { tenantId, jobId, pdfBytes, fileName, folderKey, fileType } = params;

  console.log(
    `[pdf-generator] salvando PDF "${fileName}" (${pdfBytes.byteLength} bytes) no Drive, job ${jobId}, pasta "${folderKey}"`,
  );

  // 1. Busca o ID da pasta no Drive
  const { data: folderData, error: folderError } = await serviceClient
    .from('drive_folders')
    .select('google_drive_id, url')
    .eq('tenant_id', tenantId)
    .eq('job_id', jobId)
    .eq('folder_key', folderKey)
    .is('deleted_at', null)
    .maybeSingle();

  if (folderError) {
    throw new Error(
      `[pdf-generator] falha ao buscar pasta "${folderKey}" no Drive: ${folderError.message}`,
    );
  }

  const driveFolderId = (folderData?.google_drive_id as string | null) ?? null;

  if (!driveFolderId) {
    throw new Error(
      `[pdf-generator] pasta "${folderKey}" nao encontrada para o job ${jobId}. Execute create-structure antes.`,
    );
  }

  // 2. Upload do PDF para o Drive via Google Drive API (multipart upload)
  // Requer que o DRIVE_SERVICE_ACCOUNT_JSON esteja configurado no Vault do tenant.
  // Documentacao: https://developers.google.com/drive/api/guides/manage-uploads
  //
  // NOTA: uploadFileToDrive sera adicionado a google-drive-client.ts na implementacao
  // da Edge Function pdf-generator (Fase 9.6). Por ora, este helper documenta a interface
  // esperada e pode ser substituido pela implementacao real sem alterar o contrato.
  const { getGoogleAccessToken } = await import('./google-drive-client.ts');
  const { getSecret } = await import('./vault.ts');

  // Ler Service Account do Vault para obter access token
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new Error('[pdf-generator] Service Account do Google Drive nao encontrada no Vault');
  }
  const sa = JSON.parse(saJson);
  const accessToken = await getGoogleAccessToken(sa);

  // Multipart upload: metadata + PDF bytes
  const boundary = `pdf_upload_${Date.now()}`;
  const metadataPart = JSON.stringify({ name: fileName, parents: [driveFolderId] });
  const encoder = new TextEncoder();

  const bodyParts: Uint8Array[] = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    pdfBytes,
    encoder.encode(`\r\n--${boundary}--`),
  ];

  // Concatena as partes em um unico Uint8Array
  const totalLength = bodyParts.reduce((sum, p) => sum + p.byteLength, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of bodyParts) {
    body.set(part, offset);
    offset += part.byteLength;
  }

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(totalLength),
      },
      body,
    },
  );

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`[pdf-generator] falha no upload do PDF para o Drive: ${uploadResponse.status} - ${errText}`);
  }

  const uploadResult = await uploadResponse.json() as { id: string; webViewLink?: string };
  const driveFileId = uploadResult.id;
  const driveUrl = uploadResult.webViewLink ?? `https://drive.google.com/file/d/${driveFileId}/view`;

  console.log(
    `[pdf-generator] PDF carregado no Drive: id=${driveFileId}, url=${driveUrl}`,
  );

  // 3. Registra em job_files
  const { data: jobFile, error: jobFileError } = await serviceClient
    .from('job_files')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      file_name: fileName,
      file_type: fileType ?? 'document',
      drive_file_id: driveFileId,
      drive_url: driveUrl,
      file_size_bytes: pdfBytes.byteLength,
      metadata: { folder_key: folderKey },
    })
    .select('id')
    .single();

  if (jobFileError || !jobFile) {
    // Nao e fatal — o PDF ja esta no Drive. Loga e continua.
    console.error(
      `[pdf-generator] aviso: falha ao registrar PDF em job_files: ${jobFileError?.message}`,
    );
  }

  const jobFileId = (jobFile?.id as string) ?? '';

  // 4. Atualiza campo especifico no job se for aprovacao interna
  if (fileType === 'aprovacao_interna') {
    const { error: updateError } = await serviceClient
      .from('jobs')
      .update({ internal_approval_doc_url: driveUrl })
      .eq('id', jobId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error(
        `[pdf-generator] aviso: falha ao atualizar jobs.internal_approval_doc_url: ${updateError.message}`,
      );
    } else {
      console.log(`[pdf-generator] jobs.internal_approval_doc_url atualizado para job ${jobId}`);
    }
  }

  return { driveFileId, driveUrl, jobFileId };
}
