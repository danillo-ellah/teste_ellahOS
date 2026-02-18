// Mapa de traducao entre nomes da API (spec) e nomes do banco (real)
// A API expoe nomes da spec (contratos estaveis para o frontend)
// O banco usa nomes reais (como implementados na Fase 1)

// Mapa de colunas: API -> Banco
const API_TO_DB_COLUMNS: Record<string, string> = {
  job_type: 'project_type',
  fee: 'rate',
  is_lead_producer: 'is_responsible_producer',
  sub_status: 'pos_sub_status',
  previous_data: 'data_before',
  new_data: 'data_after',
  job_code: 'code',
};

// Mapa inverso: Banco -> API
const DB_TO_API_COLUMNS: Record<string, string> = {};
for (const [api, db] of Object.entries(API_TO_DB_COLUMNS)) {
  DB_TO_API_COLUMNS[db] = api;
}

// Mapa de valores do enum approval_type: API -> Banco
const APPROVAL_TYPE_API_TO_DB: Record<string, string> = {
  internal: 'interna',
  external: 'externa_cliente',
};

const APPROVAL_TYPE_DB_TO_API: Record<string, string> = {
  interna: 'internal',
  externa_cliente: 'external',
};

// Campos imutaveis que nao podem ser alterados via PATCH
export const IMMUTABLE_FIELDS = new Set([
  'id',
  'tenant_id',
  'index_number',
  'code',
  'job_aba',
  'created_at',
  'created_by',
  // Generated columns (calculados pelo banco)
  'tax_value',
  'gross_profit',
  'margin_percentage',
]);

// Converte payload da API para formato do banco
export function mapApiToDb(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const dbKey = API_TO_DB_COLUMNS[key] ?? key;

    // Traduzir valor de approval_type
    if (key === 'approval_type' && typeof value === 'string') {
      result[dbKey] = APPROVAL_TYPE_API_TO_DB[value] ?? value;
    } else {
      result[dbKey] = value;
    }
  }

  return result;
}

// Converte row do banco para formato da API
export function mapDbToApi(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const apiKey = DB_TO_API_COLUMNS[key] ?? key;

    // Traduzir valor de approval_type
    if (key === 'approval_type' && typeof value === 'string') {
      result[apiKey] = APPROVAL_TYPE_DB_TO_API[value] ?? value;
    } else {
      result[apiKey] = value;
    }
  }

  // Montar job_code a partir de code (se presente)
  if ('code' in row) {
    result['job_code'] = row['code'];
    delete result['code'];
  }

  return result;
}

// Remove campos imutaveis de um payload de update
export function removeImmutableFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!IMMUTABLE_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}
