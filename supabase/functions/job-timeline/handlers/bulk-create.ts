import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Fases default do cronograma de producao audiovisual
const DEFAULT_PHASES = [
  {
    phase_key: 'orcamento',
    phase_label: 'Orcamento',
    phase_emoji: '',
    phase_color: '#F59E0B',
    sort_order: 0,
  },
  {
    phase_key: 'briefing',
    phase_label: 'Reuniao de Briefing',
    phase_emoji: '',
    phase_color: '#8B5CF6',
    sort_order: 1,
  },
  {
    phase_key: 'pre_producao',
    phase_label: 'Pre-Producao',
    phase_emoji: '',
    phase_color: '#3B82F6',
    sort_order: 2,
  },
  {
    phase_key: 'ppm',
    phase_label: 'PPM',
    phase_emoji: '',
    phase_color: '#06B6D4',
    sort_order: 3,
  },
  {
    phase_key: 'filmagem',
    phase_label: 'Filmagem',
    phase_emoji: '',
    phase_color: '#EF4444',
    sort_order: 4,
  },
  {
    phase_key: 'pos_producao',
    phase_label: 'Pos-Producao',
    phase_emoji: '',
    phase_color: '#F97316',
    sort_order: 5,
  },
  {
    phase_key: 'finalizacao',
    phase_label: 'Finalizacao',
    phase_emoji: '',
    phase_color: '#EC4899',
    sort_order: 6,
  },
  {
    phase_key: 'entrega',
    phase_label: 'Entrega',
    phase_emoji: '',
    phase_color: '#10B981',
    sort_order: 7,
  },
];

export async function handleBulkCreate(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[job-timeline/bulk-create] criando fases default', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar fases em lote', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Checar se o job ja possui fases — evitar duplicacao
  const { count, error: countErr } = await supabase
    .from('job_phases')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (countErr) {
    console.error('[job-timeline/bulk-create] erro ao checar fases existentes:', countErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar fases existentes', 500);
  }

  if ((count ?? 0) > 0) {
    throw new AppError(
      'CONFLICT',
      'O job ja possui fases criadas. Use a criacao individual para adicionar novas fases.',
      409,
      { existing_count: count },
    );
  }

  // Inserir todas as fases default de uma vez
  const rows = DEFAULT_PHASES.map((phase) => ({
    ...phase,
    job_id: jobId,
    tenant_id: auth.tenantId,
    status: 'pending' as const,
    skip_weekends: true,
    start_date: null,
    end_date: null,
    complement: null,
  }));

  const { data: phases, error: insertErr } = await supabase
    .from('job_phases')
    .insert(rows)
    .select();

  if (insertErr) {
    console.error('[job-timeline/bulk-create] erro ao inserir fases default:', insertErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar fases em lote', 500);
  }

  console.log('[job-timeline/bulk-create] fases default criadas:', phases?.length ?? 0);

  return created(phases ?? [], req);
}
