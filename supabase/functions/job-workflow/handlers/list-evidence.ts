import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const SIGNED_URL_TTL = 3600; // 1 hora

export async function handleListEvidence(
  req: Request,
  auth: AuthContext,
  stepId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que o step existe (RLS garante tenant)
  const { data: step, error: stepErr } = await supabase
    .from('job_workflow_steps')
    .select('id')
    .eq('id', stepId)
    .is('deleted_at', null)
    .single();

  if (stepErr || !step) {
    throw new AppError('NOT_FOUND', 'Passo do workflow nao encontrado', 404);
  }

  const { data: evidence, error: fetchErr } = await supabase
    .from('job_workflow_evidence')
    .select(`
      *,
      uploader:uploaded_by(id, full_name, avatar_url)
    `)
    .eq('workflow_step_id', stepId)
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('[list-evidence] fetch error:', fetchErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao carregar evidencias', 500);
  }

  // Gerar signed URLs para cada evidencia (bucket privado)
  const items = evidence ?? [];
  if (items.length > 0) {
    const paths = items.map((e: { file_url: string }) => e.file_url);
    const { data: signedUrls } = await supabase.storage
      .from('workflow-evidence')
      .createSignedUrls(paths, SIGNED_URL_TTL);

    if (signedUrls) {
      for (let i = 0; i < items.length; i++) {
        const signed = signedUrls[i];
        if (signed && !signed.error) {
          (items[i] as Record<string, unknown>).signed_url = signed.signedUrl;
        }
      }
    }
  }

  console.log(`[job-workflow/list-evidence] step=${stepId} count=${items.length}`);
  return success(items, 200, req);
}
