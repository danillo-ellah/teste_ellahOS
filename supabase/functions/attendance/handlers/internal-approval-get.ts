import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
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

export async function handleInternalApprovalGet(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[attendance/internal-approval-get] buscando aprovacao interna', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para acessar aprovacao interna',
      403,
    );
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  const client = getSupabaseClient(auth.token);

  const { data: approval, error: fetchError } = await client
    .from('job_internal_approvals')
    .select(
      `id, job_id, status, scope_description, team_description,
       shooting_dates_confirmed, approved_budget, deliverables_description,
       notes, approved_by, approved_at, created_by, created_at, updated_at,
       profiles!job_internal_approvals_approved_by_fkey(full_name)`,
    )
    .eq('tenant_id', auth.tenantId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (fetchError) {
    console.error('[attendance/internal-approval-get] erro na query:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar aprovacao interna', 500, {
      detail: fetchError.message,
    });
  }

  // Retorna null se nao existe ainda (frontend decide se mostra form de criacao)
  if (!approval) {
    return new Response(
      JSON.stringify({ data: null }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }

  const profile = (approval as Record<string, unknown>).profiles as { full_name: string } | null;
  const normalized = {
    ...approval,
    profiles: undefined,
    approved_by_name: profile?.full_name ?? null,
  };

  return new Response(
    JSON.stringify({ data: normalized }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
