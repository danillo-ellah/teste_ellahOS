import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const UpsertInternalApprovalSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  scope_description: z.string().max(5000).optional().nullable(),
  team_description: z.string().max(5000).optional().nullable(),
  shooting_dates_confirmed: z.boolean().optional(),
  approved_budget: z.number().min(0).optional().nullable(),
  deliverables_description: z.string().max(5000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function handleInternalApprovalUpsert(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[attendance/internal-approval-upsert] upsert aprovacao interna', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para editar aprovacao interna',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpsertInternalApprovalSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Upsert com ON CONFLICT (job_id) — atomico e idempotente
  // Na insercao, status comeca como 'rascunho' e nao pode ser alterado via upsert (apenas via approve)
  const { data: upserted, error: upsertError } = await client
    .from('job_internal_approvals')
    .upsert(
      {
        tenant_id: auth.tenantId,
        job_id: data.job_id,
        scope_description: data.scope_description ?? null,
        team_description: data.team_description ?? null,
        shooting_dates_confirmed: data.shooting_dates_confirmed ?? false,
        approved_budget: data.approved_budget ?? null,
        deliverables_description: data.deliverables_description ?? null,
        notes: data.notes ?? null,
        // created_by sera preenchido na insercao inicial
        created_by: auth.userId,
      },
      {
        onConflict: 'job_id',
        // ignoreDuplicates: false para que o UPDATE seja aplicado
      },
    )
    .select('*')
    .single();

  if (upsertError) {
    console.error('[attendance/internal-approval-upsert] erro no upsert:', upsertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar aprovacao interna', 500, {
      detail: upsertError.message,
    });
  }

  console.log('[attendance/internal-approval-upsert] aprovacao salva', {
    id: upserted.id,
    job_id: data.job_id,
  });

  return new Response(
    JSON.stringify({ data: upserted }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
