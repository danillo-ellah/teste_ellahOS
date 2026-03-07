import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'admin'];

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      label: z.string().min(1).max(500),
      position: z.number().int().positive(),
    }),
  ).min(1).optional(),
}).strict();

export async function handleTemplatesUpdate(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[preproduction-templates/update] atualizando template', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para atualizar templates', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateTemplateSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  if (Object.keys(updates).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Nenhum campo fornecido para atualizar', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Verificar existencia — apenas templates ativos podem ser atualizados
  const { data: current, error: fetchError } = await client
    .from('preproduction_checklist_templates')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Template nao encontrado', 404);
  }

  // Gerar UUID para items sem id, se items foram fornecidos
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) {
    payload.name = updates.name;
  }
  if (updates.items !== undefined) {
    payload.items = updates.items.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      label: item.label,
      position: item.position,
    }));
  }

  const { data: updated, error: updateError } = await client
    .from('preproduction_checklist_templates')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[preproduction-templates/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar template', 500, {
      detail: updateError.message,
    });
  }

  console.log('[preproduction-templates/update] template atualizado', { id });
  return success(updated, 200, req);
}
