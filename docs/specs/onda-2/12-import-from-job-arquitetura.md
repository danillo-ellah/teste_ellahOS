# Onda 2.5 Sprint 2 -- Arquitetura: Import from Job

**Autor:** Tech Lead (Claude Opus)
**Data:** 2026-03-12
**Status:** DEFINIDA
**Spec de referencia:** 10-gg-template-inline-edit-arquitetura.md (Sprint 2)
**Pre-requisito implementado:** Sprint 1 (Template GG + EmptyState) -- CONCLUIDO

---

## Indice

1. Decisoes Refinadas (vs spec original)
2. Contrato de API -- Backend
3. Componentes Frontend
4. Hooks
5. Modificacoes em Arquivos Existentes
6. Fluxo do Usuario
7. Ordem de Implementacao
8. Mapa de Artefatos
9. Riscos e Mitigacoes

---

## 1. Decisoes Refinadas (vs spec original)

A spec original (doc 10, secao 4.2) previa `mode: 'add' | 'replace'` no import-from-job.
O usuario confirmou decisoes que **simplificam** a implementacao:

| Aspecto | Spec Original (doc 10) | Decisao Final |
|---------|----------------------|---------------|
| Mode | `add` ou `replace` | **So `add` (job vazio)** -- mesma regra do template |
| Fornecedores | Copiar ou nao copiar | **NAO copiar** -- fornecedores sao por job |
| Pre-condicao | Job pode ter ou nao ter itens | **So job vazio** -- rejeitar 409 se ja tem itens |
| Rota | `POST /cost-items/import-from-job` (sem jobId no path) | `POST /cost-items/import-from-job/{jobId}` (target no path, source no body) |
| Body | `{ source_job_id, target_job_id, mode }` | `{ source_job_id }` (target vem do path, mode eliminado) |

**Justificativa:** Manter consistencia com `apply-template/{jobId}` que usa o mesmo padrao (target no path, operacao so em job vazio, 409 se ja tem itens). Isso simplifica o frontend (mesma logica de exibicao do EmptyState para ambas as opcoes).

---

## 2. Contrato de API -- Backend

### 2.1 NOVO: POST /cost-items/import-from-job/{jobId}

**Arquivo:** `supabase/functions/cost-items/handlers/import-from-job.ts`

**Funcao:** Copia a ESTRUTURA de itens de custo de um job de origem para o job de destino (jobId no path). NAO copia valores, fornecedores ou status.

**Request:**
```
POST /cost-items/import-from-job/{targetJobId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "source_job_id": "uuid-do-job-de-origem"
}
```

**Zod Schema:**
```typescript
const ImportFromJobSchema = z.object({
  source_job_id: z.string().uuid(),
});
```

**Campos COPIADOS do source:**
```
item_number
sub_item_number
service_description
sort_order
```

**Campos FIXOS no destino (NAO copiados):**
```
tenant_id        -> auth.tenantId
job_id           -> targetJobId (do path)
item_status      -> 'orcado'
nf_request_status -> 'nao_aplicavel'
payment_status   -> 'pendente'
quantity         -> 1
created_by       -> auth.userId
```

**Campos IGNORADOS (nao copiados, usam default do banco):**
```
id, created_at, updated_at, deleted_at
unit_value, total_value, overtime_hours, overtime_rate, overtime_value, total_with_overtime
actual_paid_value, payment_condition, payment_due_date, payment_method
vendor_id, vendor_name_snapshot, vendor_email_snapshot, vendor_pix_snapshot, vendor_bank_snapshot
nf_requested_at, nf_requested_by, nf_document_id, nf_drive_url, nf_filename, nf_extracted_value, nf_validation_ok
payment_date, payment_proof_url, payment_proof_filename
suggested_status, status_note, notes, period_month, import_source
payment_approval_status
is_category_header (GENERATED column -- calculada pelo banco)
```

**ALLOWED_ROLES:** `['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao']`
(mesmos roles do apply-template)

**Validacoes:**
1. Role check (403 FORBIDDEN)
2. Parse body com Zod (400 VALIDATION_ERROR)
3. Target job existe, pertence ao tenant, nao deletado (404 NOT_FOUND)
4. Target job esta vazio -- count de cost_items = 0 (409 CONFLICT)
5. Source job existe, pertence ao tenant, nao deletado (404 NOT_FOUND: "Job de origem nao encontrado")
6. Source job tem cost_items (400 VALIDATION_ERROR: "Job de origem nao possui itens de custo")
7. source_job_id != targetJobId (400 VALIDATION_ERROR: "Job de origem e destino sao o mesmo")

**Response 201:**
```json
{
  "data": {
    "created": 140,
    "source_job": {
      "id": "uuid",
      "title": "Campanha XYZ",
      "code": "JOB-2025-001"
    },
    "items": [/* array de cost_items criados */]
  }
}
```

**Erros:**
| Status | Codigo | Mensagem |
|--------|--------|----------|
| 400 | VALIDATION_ERROR | Body JSON invalido / source_job_id invalido |
| 400 | VALIDATION_ERROR | Job de origem nao possui itens de custo |
| 400 | VALIDATION_ERROR | Job de origem e destino sao o mesmo |
| 403 | FORBIDDEN | Permissao insuficiente para importar estrutura |
| 404 | NOT_FOUND | Job nao encontrado (target) |
| 404 | NOT_FOUND | Job de origem nao encontrado |
| 409 | CONFLICT | Job ja possui itens de custo. Import so pode ser feito em job vazio. |
| 500 | INTERNAL_ERROR | Erro ao importar itens |

**Idempotencia:** Garantida pela validacao de job vazio. Se a primeira chamada criou itens, a segunda retorna 409. Se a primeira falhou parcialmente (erro no insert), o frontend pode retried -- o batch insert do Supabase e atomico (tudo ou nada).

### 2.2 MODIFICADO: GET /cost-items/reference-jobs/{jobId}

**Arquivo:** `supabase/functions/cost-items/handlers/reference-jobs.ts`

**Mudancas necessarias:**

1. **Expandir ALLOWED_ROLES** para incluir `diretor_producao` e `coordenador_producao` (atualmente so `produtor_executivo`, `admin`, `ceo`)

2. **Adicionar filtro de busca `?q=`** via query param para o frontend poder filtrar jobs por nome/codigo

3. **Filtrar jobs que tem cost_items > 0** -- atualmente retorna todos os jobs similares, mesmo os que nao tem itens. Para o dialog de import, so faz sentido mostrar jobs que tem custo.

4. **Aumentar limite de 10 para 20** -- 10 pode ser muito restritivo para produtoras com muitos jobs

**Query param novo:**
```
GET /cost-items/reference-jobs/{jobId}?q=campanha
```

**Logica de filtro `q`:**
```typescript
if (q && q.length >= 2) {
  // Buscar por title ILIKE ou code ILIKE
  query = query.or(`title.ilike.%${q}%,code.ilike.%${q}%`);
}
```

**Mudanca no response:** Adicionar campo `has_cost_items: boolean` (ou filtrar do resultado jobs com `cost_items_count === 0`). Decisao: **filtrar** -- o dialog de import so mostra jobs que tem itens para copiar.

**ALLOWED_ROLES atualizado:** `['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao']`

### 2.3 MODIFICADO: index.ts (router)

Adicionar rota e import:

```typescript
// Import no topo
import { handleImportFromJob } from './handlers/import-from-job.ts';

// Na lista NAMED_ROUTES
const NAMED_ROUTES = new Set([
  'batch',
  'budget-summary',
  'budget-mode',
  'apply-template',
  'import-from-job',   // <-- NOVO
  'reference-jobs',
  'export',
]);

// Nova rota (apos apply-template, antes de reference-jobs)
// POST /cost-items/import-from-job/:jobId
if (segment1 === 'import-from-job' && segment2 && method === 'POST') {
  return await handleImportFromJob(req, auth, segment2);
}
```

---

## 3. Componentes Frontend

### 3.1 NOVO: ImportFromJobDialog.tsx

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/ImportFromJobDialog.tsx`

**Props:**
```typescript
interface ImportFromJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  onSuccess: () => void
}
```

**Estrutura visual:**
```
+------------------------------------------+
|  Importar Estrutura de Outro Job         |
|  Copie categorias e descricoes de um     |
|  job existente. Valores nao serao        |
|  copiados.                               |
+------------------------------------------+
|  [Buscar job... _______________]         |
|                                          |
|  Jobs disponiveis:                       |
|  +--------------------------------------+|
|  | JOB-2025-001  Campanha Verao Nike    ||
|  | 140 itens  |  R$ 850.000 estimado    ||
|  +--------------------------------------+|
|  | JOB-2025-003  Filme Institucional    ||
|  | 85 itens   |  R$ 320.000 estimado    ||
|  +--------------------------------------+|
|                                          |
|  Selecionado: Campanha Verao Nike       |
|  140 itens (16 categorias)              |
|                                          |
|  [Cancelar]        [Importar Estrutura]  |
+------------------------------------------+
```

**Comportamento:**
1. Ao abrir, carrega `useReferenceJobs(jobId)` -- lista jobs do mesmo project_type com cost_items
2. Campo de busca com debounce 300ms filtra a lista localmente (client-side, pois sao no max 20 jobs)
3. Clicar em um job seleciona-o e mostra preview (count de itens, valor estimado)
4. Botao "Importar Estrutura" chama `useImportFromJob()`
5. Sucesso: toast + fecha dialog + onSuccess (invalida queries)
6. Erro 409: toast especifico "Job ja possui itens"

**Componentes shadcn usados:** Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Input, ScrollArea, Loader2

**Tamanho estimado:** ~150 linhas (simplificado vs spec original de 250, pois nao tem mais modes add/replace nem double-confirm)

### 3.2 MODIFICADO: EmptyStateWithActions.tsx

**Mudancas:**

1. Adicionar prop `onImportFromJob`
2. Adicionar terceiro botao "Importar de Outro Job"

```typescript
interface EmptyStateWithActionsProps {
  onApplyTemplate: () => void
  onImportFromJob: () => void   // <-- NOVO
  onAddNew: () => void
}
```

**Layout atualizado:**
```
  Nenhum item de custo
  Comece aplicando o template padrao, importe de outro job,
  ou adicione itens manualmente.

  [Aplicar Template GG]  [Importar de Outro Job]  [Adicionar Item]
```

O botao "Importar de Outro Job" usa variante `outline` e icone `Copy` do lucide-react, posicionado entre o template (primary) e adicionar (outline).

### 3.3 MODIFICADO: page.tsx (custos)

**Mudancas:**
1. Importar `ImportFromJobDialog`
2. Adicionar estado `importDialogOpen`
3. Passar `onImportFromJob` para `EmptyStateWithActions`
4. Renderizar `ImportFromJobDialog` ao lado do `ApplyTemplateDialog`

```typescript
// Novos estados
const [importDialogOpen, setImportDialogOpen] = useState(false)

// No EmptyStateWithActions
<EmptyStateWithActions
  onApplyTemplate={() => setTemplateDialogOpen(true)}
  onImportFromJob={() => setImportDialogOpen(true)}   // <-- NOVO
  onAddNew={handleAddNew}
/>

// Novo dialog
<ImportFromJobDialog
  open={importDialogOpen}
  onOpenChange={setImportDialogOpen}
  jobId={jobId}
  onSuccess={() => {}}
/>
```

---

## 4. Hooks

### 4.1 NOVO: useImportFromJob() -- em useCostItems.ts

```typescript
export function useImportFromJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, source_job_id }: { jobId: string; source_job_id: string }) =>
      apiMutate<CostItem[]>(
        'cost-items',
        'POST',
        { source_job_id } as Record<string, unknown>,
        `import-from-job/${jobId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}
```

**Nota:** O hook `useReferenceJobs(jobId)` ja existe em useCostItems.ts (linha 70-77) e ja retorna jobs com `cost_items_count`. Sera reutilizado sem mudanca no frontend -- a mudanca e no backend (expandir roles + filtro q).

### 4.2 Nao necessario: useSearchJobsForImport

A spec original previa um hook separado para busca. Com a decisao de reusar `reference-jobs` e filtrar client-side (max 20 resultados), nao e necessario. O `useReferenceJobs(jobId)` ja existente e suficiente.

---

## 5. Modificacoes em Arquivos Existentes (resumo)

| Arquivo | Tipo | O que muda |
|---------|------|-----------|
| `supabase/functions/cost-items/index.ts` | MODIFICAR | +import, +NAMED_ROUTE, +rota POST import-from-job |
| `supabase/functions/cost-items/handlers/reference-jobs.ts` | MODIFICAR | +roles, +filtro q, +filtrar jobs sem itens, +limit 20 |
| `frontend/src/hooks/useCostItems.ts` | MODIFICAR | +useImportFromJob() |
| `frontend/src/app/.../custos/_components/EmptyStateWithActions.tsx` | MODIFICAR | +prop onImportFromJob, +botao |
| `frontend/src/app/.../custos/page.tsx` | MODIFICAR | +estado importDialog, +ImportFromJobDialog |

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `supabase/functions/cost-items/handlers/import-from-job.ts` | NOVO | Handler completo ~100 linhas |
| `frontend/src/app/.../custos/_components/ImportFromJobDialog.tsx` | NOVO | Dialog completo ~150 linhas |

---

## 6. Fluxo do Usuario

```
1. Usuario abre a aba "Custos" de um job VAZIO
2. Ve o EmptyState com 3 botoes:
   [Aplicar Template GG]  [Importar de Outro Job]  [Adicionar Item]
3. Clica em "Importar de Outro Job"
4. Abre dialog com lista de jobs do mesmo tipo que tem custos
5. (Opcional) Digita no campo de busca para filtrar
6. Clica em um job da lista -- ve preview (X itens, Y categorias)
7. Clica "Importar Estrutura"
8. Backend valida (job vazio, source tem itens) e cria os itens
9. Toast: "Estrutura importada: 140 itens de 'Campanha XYZ'"
10. Dialog fecha, tabela recarrega com os itens criados (sem valores)
11. Usuario preenche valores, fornecedores, etc. via edicao inline
```

---

## 7. Ordem de Implementacao

### Passo 1: Backend -- import-from-job.ts (novo handler)

Criar `supabase/functions/cost-items/handlers/import-from-job.ts` seguindo exatamente o padrao de `apply-template.ts`:
- Mesma estrutura: ALLOWED_ROLES, auth check, job validation, empty check, insert, response
- Diferenca: ao inves de `flattenTemplate()`, busca cost_items do source job

### Passo 2: Backend -- index.ts (adicionar rota)

Adicionar import e rota no router. Adicionar 'import-from-job' ao Set NAMED_ROUTES.

### Passo 3: Backend -- reference-jobs.ts (expandir)

1. Expandir ALLOWED_ROLES
2. Ler query param `q` da URL
3. Aplicar filtro ILIKE se `q` presente e >= 2 chars
4. Filtrar resultado para retornar apenas jobs com cost_items_count > 0
5. Aumentar limit para 20

### Passo 4: Deploy EF cost-items

Deploy via CLI ou MCP. Testar com curl:
```bash
# Listar jobs de referencia
curl -H "Authorization: Bearer $TOKEN" \
  "$SUPABASE_URL/functions/v1/cost-items/reference-jobs/$JOB_ID"

# Importar de job
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_job_id":"SOURCE_UUID"}' \
  "$SUPABASE_URL/functions/v1/cost-items/import-from-job/$TARGET_JOB_ID"
```

### Passo 5: Frontend -- useImportFromJob hook

Adicionar hook em `useCostItems.ts`.

### Passo 6: Frontend -- ImportFromJobDialog.tsx

Criar componente novo.

### Passo 7: Frontend -- EmptyStateWithActions.tsx

Adicionar prop e botao.

### Passo 8: Frontend -- page.tsx

Adicionar estado e integracao.

### Passo 9: Teste manual

1. Criar job vazio, abrir custos, clicar "Importar de Outro Job"
2. Verificar que dialog lista jobs com itens
3. Selecionar job, importar, verificar que itens aparecem SEM valores
4. Tentar importar de novo no mesmo job -- deve dar 409
5. Verificar busca por nome no dialog

---

## 8. Mapa de Artefatos

### Backend

| Arquivo | Acao | LOC estimado |
|---------|------|-------------|
| `supabase/functions/cost-items/handlers/import-from-job.ts` | NOVO | ~100 |
| `supabase/functions/cost-items/index.ts` | MODIFICAR (+3 linhas) | +3 |
| `supabase/functions/cost-items/handlers/reference-jobs.ts` | MODIFICAR (+15 linhas) | +15 |

### Frontend

| Arquivo | Acao | LOC estimado |
|---------|------|-------------|
| `frontend/src/app/.../custos/_components/ImportFromJobDialog.tsx` | NOVO | ~150 |
| `frontend/src/hooks/useCostItems.ts` | MODIFICAR (+15 linhas) | +15 |
| `frontend/src/app/.../custos/_components/EmptyStateWithActions.tsx` | MODIFICAR (+10 linhas) | +10 |
| `frontend/src/app/.../custos/page.tsx` | MODIFICAR (+10 linhas) | +10 |

### Nenhuma migration necessaria

A tabela `cost_items` ja tem todos os campos. O import apenas cria rows com campos de estrutura preenchidos.

---

## 9. Riscos e Mitigacoes

### R-01: Source job com muitos itens (performance)

**Risco:** Um job com 500+ itens poderia causar timeout no insert batch.

**Mitigacao:** O Supabase suporta batch inserts de ate 1000+ rows sem problema. O template GG tem 140 linhas, e jobs reais dificilmente excedem 300. Nenhuma acao necessaria.

### R-02: Race condition -- dois usuarios importam no mesmo job

**Risco:** Dois usuarios clicam "Importar" no mesmo job vazio simultaneamente.

**Mitigacao:** A validacao `count > 0` acontece antes do insert. Se o primeiro insert completa antes da segunda validacao, o segundo recebe 409. Se ambas validacoes passam simultaneamente, teremos itens duplicados. Para mitigar: verificar no frontend se a lista recarregou apos o import (invalidateQueries). Risco pratico: muito baixo (operacao feita uma vez no inicio do job, por uma pessoa).

### R-03: reference-jobs retorna job sem cost_items apos deletar todos

**Risco:** Um job aparece na lista de referencia mas quando o usuario importa, nao tem itens.

**Mitigacao:** Validacao 6 no handler (source job tem cost_items). Retorna erro 400 claro. O frontend exibe toast. Alem disso, o backend agora filtra jobs com `cost_items_count === 0` do resultado de reference-jobs.

### R-04: Consistencia com is_category_header

**Risco:** `is_category_header` e uma GENERATED column (calculada como `sub_item_number = 0`). Se copiarmos `sub_item_number` corretamente, o banco calcula automaticamente.

**Mitigacao:** Confirmado no schema -- `is_category_header` e GENERATED ALWAYS, nao pode ser inserido. Nao inclui-lo no insertData. O banco calcula automaticamente a partir de `sub_item_number`.

---

## Apendice: Pseudocodigo do Handler import-from-job.ts

```typescript
import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao'];

const ImportFromJobSchema = z.object({
  source_job_id: z.string().uuid(),
});

export async function handleImportFromJob(
  req: Request,
  auth: AuthContext,
  targetJobId: string,
): Promise<Response> {
  // 1. Role check
  // 2. Parse body com Zod
  // 3. Validar source != target
  // 4. Validar target job existe + pertence ao tenant
  // 5. Validar target job vazio (count = 0) -> 409 se nao
  // 6. Validar source job existe + pertence ao tenant
  // 7. Buscar cost_items do source (select item_number, sub_item_number, service_description, sort_order)
  // 8. Validar source tem itens (length > 0) -> 400 se nao
  // 9. Montar insertData: map source items -> { tenant_id, job_id: targetJobId, ...campos_estrutura, defaults }
  // 10. Insert batch
  // 11. Retornar created({ created: N, source_job: { id, title, code }, items })
}
```
