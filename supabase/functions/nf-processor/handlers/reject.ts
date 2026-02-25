import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para rejeitar NFs
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Schema de validacao do payload
const RejectSchema = z.object({
  nf_document_id: z.string().uuid('nf_document_id deve ser UUID valido'),
  rejection_reason: z.string().min(1, 'rejection_reason e obrigatorio').max(500),
});

type RejectInput = z.infer<typeof RejectSchema>;

export async function rejectNf(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para rejeitar NFs', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = RejectSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: RejectInput = result.data;
  const supabase = getSupabaseClient(auth.token);

  console.log(`[reject] user=${auth.userId} nf_document_id=${input.nf_document_id}`);

  // 1. Buscar documento atual para verificar existencia
  const { data: doc, error: fetchError } = await supabase
    .from('nf_documents')
    .select('id, status, job_id, file_name, tenant_id')
    .eq('id', input.nf_document_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !doc) {
    throw new AppError('NOT_FOUND', 'Documento NF nao encontrado', 404);
  }

  if (doc.status === 'rejected') {
    throw new AppError('CONFLICT', 'NF ja foi rejeitada anteriormente', 409);
  }

  if (doc.status === 'confirmed') {
    throw new AppError('CONFLICT', 'NF confirmada nao pode ser rejeitada sem reclassificacao previa', 409);
  }

  // 2. Atualizar nf_document para status rejected
  const { data: updatedDoc, error: updateError } = await supabase
    .from('nf_documents')
    .update({
      status: 'rejected',
      rejection_reason: input.rejection_reason,
      validated_by: auth.userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', input.nf_document_id)
    .select('id, status, job_id')
    .single();

  if (updateError || !updatedDoc) {
    console.error('[reject] falha ao atualizar nf_document:', updateError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao rejeitar NF', 500);
  }

  // 3. Registrar no historico se NF esta vinculada a um job
  const jobId = updatedDoc.job_id ?? doc.job_id;
  if (jobId) {
    try {
      const serviceClient = getServiceClient();
      await insertHistory(serviceClient, {
        tenantId: auth.tenantId,
        jobId,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore: { nf_status: doc.status },
        dataAfter: {
          nf_status: 'rejected',
          nf_document_id: input.nf_document_id,
          rejection_reason: input.rejection_reason,
        },
        description: `NF "${doc.file_name}" rejeitada: ${input.rejection_reason}`,
      });
    } catch (histErr) {
      console.error('[reject] falha ao registrar historico:', histErr);
    }
  }

  console.log(`[reject] NF rejeitada: id=${updatedDoc.id} motivo="${input.rejection_reason}"`);

  return success({
    nf_document_id: updatedDoc.id,
    status: 'rejected',
  });
}
