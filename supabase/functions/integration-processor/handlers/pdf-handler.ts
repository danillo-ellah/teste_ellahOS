import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { buildApprovalInternalHtml, savePdfToDrive } from '../../_shared/pdf-generator.ts';

// Handler: processa evento pdf_generate
// Gera PDF de aprovacao interna ou outro tipo e salva no Drive
export async function processPdfEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const jobId = event.payload.job_id as string;
  const tenantId = event.tenant_id;
  const pdfType = (event.payload.type as string) ?? 'aprovacao_interna';

  if (!jobId) {
    throw new Error('pdf_generate: job_id ausente no payload');
  }

  console.log(`[pdf-handler] gerando PDF tipo="${pdfType}" para job ${jobId}`);

  if (pdfType !== 'aprovacao_interna') {
    throw new Error(`pdf_generate: tipo "${pdfType}" nao suportado. Tipos: aprovacao_interna`);
  }

  // Buscar dados do job (usando service client para eventos de fila)
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select(`
      *,
      clients (
        id, name, company_name, cnpj, address
      )
    `)
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new Error(`pdf_generate: job ${jobId} nao encontrado`);
  }

  // Buscar equipe
  const { data: team } = await serviceClient
    .from('job_team')
    .select(`
      id, role, rate, hiring_status,
      people (
        id, full_name, email
      )
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  const teamNormalized = (team ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    person_name: (m.people as Record<string, unknown>)?.full_name ?? null,
    name: (m.people as Record<string, unknown>)?.full_name ?? null,
  }));

  // Buscar datas de filmagem
  const { data: shootingDates } = await serviceClient
    .from('job_shooting_dates')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('shooting_date', { ascending: true });

  // Dados da empresa
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('name, settings')
    .eq('id', tenantId)
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

  // Salvar no Drive
  const jobCode = (job.code as string) ?? (job.job_aba as string) ?? jobId.slice(0, 8);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Aprovacao_Interna_${jobCode}_${dateStr}.html`;

  const encoder = new TextEncoder();
  const htmlBytes = encoder.encode(html);

  const driveResult = await savePdfToDrive(serviceClient, {
    tenantId,
    jobId,
    pdfBytes: htmlBytes,
    fileName,
    folderKey: 'documentos',
    fileType: 'aprovacao_interna',
  });

  console.log(`[pdf-handler] PDF salvo no Drive: ${driveResult.driveUrl}`);

  return {
    job_id: jobId,
    type: pdfType,
    drive_file_id: driveResult.driveFileId,
    drive_url: driveResult.driveUrl,
    job_file_id: driveResult.jobFileId,
    html_length: html.length,
  };
}
