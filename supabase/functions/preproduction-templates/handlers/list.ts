import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = [
  'ceo',
  'admin',
  'produtor_executivo',
  'atendimento',
  'coordenador_producao',
  'diretor_producao',
];

export async function handleTemplatesList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[preproduction-templates/list] listando templates', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para listar templates', 403);
  }

  const url = new URL(req.url);
  const projectType = url.searchParams.get('project_type');
  const includeInactive = url.searchParams.get('include_inactive') === 'true';

  const client = getSupabaseClient(auth.token);

  let query = client
    .from('preproduction_checklist_templates')
    .select('id, tenant_id, project_type, name, items, is_active, created_by, created_at, updated_at')
    .eq('tenant_id', auth.tenantId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (projectType) {
    query = query.eq('project_type', projectType);
  }

  query = query.order('project_type', { ascending: true, nullsFirst: true }).order('name', { ascending: true });

  const { data: templates, error: listError } = await query;

  if (listError) {
    console.error('[preproduction-templates/list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar templates', 500, {
      detail: listError.message,
    });
  }

  console.log('[preproduction-templates/list] templates retornados', { count: templates?.length ?? 0 });
  return success(templates ?? [], 200, req);
}
