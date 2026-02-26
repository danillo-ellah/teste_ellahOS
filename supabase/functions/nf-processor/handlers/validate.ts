import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import { copyDriveFile, getGoogleAccessToken } from '../../_shared/google-drive-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Roles permitidos para validar NFs
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Schema de validacao do payload
const ValidateSchema = z.object({
  nf_document_id: z.string().uuid('nf_document_id deve ser UUID valido'),
  financial_record_id: z.string().uuid('financial_record_id deve ser UUID valido').optional().nullable(),
  nf_number: z.string().max(50).optional().nullable(),
  nf_value: z.number().positive('nf_value deve ser positivo').optional().nullable(),
  nf_issuer_cnpj: z.string().max(20).optional().nullable(),
  nf_issuer_name: z.string().max(200).optional().nullable(),
  nf_issue_date: z.string().optional().nullable(),
});

type ValidateInput = z.infer<typeof ValidateSchema>;

export async function validateNf(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para validar NFs', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = ValidateSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: ValidateInput = result.data;
  const supabase = getSupabaseClient(auth.token);
  const now = new Date().toISOString();

  console.log(`[validate] user=${auth.userId} nf_document_id=${input.nf_document_id}`);

  // 1. Buscar documento atual para verificar existencia e obter dados anteriores
  const { data: doc, error: fetchError } = await supabase
    .from('nf_documents')
    .select('id, status, job_id, matched_financial_record_id, file_name, sender_email, tenant_id, drive_file_id')
    .eq('id', input.nf_document_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !doc) {
    throw new AppError('NOT_FOUND', 'Documento NF nao encontrado', 404);
  }

  if (doc.status === 'confirmed') {
    throw new AppError('CONFLICT', 'NF ja foi confirmada anteriormente', 409);
  }

  if (doc.status === 'rejected') {
    throw new AppError('CONFLICT', 'NF foi rejeitada e nao pode ser confirmada', 409);
  }

  // 2. Determinar o financial_record_id final (informado ou ja vinculado)
  const financialRecordId = input.financial_record_id ?? doc.matched_financial_record_id;

  // 3. Atualizar nf_document para status confirmed
  const updateData: Record<string, unknown> = {
    status: 'confirmed',
    validated_by: auth.userId,
    validated_at: now,
    match_method: 'manual',
  };

  if (financialRecordId) {
    updateData.matched_financial_record_id = financialRecordId;
  }
  if (input.nf_number) updateData.nf_number = input.nf_number;
  if (input.nf_value) updateData.nf_value = input.nf_value;
  if (input.nf_issuer_cnpj) updateData.nf_issuer_cnpj = input.nf_issuer_cnpj;
  if (input.nf_issuer_name) updateData.nf_issuer_name = input.nf_issuer_name;
  if (input.nf_issue_date) updateData.nf_issue_date = input.nf_issue_date;

  const { data: updatedDoc, error: updateError } = await supabase
    .from('nf_documents')
    .update(updateData)
    .eq('id', input.nf_document_id)
    .select('id, status, job_id, matched_financial_record_id')
    .single();

  if (updateError || !updatedDoc) {
    console.error('[validate] falha ao atualizar nf_document:', updateError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao confirmar NF', 500);
  }

  // 4. Atualizar financial_record.nf_request_status = 'validado' se vinculado
  let invoiceId: string | null = null;

  if (financialRecordId) {
    const { error: frUpdateError } = await supabase
      .from('financial_records')
      .update({ nf_request_status: 'validado' })
      .eq('id', financialRecordId)
      .eq('tenant_id', auth.tenantId);

    if (frUpdateError) {
      console.error('[validate] falha ao atualizar financial_record:', frUpdateError.message);
      // Nao bloqueia — continua
    }

    // 5. Criar ou atualizar invoice vinculada ao nf_document
    try {
      const jobId = updatedDoc.job_id ?? doc.job_id;

      // Buscar invoice existente vinculada ao financial_record
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('financial_record_id', financialRecordId)
        .eq('tenant_id', auth.tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingInvoice) {
        // Atualizar invoice existente
        await supabase
          .from('invoices')
          .update({
            nf_document_id: input.nf_document_id,
            issuer_cnpj: input.nf_issuer_cnpj ?? null,
            issuer_name: input.nf_issuer_name ?? null,
            status: 'approved',
          })
          .eq('id', existingInvoice.id);

        invoiceId = existingInvoice.id;
      } else if (jobId) {
        // Criar nova invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            tenant_id: auth.tenantId,
            job_id: jobId,
            financial_record_id: financialRecordId,
            nf_document_id: input.nf_document_id,
            amount: input.nf_value ?? null,
            issuer_cnpj: input.nf_issuer_cnpj ?? null,
            issuer_name: input.nf_issuer_name ?? null,
            status: 'approved',
            issued_at: input.nf_issue_date ?? null,
          })
          .select('id')
          .single();

        if (invoiceError) {
          console.error('[validate] falha ao criar invoice:', invoiceError.message);
        } else {
          invoiceId = newInvoice?.id ?? null;
        }
      }
    } catch (invoiceErr) {
      console.error('[validate] erro ao gerenciar invoice:', invoiceErr);
      // Nao bloqueia
    }
  }

  // 6. Registrar no historico se NF esta vinculada a um job
  if (updatedDoc.job_id) {
    try {
      const serviceClient = getServiceClient();
      await insertHistory(serviceClient, {
        tenantId: auth.tenantId,
        jobId: updatedDoc.job_id,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore: { nf_status: doc.status },
        dataAfter: {
          nf_status: 'confirmed',
          nf_document_id: input.nf_document_id,
          financial_record_id: financialRecordId,
        },
        description: `NF "${doc.file_name}" confirmada e vinculada ao registro financeiro`,
      });
    } catch (histErr) {
      console.error('[validate] falha ao registrar historico:', histErr);
    }
  }

  // 7. Fire-and-forget: copiar NF para pasta do job no Drive
  const resolvedJobId = updatedDoc.job_id ?? doc.job_id;
  if (doc.drive_file_id && resolvedJobId) {
    copyNfToJobFolder(getServiceClient(), auth.tenantId, {
      driveFileId: doc.drive_file_id,
      jobId: resolvedJobId,
      nfNumber: input.nf_number ?? null,
      issuerName: input.nf_issuer_name ?? null,
      issueDate: input.nf_issue_date ?? null,
      fileName: doc.file_name,
      nfDocumentId: doc.id,
      validatedAt: now,
    }).catch(err => console.error('[validate] falha ao copiar NF para pasta do job:', err));
  } else if (!resolvedJobId) {
    // Tentar resolver job_id via financial_record
    if (financialRecordId) {
      resolveJobAndCopy(getServiceClient(), auth.tenantId, financialRecordId, doc, input, now)
        .catch(err => console.error('[validate] falha ao resolver job e copiar:', err));
    }
  }

  console.log(`[validate] NF confirmada: id=${updatedDoc.id} invoice_id=${invoiceId}`);

  return success({
    nf_document_id: updatedDoc.id,
    status: 'confirmed',
    invoice_id: invoiceId,
    financial_record_updated: financialRecordId != null,
  });
}

// --- Helpers para copia de NF ao Drive do job ---

function sanitizeForFilename(str: string): string {
  return str
    .replace(/[/\\*?<>|"':]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
}

function buildNfFileName(opts: {
  jobCode: string;
  nfNumber: string | null;
  issuerName: string | null;
  issueDate: string | null;
  validatedAt: string;
  originalFileName: string;
}): string {
  // Data: usa issue_date se disponivel, senao validated_at
  const dateStr = opts.issueDate
    ? opts.issueDate.replace(/-/g, '')
    : opts.validatedAt.slice(0, 10).replace(/-/g, '');

  const parts = [`NF_${dateStr}`, `J${opts.jobCode}`];

  if (opts.nfNumber) {
    parts.push(`NF${opts.nfNumber}`);
  }

  if (opts.issuerName) {
    const sanitized = sanitizeForFilename(opts.issuerName);
    if (sanitized) parts.push(sanitized);
  }

  const name = parts.join('_');

  // Manter extensao do arquivo original
  const ext = opts.originalFileName.includes('.')
    ? '.' + opts.originalFileName.split('.').pop()
    : '.pdf';

  return name + ext;
}

interface CopyNfParams {
  driveFileId: string;
  jobId: string;
  nfNumber: string | null;
  issuerName: string | null;
  issueDate: string | null;
  fileName: string;
  nfDocumentId: string;
  validatedAt: string;
}

async function copyNfToJobFolder(
  serviceClient: SupabaseClient,
  tenantId: string,
  params: CopyNfParams,
): Promise<void> {
  // Buscar codigo do job
  const { data: job } = await serviceClient
    .from('jobs')
    .select('code')
    .eq('id', params.jobId)
    .single();

  if (!job?.code) {
    console.warn(`[validate/copy] job ${params.jobId} sem code — pulando copia`);
    return;
  }

  // Buscar pasta fin_nf_recebimento do job
  const { data: folder } = await serviceClient
    .from('drive_folders')
    .select('google_drive_id')
    .eq('job_id', params.jobId)
    .eq('folder_key', 'fin_nf_recebimento')
    .eq('tenant_id', tenantId)
    .single();

  if (!folder?.google_drive_id) {
    console.warn(`[validate/copy] pasta fin_nf_recebimento nao encontrada para job ${params.jobId} — pulando copia`);
    return;
  }

  // Obter token do Drive via Service Account
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);
  if (!saJson) {
    console.error(`[validate/copy] service account nao encontrada no Vault: ${tenantId}_gdrive_service_account`);
    return;
  }

  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    console.error('[validate/copy] falha ao obter access token do Google Drive');
    return;
  }

  // Gerar nome do arquivo
  const newName = buildNfFileName({
    jobCode: job.code,
    nfNumber: params.nfNumber,
    issuerName: params.issuerName,
    issueDate: params.issueDate,
    validatedAt: params.validatedAt,
    originalFileName: params.fileName,
  });

  console.log(`[validate/copy] copiando ${params.driveFileId} → "${newName}" em ${folder.google_drive_id}`);

  // Copiar arquivo no Drive
  const copied = await copyDriveFile(token, params.driveFileId, newName, folder.google_drive_id);

  console.log(`[validate/copy] copia OK: id=${copied.id} url=${copied.webViewLink}`);

  // Salvar referencia no metadata do nf_document
  await serviceClient
    .from('nf_documents')
    .update({
      metadata: {
        job_copy: {
          drive_file_id: copied.id,
          url: copied.webViewLink ?? null,
          file_name: newName,
          copied_at: new Date().toISOString(),
        },
      },
    })
    .eq('id', params.nfDocumentId);
}

async function resolveJobAndCopy(
  serviceClient: SupabaseClient,
  tenantId: string,
  financialRecordId: string,
  doc: { drive_file_id: string | null; file_name: string; id: string },
  input: { nf_number?: string | null; nf_issuer_name?: string | null; nf_issue_date?: string | null },
  validatedAt: string,
): Promise<void> {
  if (!doc.drive_file_id) return;

  const { data: fr } = await serviceClient
    .from('financial_records')
    .select('job_id')
    .eq('id', financialRecordId)
    .eq('tenant_id', tenantId)
    .single();

  if (!fr?.job_id) return;

  await copyNfToJobFolder(serviceClient, tenantId, {
    driveFileId: doc.drive_file_id,
    jobId: fr.job_id,
    nfNumber: input.nf_number ?? null,
    issuerName: input.nf_issuer_name ?? null,
    issueDate: input.nf_issue_date ?? null,
    fileName: doc.file_name,
    nfDocumentId: doc.id,
    validatedAt,
  });
}
