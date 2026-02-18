import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HistoryEventType } from './types.ts';

// Parametros para inserir um registro no historico
interface InsertHistoryParams {
  tenantId: string;
  jobId: string;
  eventType: HistoryEventType;
  userId: string;
  dataBefore?: Record<string, unknown> | null;
  dataAfter?: Record<string, unknown> | null;
  description: string;
}

// Insere um registro no job_history (tabela append-only)
export async function insertHistory(
  client: SupabaseClient,
  params: InsertHistoryParams,
): Promise<void> {
  const { error } = await client.from('job_history').insert({
    tenant_id: params.tenantId,
    job_id: params.jobId,
    event_type: params.eventType,
    user_id: params.userId,
    data_before: params.dataBefore ?? null,
    data_after: params.dataAfter ?? null,
    description: params.description,
  });

  if (error) {
    // Log mas nao bloqueia a operacao principal
    console.error('Erro ao inserir historico:', error.message);
  }
}

// Gera descricao legivel para mudanca de campo
export function describeFieldChange(
  field: string,
  oldValue: unknown,
  newValue: unknown,
): string {
  const fieldLabels: Record<string, string> = {
    title: 'Titulo',
    status: 'Status',
    priority: 'Prioridade',
    closed_value: 'Valor fechado',
    production_cost: 'Custo de producao',
    tax_percentage: 'Percentual de impostos',
    expected_delivery_date: 'Data prevista de entrega',
    brand: 'Marca',
    notes: 'Observacoes',
    is_archived: 'Arquivado',
  };

  const label = fieldLabels[field] ?? field;
  if (oldValue === null || oldValue === undefined) {
    return `${label} definido como "${newValue}"`;
  }
  return `${label} alterado de "${oldValue}" para "${newValue}"`;
}
