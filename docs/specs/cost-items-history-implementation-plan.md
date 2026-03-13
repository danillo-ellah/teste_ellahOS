# Plano de Implementacao: Historico de Cost Items

**ADR:** ADR-035
**Estimativa:** 3-4h de implementacao
**Dependencias:** Nenhuma migration necessaria

---

## Ordem de implementacao

### 1. Backend: Handler `history.ts` (1h)

**Arquivo:** `supabase/functions/cost-items/handlers/history.ts`

```typescript
// Pseudo-codigo do handler

import { AuthContext } from '../../_shared/auth.ts'
import { canViewFinancials } from '../../_shared/financial-mask.ts'
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts'
import { getCorsHeaders } from '../../_shared/cors.ts'
import { getSupabaseClient } from '../../_shared/supabase-client.ts'
import { AppError } from '../../_shared/errors.ts'

// Mapa de labels dos campos (hardcoded, performance-friendly)
const FIELD_LABELS: Record<string, string> = { ... } // ver ADR-035

// Campos ignorados no diff (nao relevantes para o usuario)
const IGNORED_FIELDS = new Set([
  'id', 'tenant_id', 'job_id', 'created_at', 'updated_at', 'deleted_at',
  'created_by', 'import_source', 'suggested_status', 'status_note',
  'nf_requested_at', 'nf_requested_by', 'normalized_name',
])

// ENUMs com display labels
const ENUM_DISPLAYS: Record<string, Record<string, string>> = {
  item_status: { orcado: 'Orcado', aguardando_nf: 'Aguardando NF', ... },
  payment_condition: { a_vista: 'A Vista', cnf_30: 'C/NF 30 dias', ... },
  payment_method: { pix: 'PIX', ted: 'TED', ... },
  payment_status: { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado' },
  nf_request_status: { ... },
  payment_approval_status: { ... },
}

export async function handleHistory(req: Request, auth: AuthContext, jobId: string) {
  // 1. Verificar permissao (canViewFinancials)
  if (!canViewFinancials(auth.role)) throw FORBIDDEN

  // 2. Parsear paginacao
  const url = new URL(req.url)
  const pagination = parsePagination(url, ['created_at'])
  const filterAction = url.searchParams.get('action') // INSERT|UPDATE|DELETE

  // 3. Buscar IDs de cost_items do job (incluindo deletados para historico)
  const client = getSupabaseClient(auth.token)
  const { data: costItemRows } = await client
    .from('cost_items')
    .select('id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    // NAO filtrar deleted_at — queremos historico de itens deletados tambem

  // Nota: cost_items com soft-delete mantem deleted_at != null
  // Precisamos buscar TODOS os IDs que ja pertenceram a este job
  // Mas a RLS pode esconder os deletados... Alternativa: usar JSONB filter

  // ALTERNATIVA MAIS ROBUSTA: filtro JSONB direto
  // O indice idx_audit_log_table_name (tenant_id, table_name, created_at DESC) cobre
  // E depois filtramos em memoria pelo job_id do JSONB
  // Isso captura inclusive cost_items criados e depois removidos do job

  // DECISAO FINAL: Abordagem hibrida
  // Passo 1: buscar audit_log WHERE table_name = 'cost_items' AND tenant_id = $1
  //          AND (new_data->>'job_id' = $jobId OR old_data->>'job_id' = $jobId)
  // Usar RPC ou query manual com filtro JSONB

  // Na pratica, como nao temos RPC, vamos usar a abordagem two-step:
  // A. Buscar todos cost_item IDs do job (via cost_items table)
  // B. Filtrar audit_log por record_id IN (...)

  const costItemIds = (costItemRows ?? []).map(r => r.id)
  if (costItemIds.length === 0) {
    // Retornar vazio
    return Response({ data: [], meta: { total: 0, page: 1, per_page: 30, total_pages: 0 } })
  }

  // 4. Buscar audit_log (count)
  let countQuery = client
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .eq('table_name', 'cost_items')
    .in('record_id', costItemIds)
  if (filterAction) countQuery = countQuery.eq('action', filterAction)

  // 5. Buscar audit_log (dados paginados)
  let dataQuery = client
    .from('audit_log')
    .select('id, record_id, action, user_id, old_data, new_data, changed_fields, created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('table_name', 'cost_items')
    .in('record_id', costItemIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)
  if (filterAction) dataQuery = dataQuery.eq('action', filterAction)

  // 6. Enriquecer com nomes de usuarios (batch, mesmo pattern do audit-log EF)
  // 7. Construir item_label e changes[] para cada registro
  // 8. Retornar resposta paginada
}

// Helper: buildItemLabel(row) => "1.03 - Diretor de Fotografia"
function buildItemLabel(auditRow): string {
  const data = auditRow.new_data ?? auditRow.old_data
  if (!data) return 'Item desconhecido'
  const num = data.item_number ?? '?'
  const sub = data.sub_item_number ?? 0
  const desc = data.service_description ?? 'Sem descricao'
  const subStr = sub > 0 ? `.${String(sub).padStart(2, '0')}` : ''
  return `${num}${subStr} - ${desc}`
}

// Helper: buildChanges(row) => Change[]
function buildChanges(auditRow): Change[] | null {
  if (auditRow.action !== 'UPDATE' || !auditRow.changed_fields) return null
  return auditRow.changed_fields
    .filter(field => !IGNORED_FIELDS.has(field) && FIELD_LABELS[field])
    .map(field => ({
      field,
      label: FIELD_LABELS[field],
      old_value: auditRow.old_data?.[field] ?? null,
      new_value: auditRow.new_data?.[field] ?? null,
      ...(ENUM_DISPLAYS[field] ? {
        old_display: ENUM_DISPLAYS[field][auditRow.old_data?.[field]] ?? null,
        new_display: ENUM_DISPLAYS[field][auditRow.new_data?.[field]] ?? null,
      } : {}),
    }))
}
```

### 2. Backend: Rota no index.ts (5min)

**Arquivo:** `supabase/functions/cost-items/index.ts`

Adicionar:
```typescript
import { handleHistory } from './handlers/history.ts';

// Na lista NAMED_ROUTES:
const NAMED_ROUTES = new Set([
  'batch', 'budget-summary', 'budget-mode', 'apply-template',
  'import-from-job', 'reference-jobs', 'export',
  'history',  // <-- ADICIONAR
]);

// Dentro do serve, antes das rotas com :id:
// GET /cost-items/history/:jobId
if (segment1 === 'history' && segment2 && method === 'GET') {
  return await handleHistory(req, auth, segment2);
}
```

### 3. Frontend: Tipos (15min)

**Arquivo:** `frontend/src/types/cost-item-history.ts`

```typescript
export interface CostItemHistoryChange {
  field: string
  label: string
  old_value: unknown
  new_value: unknown
  old_display?: string  // Para ENUMs
  new_display?: string
}

export interface CostItemHistoryEntry {
  id: number
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  record_id: string
  user_id: string | null
  user_name: string
  created_at: string
  changed_fields: string[] | null
  item_label: string
  changes: CostItemHistoryChange[] | null
}

export interface CostItemHistoryFilters {
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  page?: number
  per_page?: number
}
```

### 4. Frontend: Query keys (5min)

**Arquivo:** `frontend/src/lib/query-keys.ts`

Adicionar ao `costItemKeys`:
```typescript
export const costItemKeys = {
  // ... existente
  history: (jobId: string, filters?: Record<string, string>) =>
    [...costItemKeys.all, 'history', jobId, filters] as const,
}
```

### 5. Frontend: Hook (15min)

**Arquivo:** `frontend/src/hooks/useCostItemHistory.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { costItemKeys } from '@/lib/query-keys'
import type { CostItemHistoryEntry, CostItemHistoryFilters } from '@/types/cost-item-history'
import type { PaginationMeta } from '@/types/jobs'

export function useCostItemHistory(jobId: string, filters: CostItemHistoryFilters = {}) {
  const { page = 1, per_page = 30, action } = filters

  const params: Record<string, string> = {
    page: String(page),
    per_page: String(per_page),
  }
  if (action) params.action = action

  const filterKey = { page, per_page, action }

  const query = useQuery({
    queryKey: costItemKeys.history(jobId, filterKey as unknown as Record<string, string>),
    queryFn: () => apiGet<CostItemHistoryEntry[]>('cost-items', params, `history/${jobId}`),
    staleTime: 30_000,
    enabled: !!jobId,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as PaginationMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
```

### 6. Frontend: Componente de entrada com diff (30min)

**Arquivo:** `frontend/src/components/cost-items/CostItemHistoryEntry.tsx`

Componente renderiza uma unica entrada do historico com:
- Icone por tipo (Plus para INSERT, Pencil para UPDATE, Trash2 para DELETE)
- Cor do icone (verde INSERT, azul UPDATE, vermelho DELETE)
- Nome do usuario + data relativa
- Label do item afetado
- Diff expandivel com campos:
  - Valor antigo em vermelho (line-through)
  - Seta
  - Valor novo em verde
  - Para valores monetarios: formatCurrency()
  - Para datas: formatDate()
  - Para booleans: "Sim"/"Nao"
  - Para ENUMs: usar old_display/new_display

### 7. Frontend: Sheet do historico (30min)

**Arquivo:** `frontend/src/components/cost-items/CostItemHistorySheet.tsx`

```typescript
interface CostItemHistorySheetProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Usa Sheet de shadcn/ui (side="right")
// Largura: sm:max-w-lg (para caber o diff)
// Header com titulo "Historico de Alteracoes"
// Filtro por tipo de acao (Select com "Todas", "Criacoes", "Edicoes", "Exclusoes")
// Timeline vertical com CostItemHistoryEntry para cada registro
// Paginacao no rodape (mesmo pattern do TabHistorico)
// Empty state quando nao ha registros
// Loading skeleton (mesmo pattern)
```

### 8. Frontend: Integrar na pagina de custos (15min)

**Arquivo:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/page.tsx`

Adicionar:
- `import { CostItemHistorySheet } from '@/components/cost-items/CostItemHistorySheet'`
- State: `const [historyOpen, setHistoryOpen] = useState(false)`
- Botao na toolbar (ao lado de Exportar CSV):
  ```tsx
  <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
    <History className="size-4 mr-1.5" />
    Historico
  </Button>
  ```
- Sheet no final do JSX:
  ```tsx
  <CostItemHistorySheet
    jobId={jobId}
    open={historyOpen}
    onOpenChange={setHistoryOpen}
  />
  ```

---

## Checklist de implementacao

- [ ] 1. Criar `supabase/functions/cost-items/handlers/history.ts`
- [ ] 2. Modificar `supabase/functions/cost-items/index.ts` (rota + import + NAMED_ROUTES)
- [ ] 3. Deploy da EF cost-items (MCP ou CLI)
- [ ] 4. Criar `frontend/src/types/cost-item-history.ts`
- [ ] 5. Modificar `frontend/src/lib/query-keys.ts` (adicionar history key)
- [ ] 6. Criar `frontend/src/hooks/useCostItemHistory.ts`
- [ ] 7. Criar `frontend/src/components/cost-items/CostItemHistoryEntry.tsx`
- [ ] 8. Criar `frontend/src/components/cost-items/CostItemHistorySheet.tsx`
- [ ] 9. Modificar `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/page.tsx`
- [ ] 10. Testar: criar/editar/deletar cost_item e verificar historico
- [ ] 11. Commit + push

## Notas de teste

1. Criar um cost_item novo -> verificar que aparece como INSERT no historico
2. Editar unit_value e payment_condition -> verificar que mostra diff com labels amigaveis
3. Deletar um cost_item -> verificar que aparece como DELETE
4. Verificar que usuario "Maria Silva" aparece (nao UUID)
5. Verificar paginacao com > 30 registros
6. Verificar filtro por acao (so UPDATE, por exemplo)
7. Verificar que roles sem permissao financeira (ex: editor) nao conseguem ver historico
