import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

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
    .select('id, status, job_id, matched_financial_record_id, file_name, sender_email, tenant_id')
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

  console.log(`[validate] NF confirmada: id=${updatedDoc.id} invoice_id=${invoiceId}`);

  return success({
    nf_document_id: updatedDoc.id,
    status: 'confirmed',
    invoice_id: invoiceId,
    financial_record_updated: financialRecordId != null,
  });
}
