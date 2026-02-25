import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de validacao do payload
const UploadSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido').optional().nullable(),
  file_name: z.string().min(1, 'file_name e obrigatorio').max(500),
  file_hash: z.string().min(1, 'file_hash e obrigatorio'),
  file_size_bytes: z.number().int().positive('file_size_bytes deve ser positivo').optional().nullable(),
  drive_file_id: z.string().optional().nullable(),
  drive_url: z.string().url('drive_url deve ser URL valida').optional().nullable(),
  nf_number: z.string().max(50).optional().nullable(),
  nf_value: z.number().positive('nf_value deve ser positivo').optional().nullable(),
  nf_issuer_cnpj: z.string().max(20).optional().nullable(),
  nf_issuer_name: z.string().max(200).optional().nullable(),
});

type UploadInput = z.infer<typeof UploadSchema>;

// Tenta match automatico da NF com financial_records do tenant (mesmo da ingest.ts)
// Para upload manual, usa job_id se fornecido
async function tryAutoMatchByJob(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  jobId: string | null | undefined,
  nfValue: number | null | undefined,
): Promise<{ matchedId: string | null; confidence: number }> {
  if (!jobId) {
    return { matchedId: null, confidence: 0.0 };
  }

  // Buscar financial_records do job sem NF vinculada
  const { data: matches, error: matchError } = await serviceClient
    .from('financial_records')
    .select('id, description, amount')
    .eq('tenant_id', tenantId)
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (matchError || !matches || matches.length === 0) {
    return { matchedId: null, confidence: 0.0 };
  }

  // Se ha valor da NF, tentar encontrar registro com valor proximo
  if (nfValue && nfValue > 0) {
    const exactMatch = matches.find(m => Math.abs((m.amount ?? 0) - nfValue) < 0.01);
    if (exactMatch) {
      return { matchedId: exactMatch.id, confidence: 0.90 };
    }
  }

  // Se ha apenas 1 registro no job, match com confianca media
  if (matches.length === 1) {
    return { matchedId: matches[0].id, confidence: 0.70 };
  }

  return { matchedId: null, confidence: 0.0 };
}

export async function uploadNf(req: Request, auth: AuthContext): Promise<Response> {
  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = UploadSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: UploadInput = result.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(`[upload] user=${auth.userId} file="${input.file_name}" hash=${input.file_hash.substring(0, 8)}...`);

  // 1. Deduplicacao: verificar se file_hash ja existe para o tenant
  const { data: existing, error: dupError } = await supabase
    .from('nf_documents')
    .select('id, status')
    .eq('tenant_id', auth.tenantId)
    .eq('file_hash', input.file_hash)
    .is('deleted_at', null)
    .maybeSingle();

  if (dupError) {
    console.error('[upload] falha ao verificar duplicata:', dupError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao verificar duplicata', 500);
  }

  if (existing) {
    console.log(`[upload] NF duplicada detectada: id=${existing.id} status=${existing.status}`);
    return created({
      nf_document_id: existing.id,
      status: existing.status,
      is_duplicate: true,
    });
  }

  // 2. Tentar match automatico baseado no job_id e nf_value
  const { matchedId, confidence } = await tryAutoMatchByJob(
    serviceClient,
    auth.tenantId,
    input.job_id,
    input.nf_value,
  );

  // 3. Determinar status inicial
  let docStatus: string;
  let matchMethod: string | null = null;

  if (matchedId && confidence >= 0.85) {
    docStatus = 'auto_matched';
    matchMethod = 'auto_value_supplier';
  } else {
    docStatus = 'pending_review';
    if (matchedId) {
      matchMethod = 'auto_value_supplier';
    }
  }

  // 4. Criar registro em nf_documents com source = 'manual_upload'
  const { data: newDoc, error: insertError } = await supabase
    .from('nf_documents')
    .insert({
      tenant_id: auth.tenantId,
      job_id: input.job_id ?? null,
      source: 'manual_upload',
      file_name: input.file_name,
      file_hash: input.file_hash,
      file_size_bytes: input.file_size_bytes ?? null,
      drive_file_id: input.drive_file_id ?? null,
      drive_url: input.drive_url ?? null,
      nf_number: input.nf_number ?? null,
      nf_value: input.nf_value ?? null,
      nf_issuer_cnpj: input.nf_issuer_cnpj ?? null,
      nf_issuer_name: input.nf_issuer_name ?? null,
      status: docStatus,
      matched_financial_record_id: matchedId ?? null,
      match_confidence: confidence > 0 ? confidence : null,
      match_method: matchMethod,
      metadata: {
        uploaded_by: auth.userId,
        uploaded_at: new Date().toISOString(),
      },
    })
    .select('id, status')
    .single();

  if (insertError || !newDoc) {
    console.error('[upload] falha ao criar nf_document:', insertError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao registrar NF', 500);
  }

  console.log(`[upload] NF criada via upload manual: id=${newDoc.id} status=${newDoc.status}`);

  return created({
    nf_document_id: newDoc.id,
    status: newDoc.status,
    is_duplicate: false,
  });
}
