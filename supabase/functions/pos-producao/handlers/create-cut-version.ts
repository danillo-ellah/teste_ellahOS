import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, CreateCutVersionSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador', 'editor'];

export async function handleCreateCutVersion(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para criar versao de corte', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data: del, error: delErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, tenant_id, description')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (delErr || !del) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  const validated = validate(CreateCutVersionSchema, body);

  // Calcular proximo version_number (MAX + 1 por deliverable + version_type)
  const { data: maxRow } = await supabase
    .from('pos_cut_versions')
    .select('version_number')
    .eq('deliverable_id', deliverableId)
    .eq('version_type', validated.version_type)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version_number ?? 0) + 1;

  console.log(`[pos-producao/create-cut-version] deliverable=${deliverableId} type=${validated.version_type} v${nextVersion}`);

  const { data: version, error: insertErr } = await supabase
    .from('pos_cut_versions')
    .insert({
      tenant_id: auth.tenantId,
      deliverable_id: deliverableId,
      job_id: del.job_id,
      version_number: nextVersion,
      version_type: validated.version_type,
      review_url: validated.review_url ?? null,
      revision_notes: validated.revision_notes ?? null,
      status: 'rascunho',
      created_by: auth.userId,
    })
    .select()
    .single();

  if (insertErr) throw new AppError('INTERNAL_ERROR', insertErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: del.job_id,
    eventType: 'field_update',
    userId: auth.userId,
    dataAfter: {
      deliverable_id: deliverableId,
      version_id: version.id,
      version_number: nextVersion,
      version_type: validated.version_type,
    },
    description: `Versao V${nextVersion} (${validated.version_type}) criada para entregavel "${del.description}"`,
  });

  return created(version, req);
}
