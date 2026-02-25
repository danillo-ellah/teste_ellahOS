import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para reclassificar NFs
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Schema de validacao do payload
const ReassignSchema = z.object({
  nf_document_id: z.string().uuid('nf_document_id deve ser UUID valido'),
  financial_record_id: z.string().uuid('financial_record_id deve ser UUID valido'),
  job_id: z.string().uuid('job_id deve ser UUID valido').optional().nullable(),
});

type ReassignInput = z.infer<typeof ReassignSchema>;

export async function reassignNf(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para reclassificar NFs', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = ReassignSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: ReassignInput = result.data;
  const supabase = getSupabaseClient(auth.token);

  console.log(`[reassign] user=${auth.userId} nf_document_id=${input.nf_document_id} -> financial_record_id=${input.financial_record_id}`);

  // 1. Verificar existencia do documento
  const { data: doc, error: fetchError } = await supabase
    .from('nf_documents')
    .select('id, status, matched_financial_record_id')
    .eq('id', input.nf_document_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !doc) {
    throw new AppError('NOT_FOUND', 'Documento NF nao encontrado', 404);
  }

  // 2. Verificar existencia do financial_record de destino no mesmo tenant
  const { data: financialRecord, error: frError } = await supabase
    .from('financial_records')
    .select('id, description, amount')
    .eq('id', input.financial_record_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (frError || !financialRecord) {
    throw new AppError('NOT_FOUND', 'Registro financeiro nao encontrado', 404);
  }

  // 3. Montar dados de atualizacao
  const updateData: Record<string, unknown> = {
    matched_financial_record_id: input.financial_record_id,
    match_method: 'manual',
    // Reclassificar volta para pending_review (nao confirma automaticamente)
    status: doc.status === 'confirmed' || doc.status === 'rejected' ? 'pending_review' : doc.status,
  };

  if (input.job_id !== undefined) {
    updateData.job_id = input.job_id;
  }

  // 4. Atualizar nf_document
  const { data: updatedDoc, error: updateError } = await supabase
    .from('nf_documents')
    .update(updateData)
    .eq('id', input.nf_document_id)
    .select('id, matched_financial_record_id, job_id, status')
    .single();

  if (updateError || !updatedDoc) {
    console.error('[reassign] falha ao atualizar nf_document:', updateError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao reclassificar NF', 500);
  }

  console.log(`[reassign] NF reclassificada: id=${updatedDoc.id} novo_financial_record=${input.financial_record_id}`);

  return success({
    nf_document_id: updatedDoc.id,
    matched_financial_record_id: updatedDoc.matched_financial_record_id,
    job_id: updatedDoc.job_id,
    status: updatedDoc.status,
  });
}
