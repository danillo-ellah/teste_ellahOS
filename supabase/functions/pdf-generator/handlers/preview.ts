import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { AppError } from '../../_shared/errors.ts';
import { buildApprovalInternalHtml } from '../../_shared/pdf-generator.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Tipos de preview suportados
const SUPPORTED_TYPES = ['aprovacao-interna'];

// Roles com permissao de visualizar preview de aprovacao
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function previewHandler(
  _req: Request,
  auth: AuthContext,
  previewType: string,
  jobId: string | null,
): Promise<Response> {
  // Verificar permissao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para visualizar preview', 403);
  }

  if (!previewType || !SUPPORTED_TYPES.includes(previewType)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Tipo de preview invalido: "${previewType}". Tipos suportados: ${SUPPORTED_TYPES.join(', ')}`,
      400,
    );
  }

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[preview] type=${previewType} job_id=${jobId} user=${auth.userId}`);

  // Buscar dados do job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (
        id, name, company_name, cnpj, address
      )
    `)
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar equipe
  const { data: team } = await supabase
    .from('job_team')
    .select(`
      id, role, rate, hiring_status,
      people (
        id, full_name, email
      )
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  const teamNormalized = (team ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    person_name: (m.people as Record<string, unknown>)?.full_name ?? null,
    name: (m.people as Record<string, unknown>)?.full_name ?? null,
  }));

  // Buscar datas de filmagem
  const { data: shootingDates } = await supabase
    .from('job_shooting_dates')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('shooting_date', { ascending: true });

  // Dados da empresa
  const serviceClient = getServiceClient();
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('name, settings')
    .eq('id', auth.tenantId)
    .single();

  const tenantSettings = (tenant?.settings as Record<string, unknown>) ?? {};
  const companyInfo = (tenantSettings.company_info as Record<string, unknown>) ?? {
    name: tenant?.name ?? 'Ellah Filmes',
    cnpj: '',
    address: '',
  };
  if (!companyInfo.name) {
    companyInfo.name = tenant?.name ?? 'Ellah Filmes';
  }

  // Montar HTML
  const clientData = (job.clients as Record<string, unknown>) ?? {};
  const html = buildApprovalInternalHtml({
    job,
    client: clientData,
    team: teamNormalized,
    shootingDates: shootingDates ?? [],
    companyInfo,
  });

  console.log(`[preview] HTML gerado (${html.length} chars) para job ${jobId}`);

  // Retornar HTML diretamente (para renderizar em iframe no frontend)
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
