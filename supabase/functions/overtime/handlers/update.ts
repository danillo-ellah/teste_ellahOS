import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

const UpdateTimeEntrySchema = z
  .object({
    check_in: z.string().regex(TIME_REGEX, 'check_in deve ser HH:MM ou HH:MM:SS'),
    check_out: z.string().regex(TIME_REGEX, 'check_out deve ser HH:MM ou HH:MM:SS').nullable(),
    break_minutes: z.number().int().min(0).max(480),
    overtime_rate: z.number().min(0),
    notes: z.string().max(2000).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

// Roles que podem atualizar lancamentos de outros (admins)
const ADMIN_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[overtime/update] atualizando lancamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    entryId: id,
  });

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateTimeEntrySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que o lancamento existe e pertence ao tenant
  const { data: existing } = await client
    .from('time_entries')
    .select('id, approved_by')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Lancamento de ponto nao encontrado', 404);
  }

  // Lancamentos ja aprovados so podem ser alterados por admins
  if (existing.approved_by && !ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Lancamentos aprovados so podem ser alterados por administradores',
      403,
    );
  }

  const { data: updatedEntry, error: updateError } = await client
    .from('time_entries')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[overtime/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar lancamento de ponto', 500, {
      detail: updateError.message,
    });
  }

  console.log('[overtime/update] lancamento atualizado com sucesso', { id });
  return success(updatedEntry, 200, req);
}
