import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const EVIDENCE_TYPES = ['foto', 'nota_fiscal', 'recibo', 'outro'] as const;

const AddEvidenceSchema = z.object({
  evidence_type: z.enum(EVIDENCE_TYPES, {
    errorMap: () => ({ message: 'Tipo de evidencia invalido. Usar: foto, nota_fiscal, recibo, outro' }),
  }),
  file_url: z.string().min(1, 'URL do arquivo e obrigatoria'),
  file_name: z.string().min(1, 'Nome do arquivo e obrigatorio').max(500),
  notes: z.string().max(2000).nullable().optional(),
});

export async function handleAddEvidence(
  req: Request,
  auth: AuthContext,
  stepId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que o step existe e e do tipo conferencia
  const { data: step, error: stepErr } = await supabase
    .from('job_workflow_steps')
    .select('id, step_type, step_label, tenant_id')
    .eq('id', stepId)
    .is('deleted_at', null)
    .single();

  if (stepErr || !step) {
    throw new AppError('NOT_FOUND', 'Passo do workflow nao encontrado', 404);
  }

  // Evidencias sao mais comuns em conferencia, mas permitir em qualquer step
  // (usuario pode querer anexar NF em fase de compra, por exemplo)

  const body = await req.json();
  const validated = validate(AddEvidenceSchema, body);

  const { data: evidence, error: insertErr } = await supabase
    .from('job_workflow_evidence')
    .insert({
      tenant_id: step.tenant_id,
      workflow_step_id: stepId,
      evidence_type: validated.evidence_type,
      file_url: validated.file_url,
      file_name: validated.file_name,
      uploaded_by: auth.userId,
      notes: validated.notes ?? null,
    })
    .select(`
      *,
      uploader:uploaded_by(id, full_name, avatar_url)
    `)
    .single();

  if (insertErr) {
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log(`[job-workflow/add-evidence] step=${stepId} type=${validated.evidence_type} file=${validated.file_name}`);
  return success(evidence, 201, req);
}
