import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const UpdateCommunicationSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entry_date deve ser YYYY-MM-DD').optional(),
  entry_type: z.enum(
    ['decisao', 'alteracao', 'informacao', 'aprovacao', 'satisfacao_automatica', 'registro_set', 'outro'],
  ).optional(),
  channel: z.enum(
    ['whatsapp', 'email', 'reuniao', 'telefone', 'presencial', 'sistema'],
  ).optional(),
  description: z.string().min(1).max(5000).optional(),
  shared_with_team: z.boolean().optional(),
  team_note: z.string().max(2000).optional().nullable(),
}).strict();

export async function handleCommunicationsUpdate(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/communications-update] atualizando comunicacao', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para atualizar comunicacoes', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateCommunicationSchema.safeParse(body);
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

  // Verificar existencia e ownership (soft delete)
  const { data: current, error: fetchError } = await client
    .from('client_communications')
    .select('id, created_by')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Comunicacao nao encontrada', 404);
  }

  const { data: updated, error: updateError } = await client
    .from('client_communications')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[attendance/communications-update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar comunicacao', 500, {
      detail: updateError.message,
    });
  }

  console.log('[attendance/communications-update] comunicacao atualizada', { id });
  return success(updated, 200, req);
}
