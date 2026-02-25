import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { buildApprovalInternalHtml, savePdfToDrive } from '../../_shared/pdf-generator.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para gerar aprovacao interna
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function generateApprovalHandler(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para gerar aprovacao interna', 403);
  }

  // Validar payload
  let body: { job_id?: string; save_to_drive?: boolean; save_to_files?: boolean };
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const jobId = body.job_id;
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  const saveToDrive = body.save_to_drive !== false; // default true
  const saveToFiles = body.save_to_files !== false; // default true

  const supabase = getSupabaseClient(auth.token);

  console.log(`[aprovacao-interna] user=${auth.userId} job_id=${jobId}`);

  // 1. Buscar dados do job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id, code, job_aba, title, brand, project_type, format, segment,
      total_duration_seconds, pieces_count, po_number, commercial_responsible,
      approval_date, expected_delivery_date, post_start_date, post_deadline,
      has_contracted_audio, has_computer_graphics, ancine_number, audio_company,
      media_type, broadcast_period, approved_by_name, approved_by_email,
      closed_value, production_cost, tax_value, gross_profit, margin_percentage,
      payment_terms, agency_name, client_contact_name,
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

  // 2. Buscar equipe do job com dados da pessoa
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

  // Normalizar team para o formato esperado pelo template
  const teamNormalized = (team ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    person_name: (m.people as Record<string, unknown>)?.full_name ?? null,
    name: (m.people as Record<string, unknown>)?.full_name ?? null,
  }));

  // 3. Buscar datas de filmagem
  const { data: shootingDates } = await supabase
    .from('job_shooting_dates')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('shooting_date', { ascending: true });

  // 4. Buscar dados da empresa (tenant settings)
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
  // Garantir que name esteja presente
  if (!companyInfo.name) {
    companyInfo.name = tenant?.name ?? 'Ellah Filmes';
  }

  // 5. Montar HTML
  const clientData = (job.clients as Record<string, unknown>) ?? {};
  const html = buildApprovalInternalHtml({
    job,
    client: clientData,
    team: teamNormalized,
    shootingDates: shootingDates ?? [],
    companyInfo,
  });

  console.log(`[aprovacao-interna] HTML gerado (${html.length} chars) para job ${jobId}`);

  // 6. Salvar no Drive e em job_files (se configurado)
  let driveResult: { driveFileId: string; driveUrl: string; jobFileId: string } | null = null;

  if (saveToDrive || saveToFiles) {
    const jobCode = (job.code as string) ?? (job.job_aba as string) ?? jobId.slice(0, 8);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Aprovacao_Interna_${jobCode}_${dateStr}.html`;

    // Converter HTML para bytes
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);

    try {
      driveResult = await savePdfToDrive(serviceClient, {
        tenantId: auth.tenantId,
        jobId,
        pdfBytes: htmlBytes,
        fileName,
        folderKey: 'documentos',
        fileType: 'aprovacao_interna',
      });

      console.log(`[aprovacao-interna] salvo no Drive: ${driveResult.driveUrl}`);
    } catch (driveErr) {
      const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
      console.error(`[aprovacao-interna] falha ao salvar no Drive: ${msg}`);
      // Nao bloqueia — retorna o HTML mesmo assim
    }
  }

  // 7. Registrar no historico do job
  try {
    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId,
      eventType: 'field_update',
      userId: auth.userId,
      description: 'Aprovacao interna gerada',
      dataAfter: {
        action: 'approval_internal_generated',
        drive_url: driveResult?.driveUrl ?? null,
        generated_by: auth.userId,
      },
    });
  } catch (histErr) {
    console.warn('[aprovacao-interna] falha ao registrar historico (nao critico):', histErr);
  }

  return success({
    job_id: jobId,
    html_length: html.length,
    drive_file_id: driveResult?.driveFileId ?? null,
    drive_url: driveResult?.driveUrl ?? null,
    job_file_id: driveResult?.jobFileId ?? null,
    generated_at: new Date().toISOString(),
  });
}
