import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Regex para validar formato HH:MM ou HH:MM:SS
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

const CreateTimeEntrySchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  team_member_id: z.string().uuid('team_member_id deve ser UUID valido'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entry_date deve ser YYYY-MM-DD'),
  check_in: z.string().regex(TIME_REGEX, 'check_in deve ser HH:MM ou HH:MM:SS'),
  check_out: z.string().regex(TIME_REGEX, 'check_out deve ser HH:MM ou HH:MM:SS').nullable().optional(),
  break_minutes: z.number().int().min(0, 'break_minutes nao pode ser negativo').max(480).optional().default(60),
  overtime_rate: z.number().min(0, 'overtime_rate nao pode ser negativo').optional().default(0),
  notes: z.string().max(2000).nullable().optional(),
});

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[overtime/create] registrando ponto', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateTimeEntrySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que o job pertence ao tenant
  const { data: job } = await client
    .from('jobs')
    .select('id')
    .eq('id', data.job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar que o membro pertence ao job
  const { data: teamMember } = await client
    .from('job_team')
    .select('id')
    .eq('id', data.team_member_id)
    .eq('job_id', data.job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!teamMember) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado neste job', 404);
  }

  // Verificar duplicidade (mesmo job/membro/data)
  const { data: existing } = await client
    .from('time_entries')
    .select('id')
    .eq('job_id', data.job_id)
    .eq('team_member_id', data.team_member_id)
    .eq('entry_date', data.entry_date)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    throw new AppError(
      'CONFLICT',
      `Ja existe um lancamento para este membro na data ${data.entry_date}`,
      409,
    );
  }

  const { data: createdEntry, error: insertError } = await client
    .from('time_entries')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      team_member_id: data.team_member_id,
      entry_date: data.entry_date,
      check_in: data.check_in,
      check_out: data.check_out ?? null,
      break_minutes: data.break_minutes,
      overtime_rate: data.overtime_rate,
      notes: data.notes ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    // Tratar violacao de UNIQUE constraint do banco
    if (insertError.message.includes('uq_time_entry_member_date')) {
      throw new AppError(
        'CONFLICT',
        `Ja existe um lancamento para este membro na data ${data.entry_date}`,
        409,
      );
    }
    console.error('[overtime/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar lancamento de ponto', 500, {
      detail: insertError.message,
    });
  }

  console.log('[overtime/create] lancamento registrado com sucesso', { id: createdEntry.id });
  return created(createdEntry, req);
}
