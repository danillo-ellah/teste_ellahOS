import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para atualizar entradas no diario
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'];

// Schema de atualizacao (todos os campos opcionais)
const UpdateDiaryEntrySchema = z.object({
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD').optional(),
  day_number: z.number().int().min(1).optional(),
  weather_condition: z.enum(['sol', 'nublado', 'chuva', 'noturna']).optional(),
  call_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM').nullable().optional(),
  wrap_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM').nullable().optional(),
  planned_scenes: z.string().max(2000).nullable().optional(),
  filmed_scenes: z.string().max(2000).nullable().optional(),
  total_takes: z.number().int().min(0).nullable().optional(),
  observations: z.string().max(5000).nullable().optional(),
  issues: z.string().max(5000).nullable().optional(),
  highlights: z.string().max(5000).nullable().optional(),
}).strict();

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[production-diary/update] atualizando entrada', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para atualizar entradas do diario de producao',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateDiaryEntrySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que a entrada existe e pertence ao tenant
  const { data: current, error: fetchError } = await client
    .from('production_diary_entries')
    .select('id, job_id, shooting_date')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Entrada do diario nao encontrada', 404);
  }

  // Verificar conflito de data se shooting_date mudou
  if (updates.shooting_date && updates.shooting_date !== current.shooting_date) {
    const { data: conflict } = await client
      .from('production_diary_entries')
      .select('id')
      .eq('job_id', current.job_id)
      .eq('shooting_date', updates.shooting_date)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .neq('id', id)
      .maybeSingle();

    if (conflict) {
      throw new AppError(
        'CONFLICT',
        `Ja existe uma entrada no diario para a data ${updates.shooting_date}`,
        409,
      );
    }
  }

  const { data: updated, error: updateError } = await client
    .from('production_diary_entries')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[production-diary/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar entrada do diario', 500, {
      detail: updateError.message,
    });
  }

  console.log('[production-diary/update] entrada atualizada com sucesso', { id });
  return success(updated, 200, req);
}
