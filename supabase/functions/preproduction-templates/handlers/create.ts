import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'admin'];

const CreateTemplateSchema = z.object({
  project_type: z.enum([
    'filme_publicitario',
    'branded_content',
    'videoclipe',
    'documentario',
    'conteudo_digital',
    'evento_livestream',
    'institucional',
    'motion_graphics',
    'fotografia',
    'monstro_animatic',
    'outro',
  ]).nullable().default(null),
  name: z.string().min(1, 'nome obrigatorio').max(200),
  items: z.array(
    z.object({
      label: z.string().min(1).max(500),
      position: z.number().int().positive(),
    }),
  ).min(1, 'Template precisa de pelo menos 1 item'),
});

export async function handleTemplatesCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[preproduction-templates/create] criando template', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar templates', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateTemplateSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Gerar UUID para cada item
  const itemsWithIds = data.items.map((item) => ({
    id: crypto.randomUUID(),
    label: item.label,
    position: item.position,
  }));

  // Se ja existe template ativo para (tenant_id, project_type), desativar o anterior
  {
    let deactivateQuery = client
      .from('preproduction_checklist_templates')
      .update({ is_active: false })
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true);

    if (data.project_type !== null) {
      deactivateQuery = deactivateQuery.eq('project_type', data.project_type);
    } else {
      deactivateQuery = deactivateQuery.is('project_type', null);
    }

    const { error: deactivateError } = await deactivateQuery;

    if (deactivateError) {
      console.error('[preproduction-templates/create] erro ao desativar template anterior:', deactivateError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao desativar template anterior', 500, {
        detail: deactivateError.message,
      });
    }
  }

  const { data: newTemplate, error: insertError } = await client
    .from('preproduction_checklist_templates')
    .insert({
      tenant_id: auth.tenantId,
      project_type: data.project_type,
      name: data.name,
      items: itemsWithIds,
      is_active: true,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[preproduction-templates/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar template', 500, {
      detail: insertError.message,
    });
  }

  console.log('[preproduction-templates/create] template criado', { id: newTemplate.id });
  return created(newTemplate, req);
}
