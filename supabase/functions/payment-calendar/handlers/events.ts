import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Schema de validacao dos query params
const QuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date deve estar no formato YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date deve estar no formato YYYY-MM-DD'),
  job_id: z.string().uuid('job_id deve ser um UUID valido').optional(),
  type: z.enum(['payable', 'receivable', 'all']).default('all'),
});

// Tipo retornado para eventos de custo (a pagar)
interface PayableEvent {
  id: string;
  date: string;
  type: 'cost_item';
  amount: number;
  status: string;
  is_overdue: boolean;
  description: string;
  vendor_name: string | null;
  job_id: string;
  job_code: string;
  job_title: string;
  payment_method: string | null;
  nf_status: string | null;
}

// Tipo retornado para eventos de receita (a receber)
interface ReceivableEvent {
  id: string;
  date: string;
  type: 'job_payment' | 'invoice';
  amount: number;
  status: string;
  description: string;
  client_name: string | null;
  job_id: string;
  job_code: string;
  job_title: string;
}

// Handler GET /payment-calendar/events
// Retorna payables (cost_items) e receivables (jobs + invoices) no range de datas
export async function eventsHandler(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);

  // Validar query params
  const parseResult = QuerySchema.safeParse({
    start_date: url.searchParams.get('start_date'),
    end_date: url.searchParams.get('end_date'),
    job_id: url.searchParams.get('job_id') ?? undefined,
    type: url.searchParams.get('type') ?? 'all',
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return error('VALIDATION_ERROR', firstError.message, 400, undefined, req);
  }

  const { start_date, end_date, job_id, type } = parseResult.data;

  // Validar que start_date <= end_date
  if (start_date > end_date) {
    return error(
      'VALIDATION_ERROR',
      'start_date deve ser menor ou igual a end_date',
      400,
      undefined,
      req,
    );
  }

  const client = getSupabaseClient(auth.token);
  const today = new Date().toISOString().split('T')[0];

  console.log(`[payment-calendar/events] tenant=${auth.tenantId} range=${start_date}..${end_date} type=${type} job_id=${job_id ?? 'all'}`);

  try {
    // Executar queries em paralelo conforme o tipo solicitado
    const [costItemsResult, jobsResult, invoicesResult] = await Promise.all([
      // 1. Payables: cost_items com vencimento no range
      type !== 'receivable'
        ? (() => {
            let q = client
              .from('cost_items')
              .select(
                'id, payment_due_date, total_value, payment_status, service_description, vendor_name_snapshot, job_id, payment_method, nf_request_status, jobs!inner(code, title)',
              )
              .eq('tenant_id', auth.tenantId)
              .is('deleted_at', null)
              .eq('is_category_header', false)
              .gte('payment_due_date', start_date)
              .lte('payment_due_date', end_date)
              .neq('payment_status', 'cancelado');
            if (job_id) q = q.eq('job_id', job_id);
            return q;
          })()
        : Promise.resolve({ data: [], error: null }),

      // 2. Receivables: jobs com payment_date no range (receita do cliente)
      type !== 'payable'
        ? (() => {
            let q = client
              .from('jobs')
              .select('id, code, title, payment_date, closed_value, clients(company_name)')
              .eq('tenant_id', auth.tenantId)
              .is('deleted_at', null)
              .gte('payment_date', start_date)
              .lte('payment_date', end_date);
            if (job_id) q = q.eq('id', job_id);
            return q;
          })()
        : Promise.resolve({ data: [], error: null }),

      // 3. Receivables: invoices (NFs emitidas para clientes) com due_date no range
      type !== 'payable'
        ? (() => {
            let q = client
              .from('invoices')
              .select('id, due_date, amount, status, type, job_id, jobs(code, title)')
              .eq('tenant_id', auth.tenantId)
              .is('deleted_at', null)
              .gte('due_date', start_date)
              .lte('due_date', end_date)
              .neq('status', 'cancelada');
            if (job_id) q = q.eq('job_id', job_id);
            return q;
          })()
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Checar erros das queries
    if (costItemsResult.error) {
      console.error('[payment-calendar/events] erro cost_items:', costItemsResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pagamentos', 500);
    }
    if (jobsResult.error) {
      console.error('[payment-calendar/events] erro jobs:', jobsResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar receitas de jobs', 500);
    }
    if (invoicesResult.error) {
      console.error('[payment-calendar/events] erro invoices:', invoicesResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar invoices', 500);
    }

    // Mapear cost_items -> PayableEvent[]
    const payables: PayableEvent[] = (costItemsResult.data ?? []).map((item: Record<string, unknown>) => {
      const job = (item.jobs as Record<string, unknown> | null) ?? {};
      const dueDate = item.payment_due_date as string;
      const status = (item.payment_status as string) ?? 'pendente';

      return {
        id: item.id as string,
        date: dueDate,
        type: 'cost_item' as const,
        amount: (item.total_value as number) ?? 0,
        status,
        // Vencido: data de vencimento antes de hoje E ainda pendente
        is_overdue: dueDate < today && status === 'pendente',
        description: (item.service_description as string) ?? '',
        vendor_name: (item.vendor_name_snapshot as string | null) ?? null,
        job_id: item.job_id as string,
        job_code: (job.code as string) ?? '',
        job_title: (job.title as string) ?? '',
        payment_method: (item.payment_method as string | null) ?? null,
        nf_status: (item.nf_request_status as string | null) ?? null,
      };
    });

    // Mapear jobs -> ReceivableEvent[] (receita do cliente)
    const jobReceivables: ReceivableEvent[] = (jobsResult.data ?? []).map((job: Record<string, unknown>) => {
      const clients = (job.clients as Record<string, unknown> | null) ?? {};
      return {
        id: job.id as string,
        date: job.payment_date as string,
        type: 'job_payment' as const,
        amount: (job.closed_value as number) ?? 0,
        status: 'pendente',
        description: `Recebimento - ${job.title as string}`,
        client_name: (clients.company_name as string | null) ?? null,
        job_id: job.id as string,
        job_code: job.code as string,
        job_title: job.title as string,
      };
    });

    // Mapear invoices -> ReceivableEvent[]
    const invoiceReceivables: ReceivableEvent[] = (invoicesResult.data ?? []).map((inv: Record<string, unknown>) => {
      const job = (inv.jobs as Record<string, unknown> | null) ?? {};
      return {
        id: inv.id as string,
        date: inv.due_date as string,
        type: 'invoice' as const,
        amount: (inv.amount as number) ?? 0,
        status: (inv.status as string) ?? 'pendente',
        description: `NF - ${job.title as string ?? inv.job_id ?? ''}`,
        client_name: null,
        job_id: (inv.job_id as string) ?? '',
        job_code: (job.code as string) ?? '',
        job_title: (job.title as string) ?? '',
      };
    });

    const receivables: ReceivableEvent[] = [...jobReceivables, ...invoiceReceivables];

    console.log(`[payment-calendar/events] retornando payables=${payables.length} receivables=${receivables.length}`);

    return success({ payables, receivables }, 200, req);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[payment-calendar/events] erro inesperado:', err);
    throw new AppError('INTERNAL_ERROR', 'Erro interno ao processar eventos do calendario', 500);
  }
}
