# ADR-035: Historico de Alteracoes de Cost Items

**Status:** Aceito
**Data:** 2026-03-12
**Autor:** Tech Lead

## Contexto

O modulo de custos (cost_items) precisa de um historico visual de alteracoes similar ao que existia no Google Sheets, permitindo que o time financeiro e produtores executivos vejam quem alterou o que, quando, e os valores antes/depois.

Ja temos:
- Tabela `audit_log` com trigger `fn_audit_log()` que captura automaticamente INSERT/UPDATE/DELETE em cost_items
- Campos: `old_data` (JSONB), `new_data` (JSONB), `changed_fields` (TEXT[]), `user_id`, `created_at`
- Indices existentes: `idx_audit_log_table_name (tenant_id, table_name, created_at DESC)` e `idx_audit_log_record_id (tenant_id, record_id)`
- EF `audit-log` com listagem admin-only
- Frontend: `TabHistorico.tsx` com timeline visual (pattern de referencia)
- Hook: `useJobHistory.ts` (pattern de referencia)

### Problema de filtragem por job_id

O audit_log nao tem coluna `job_id` dedicada. O job_id esta dentro do JSONB `new_data->>'job_id'` ou `old_data->>'job_id'`. Para filtrar historico de custos de um job especifico, temos 3 opcoes:

1. **Filtro JSONB direto** - `WHERE new_data->>'job_id' = $1` (funcional, mas sem indice dedicado)
2. **Migration com coluna materializada** - Adicionar coluna `job_id` ou indice GIN ao audit_log
3. **Join via cost_items** - Buscar IDs de cost_items do job, depois filtrar audit_log por record_id IN (...)

## Decisao

### 1. Backend: Handler em cost-items (NAO audit-log)

Adicionar rota `GET /cost-items/history/:jobId` como handler em `cost-items/handlers/history.ts`.

**Justificativa:**
- Mantém coesao: historico de custos fica no modulo de custos
- Permite controle de acesso via `canViewFinancials()` (roles: admin, ceo, produtor_executivo, financeiro) — diferente do audit-log que e admin-only
- Reutiliza o pattern existente dos handlers de cost-items (budget-summary, reference-jobs, export)
- Nao precisa modificar a EF audit-log que serve outro proposito (visao administrativa global)

### 2. Estrategia de filtragem: Two-step query

```
Passo 1: SELECT id FROM cost_items WHERE job_id = $jobId AND tenant_id = $tenantId
Passo 2: SELECT * FROM audit_log WHERE record_id IN (...ids) AND table_name = 'cost_items' ORDER BY created_at DESC
```

**Justificativa:**
- Usa os indices existentes (idx_audit_log_record_id, idx_audit_log_table_name)
- Nao requer migration adicional
- Um job tipicamente tem 30-200 cost_items, entao o IN (...) e gerenciavel
- Filtro JSONB (opcao 1) seria lento sem indice GIN e adicionar indice GIN ao audit_log inteiro e caro
- Se no futuro precisar de performance maior, podemos adicionar coluna materializada (opcao 2) como otimizacao

### 3. UX: Sheet lateral (Opcao C — Sheet que sobe de baixo)

**Decisao: Sheet lateral direita (side="right"), NAO de baixo.**

**Justificativa:**
- O CostItemDrawer ja usa Sheet lateral direita para criar/editar — o historico deve seguir o mesmo pattern
- A pagina de custos ja e carregada de conteudo (tabela, filtros, totais) — um drawer lateral nao compete por espaco vertical
- Nao precisa de tab/aba extra, pois historico e consulta ocasional, nao dado primario
- Um botao "Historico" na toolbar (ao lado de "Exportar CSV") abre o Sheet
- Sheet permite scroll independente e nao oculta a tabela de custos quando aberto em telas grandes
- Pattern ja validado: VendorDetailSheet, CostItemDrawer

### 4. Migration: NAO necessaria

A tabela audit_log ja captura tudo automaticamente. Os indices existentes sao suficientes.

Se houver degradacao de performance no futuro (> 100k registros no audit_log), consideraremos:
- Indice parcial: `CREATE INDEX ON audit_log ((new_data->>'job_id')) WHERE table_name = 'cost_items'`
- Ou coluna materializada via trigger

### 5. Roles com acesso ao historico

Mesmas roles que podem ver dados financeiros (via `canViewFinancials`):
- `admin`
- `ceo`
- `produtor_executivo`
- `financeiro`

Diferente do audit-log geral (admin/ceo only), o historico de custos e operacional e precisa ser visivel para quem gerencia custos.

## Contrato da API

### GET /cost-items/history/:jobId

**Query params:**
| Param | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| page | number | 1 | Pagina atual |
| per_page | number | 30 | Itens por pagina |
| action | string | - | Filtro: INSERT, UPDATE, DELETE |

**Response (200):**
```json
{
  "data": [
    {
      "id": 12345,
      "action": "UPDATE",
      "record_id": "uuid-do-cost-item",
      "user_id": "uuid-do-usuario",
      "user_name": "Maria Silva",
      "created_at": "2026-03-12T14:30:00Z",
      "changed_fields": ["unit_value", "payment_condition"],
      "item_label": "1.03 - Diretor de Fotografia",
      "changes": [
        {
          "field": "unit_value",
          "label": "Valor Unitario",
          "old_value": 5000,
          "new_value": 6500
        },
        {
          "field": "payment_condition",
          "label": "Condicao de Pagamento",
          "old_value": "a_vista",
          "new_value": "cnf_30",
          "old_display": "A Vista",
          "new_display": "C/NF 30 dias"
        }
      ]
    },
    {
      "id": 12344,
      "action": "INSERT",
      "record_id": "uuid-do-cost-item",
      "user_id": "uuid-do-usuario",
      "user_name": "Joao Santos",
      "created_at": "2026-03-12T10:00:00Z",
      "changed_fields": null,
      "item_label": "1.03 - Diretor de Fotografia",
      "changes": null
    }
  ],
  "meta": {
    "total": 87,
    "page": 1,
    "per_page": 30,
    "total_pages": 3
  }
}
```

**Campos enriquecidos pelo backend:**
- `user_name`: Join com profiles.full_name
- `item_label`: Construido como `{item_number}.{sub_item_number} - {service_description}` a partir de new_data (INSERT/UPDATE) ou old_data (DELETE)
- `changes[]`: Array estruturado com label amigavel, valor antigo e novo, e display formatado para ENUMs

## Mapa de labels amigaveis (FIELD_LABELS)

```typescript
const FIELD_LABELS: Record<string, string> = {
  service_description: 'Descricao do Servico',
  unit_value: 'Valor Unitario',
  quantity: 'Quantidade',
  total_value: 'Valor Total',
  overtime_hours: 'Horas Extra',
  overtime_rate: 'Taxa HE',
  overtime_value: 'Valor HE',
  total_with_overtime: 'Total com HE',
  actual_paid_value: 'Valor Pago',
  payment_condition: 'Condicao de Pagamento',
  payment_due_date: 'Data de Vencimento',
  payment_method: 'Metodo de Pagamento',
  vendor_id: 'Fornecedor',
  vendor_name_snapshot: 'Fornecedor',
  vendor_email_snapshot: 'Email do Fornecedor',
  vendor_pix_snapshot: 'PIX do Fornecedor',
  vendor_bank_snapshot: 'Banco do Fornecedor',
  item_status: 'Status do Item',
  nf_request_status: 'Status da NF',
  payment_status: 'Status do Pagamento',
  payment_date: 'Data do Pagamento',
  notes: 'Observacoes',
  item_number: 'Numero do Item',
  sub_item_number: 'Sub-item',
  sort_order: 'Ordem',
  is_category_header: 'Cabecalho de Categoria',
  period_month: 'Mes de Referencia',
  payment_approval_status: 'Status de Aprovacao',
  nf_document_id: 'Documento NF',
  nf_drive_url: 'URL da NF no Drive',
  nf_filename: 'Arquivo da NF',
  nf_extracted_value: 'Valor Extraido da NF',
  nf_validation_ok: 'Validacao NF OK',
  payment_proof_url: 'Comprovante de Pagamento',
  payment_proof_filename: 'Arquivo do Comprovante',
}
```

Campos ignorados no diff (nao mostrar ao usuario):
- `id`, `tenant_id`, `job_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`
- `import_source`, `suggested_status`, `status_note`
- `nf_requested_at`, `nf_requested_by` (metadata interna)

## Arquivos a criar/modificar

### Criar (5 arquivos)
1. `supabase/functions/cost-items/handlers/history.ts` - Handler backend
2. `frontend/src/hooks/useCostItemHistory.ts` - Hook React Query
3. `frontend/src/components/cost-items/CostItemHistorySheet.tsx` - Sheet com timeline visual
4. `frontend/src/components/cost-items/CostItemHistoryEntry.tsx` - Componente de entrada individual com diff
5. `frontend/src/types/cost-item-history.ts` - Tipos TypeScript

### Modificar (3 arquivos)
1. `supabase/functions/cost-items/index.ts` - Adicionar rota GET /cost-items/history/:jobId
2. `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/page.tsx` - Adicionar botao "Historico" e Sheet
3. `frontend/src/lib/query-keys.ts` - Adicionar key `costItemKeys.history(jobId, filters)`

## Consequencias

### Positivas
- Zero migrations — usa infraestrutura existente
- Controle de acesso granular (canViewFinancials vs admin-only)
- UX consistente com patterns existentes (Sheet lateral)
- Diff estruturado com labels amigaveis (nao JSON bruto)
- Paginacao evita carregamento excessivo

### Negativas
- Two-step query pode ser lenta se um job tiver 1000+ cost_items (improvavel no dominio)
- Labels hardcoded — precisam ser atualizados se novos campos forem adicionados a cost_items
- Historico de itens deletados (soft delete) ainda aparece no audit_log, mas o item nao existe mais — tratamos mostrando "Item removido"

### Riscos
- Se audit_log crescer muito (> 1M rows), a query IN (...) pode degradar. Mitigacao: indice parcial no JSONB (ver "Migration NAO necessaria" acima)

## Alternativas Consideradas

### A1: Reutilizar EF audit-log com filtro extra
**Descartada** porque:
- audit-log e admin-only, historico de custos precisa ser acessivel a mais roles
- Teria que adicionar logica de enriquecimento (item_label, changes formatados) em uma EF generica
- Violaria principio de coesao do modulo

### A2: Coluna job_id materializada no audit_log
**Adiada** porque:
- Requer migration
- Volume atual nao justifica a complexidade
- Pode ser adicionada no futuro como otimizacao sem quebrar a API

### A3: Aba/tab na pagina de custos
**Descartada** porque:
- Pagina de custos ja e densa
- Historico e consulta eventual, nao dado primario
- Sheet lateral e mais adequado para informacao contextual
