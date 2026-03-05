import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleExportData(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[job-timeline/export-data] exportando dados para PDF', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Buscar job com client e agency em paralelo
  const [jobResult, phasesResult, tenantResult] = await Promise.all([
    supabase
      .from('jobs')
      .select(
        'id, title, code, job_aba, project_type, status, expected_delivery_date, client_id, agency_id',
      )
      .eq('id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .single(),

    supabase
      .from('job_phases')
      .select(
        'id, phase_key, phase_label, phase_emoji, phase_color, start_date, end_date, complement, skip_weekends, status, sort_order',
      )
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),

    supabase
      .from('tenants')
      .select('company_name, logo_url, brand_color')
      .eq('id', auth.tenantId)
      .single(),
  ]);

  if (jobResult.error || !jobResult.data) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  if (phasesResult.error) {
    console.error('[job-timeline/export-data] erro ao buscar fases:', phasesResult.error);
    throw new AppError('INTERNAL_ERROR', phasesResult.error.message, 500);
  }

  const job = jobResult.data;

  // Buscar client e agency em paralelo (se existirem)
  const [clientResult, agencyResult] = await Promise.all([
    job.client_id
      ? supabase
          .from('clients')
          .select('id, name, logo_url')
          .eq('id', job.client_id)
          .single()
      : Promise.resolve({ data: null, error: null }),

    job.agency_id
      ? supabase
          .from('agencies')
          .select('id, name, logo_url')
          .eq('id', job.agency_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const exportPayload = {
    job: {
      id: job.id,
      title: job.title,
      code: job.code,
      job_aba: job.job_aba,
      project_type: job.project_type,
      status: job.status,
      expected_delivery_date: job.expected_delivery_date,
    },
    phases: phasesResult.data ?? [],
    client: clientResult.data
      ? {
          id: clientResult.data.id,
          name: clientResult.data.name,
          logo_url: clientResult.data.logo_url ?? null,
        }
      : null,
    agency: agencyResult.data
      ? {
          id: agencyResult.data.id,
          name: agencyResult.data.name,
          logo_url: agencyResult.data.logo_url ?? null,
        }
      : null,
    tenant: tenantResult.data
      ? {
          company_name: tenantResult.data.company_name ?? null,
          logo_url: tenantResult.data.logo_url ?? null,
          brand_color: tenantResult.data.brand_color ?? '#3B82F6',
        }
      : {
          company_name: null,
          logo_url: null,
          brand_color: '#3B82F6',
        },
    exported_at: new Date().toISOString(),
  };

  console.log(
    '[job-timeline/export-data] dados exportados com',
    exportPayload.phases.length,
    'fases',
  );

  return success(exportPayload, 200, req);
}
