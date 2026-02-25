import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import { buildNfRequestEmail } from '../_shared/email-template.ts';
import type { NfRequestItem, CompanyInfo } from '../_shared/email-template.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de validacao do payload
const RequestSendSchema = z.object({
  financial_record_ids: z
    .array(z.string().uuid('Cada financial_record_id deve ser UUID valido'))
    .min(1, 'Ao menos um financial_record_id e necessario')
    .max(100, 'Maximo de 100 registros por envio'),
  custom_message: z.string().max(1000).optional().nullable(),
});

type RequestSendInput = z.infer<typeof RequestSendSchema>;

interface FinancialRecordWithPeople {
  id: string;
  description: string;
  amount: number;
  supplier_email: string | null;
  nf_request_status: string | null;
  job_id: string | null;
  person_id: string | null;
  people: {
    email: string | null;
    full_name: string | null;
  } | null;
  jobs: {
    code: string;
    title: string;
  } | null;
}

interface SupplierGroup {
  supplier_email: string;
  supplier_name: string;
  items: NfRequestItem[];
  financial_record_ids: string[];
}

export async function requestSendNf(req: Request, auth: AuthContext): Promise<Response> {
  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = RequestSendSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: RequestSendInput = result.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(`[request-send] user=${auth.userId} records=${input.financial_record_ids.length}`);

  // 1. Buscar dados dos financial_records + supplier (via people) + job
  const { data: records, error: recordsError } = await supabase
    .from('financial_records')
    .select(`
      id,
      description,
      amount,
      supplier_email,
      nf_request_status,
      job_id,
      person_id,
      people (
        email,
        full_name
      ),
      jobs (
        code,
        title
      )
    `)
    .in('id', input.financial_record_ids)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (recordsError) {
    console.error('[request-send] falha ao buscar financial_records:', recordsError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao buscar registros financeiros', 500);
  }

  if (!records || records.length === 0) {
    throw new AppError('NOT_FOUND', 'Nenhum registro financeiro encontrado', 404);
  }

  // 2. Validar registros e separar erros
  const errors: Array<{ financial_record_id: string; reason: string }> = [];
  const validRecords: FinancialRecordWithPeople[] = [];

  for (const rec of records as FinancialRecordWithPeople[]) {
    const supplierEmail = rec.supplier_email ?? rec.people?.email ?? null;

    if (!supplierEmail) {
      errors.push({ financial_record_id: rec.id, reason: 'sem email do fornecedor' });
      continue;
    }

    if (rec.nf_request_status === 'validado' || rec.nf_request_status === 'recebido') {
      errors.push({ financial_record_id: rec.id, reason: 'NF ja recebida ou validada para este registro' });
      continue;
    }

    validRecords.push(rec);
  }

  if (validRecords.length === 0) {
    return success({
      events_created: 0,
      suppliers: [],
      errors,
    });
  }

  // 3. Buscar dados da empresa (tenant.settings.company_info)
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenantData?.settings as Record<string, unknown>) ?? {};
  const companyInfoRaw = (settings?.company_info as Record<string, unknown>) ?? {};

  const companyInfo: CompanyInfo = {
    name: (companyInfoRaw?.name as string) ?? 'Ellah Filmes',
    cnpj: (companyInfoRaw?.cnpj as string) ?? undefined,
    address: (companyInfoRaw?.address as string) ?? undefined,
    email: (companyInfoRaw?.email as string) ?? undefined,
    phone: (companyInfoRaw?.phone as string) ?? undefined,
  };

  // 4. Agrupar registros por fornecedor (1 email por fornecedor)
  const supplierMap = new Map<string, SupplierGroup>();

  for (const rec of validRecords) {
    const supplierEmail = (rec.supplier_email ?? rec.people?.email)!;
    const supplierName = rec.people?.full_name ?? supplierEmail;
    const job = rec.jobs;

    if (!supplierMap.has(supplierEmail)) {
      supplierMap.set(supplierEmail, {
        supplier_email: supplierEmail,
        supplier_name: supplierName,
        items: [],
        financial_record_ids: [],
      });
    }

    const group = supplierMap.get(supplierEmail)!;
    group.items.push({
      description: rec.description ?? 'Servico prestado',
      amount: rec.amount ?? 0,
      job_code: job?.code ?? '—',
      job_title: job?.title ?? '—',
      financial_record_id: rec.id,
    });
    group.financial_record_ids.push(rec.id);
  }

  // 5. Para cada fornecedor: montar email e enfileirar integration_event
  const eventIds: string[] = [];
  const suppliersResult: Array<{ supplier_email: string; supplier_name: string; item_count: number }> = [];

  for (const [, group] of supplierMap) {
    const { subject, html, text } = buildNfRequestEmail({
      supplier_name: group.supplier_name,
      supplier_email: group.supplier_email,
      items: group.items,
      company_info: companyInfo,
      custom_message: input.custom_message ?? undefined,
      reply_to: companyInfo.email,
    });

    try {
      const idempotencyKey = `nf-request:${auth.tenantId}:${group.supplier_email}:${group.financial_record_ids.sort().join(',')}`;

      const eventId = await enqueueEvent(serviceClient, {
        tenant_id: auth.tenantId,
        event_type: 'nf_email_send',
        payload: {
          supplier_email: group.supplier_email,
          supplier_name: group.supplier_name,
          financial_record_ids: group.financial_record_ids,
          email_subject: subject,
          email_html: html,
          email_text: text,
          reply_to: companyInfo.email ?? null,
          requested_by: auth.userId,
        },
        idempotency_key: idempotencyKey,
      });

      eventIds.push(eventId);
      suppliersResult.push({
        supplier_email: group.supplier_email,
        supplier_name: group.supplier_name,
        item_count: group.items.length,
      });

      // 6. Atualizar nf_request_status para 'enviado' em todos os registros do grupo
      const { error: updateError } = await supabase
        .from('financial_records')
        .update({ nf_request_status: 'enviado' })
        .in('id', group.financial_record_ids)
        .eq('tenant_id', auth.tenantId);

      if (updateError) {
        console.error('[request-send] falha ao atualizar nf_request_status:', updateError.message);
      }
    } catch (enqueueErr) {
      console.error(`[request-send] falha ao enfileirar evento para ${group.supplier_email}:`, enqueueErr);
      for (const recordId of group.financial_record_ids) {
        errors.push({ financial_record_id: recordId, reason: 'falha ao enfileirar evento de envio' });
      }
    }
  }

  console.log(`[request-send] ${eventIds.length} evento(s) criados para ${suppliersResult.length} fornecedor(es)`);

  return success({
    events_created: eventIds.length,
    suppliers: suppliersResult,
    errors,
  });
}
