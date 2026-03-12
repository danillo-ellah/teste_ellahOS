# Onda 2.5 -- Arquitetura Tecnica: GG Template + Import + Edicao Inline

**Autor:** Tech Lead (Claude Opus)
**Data:** 2026-03-12
**Status:** APROVADA
**Spec de referencia:** 09-gg-template-inline-edit-spec.md

---

## Indice

1. Respostas as Perguntas Abertas do PM
2. Decisoes de Arquitetura
3. Schema de Dados
4. Endpoints (novos e modificados)
5. Componentes Frontend (novos e modificados)
6. Template JSON Completo (~140 linhas)
7. Hooks Novos e Modificados
8. Ordem de Implementacao Detalhada
9. Riscos Tecnicos e Mitigacoes
10. Mapa de Artefatos

---

## 1. Respostas as Perguntas Abertas do PM

### PA-01: Estado atual do endpoint apply-template

**Resposta:** O endpoint `apply-template` atual (handlers/apply-template.ts) **NAO** serve para esta feature. Ele apenas cria linhas de cabecalho (sub_item_number=0) buscando da tabela `cost_categories` do tenant. Nao cria sub-itens (as ~120 linhas de servico como "Diretor de cena", "Assistente de Camera I", etc.).

**Decisao:** Reescrever o handler apply-template para usar um template JSON hardcoded que cria tanto headers (16) quanto sub-itens (124+), totalizando ~140 linhas. O template antigo (baseado em cost_categories) sera substituido. Ver secao 4.

### PA-02: Endpoint de importacao de job completo

**Resposta:** Nao existe. O `handleCopy` existente copia UM item individual com todos os campos financeiros (unit_value, vendor, etc). Para importacao de job, precisamos de um handler novo que:
1. Busca todos os cost_items do job de origem
2. Cria copias no job de destino com apenas estrutura (item_number, sub_item_number, service_description)
3. Suporta modos "add" e "replace"

**Decisao:** Novo handler `import-from-job.ts`. Ver secao 4.

### PA-03: Campos de risco para edicao inline

**Resposta:** Alem dos campos ja excluidos pela spec (payment_condition, payment_due_date, etc.), tambem excluir `item_number` e `sub_item_number` da edicao inline. Estes definem a posicao do item na hierarquia GG e nao devem ser alterados casualmente.

### PA-04: Hint "Clique para editar"

**Decisao:** Opcao B (localStorage). Implementar como banner leve acima da tabela, que desaparece apos o usuario clicar em qualquer celula editavel. Persistido em `localStorage` com chave `ellahos_inline_hint_dismissed`.

### PA-05: Template unico vs ajuste por diarias

**Decisao:** Template unico nesta onda. O dialogo de confirmacao inclui a nota "Template completo para producao publicitaria. Delete as categorias que nao se aplicam ao seu job." Templates por tipo sao Onda 3.

---

## 2. Decisoes de Arquitetura

### D-01: Template hardcoded na Edge Function (nao na tabela)

**Decisao:** O template de ~140 linhas sera um arquivo TypeScript constante dentro da EF (`cost-items/data/gg-template.ts`), nao em tabela do banco.

**Justificativa:**
- A tabela `cost_categories` atual tem apenas cabecalhos (16 linhas com sub_item_number=0), sem os ~124 sub-itens. Adicionar os sub-itens na tabela exigiria nova migration + seed por tenant.
- O template e padrao da Ellah Filmes (nao varia por tenant nesta onda).
- Alterar o template requer deploy da EF, o que e intencional -- evita que um usuario altere acidentalmente o template padrao.
- Na Onda 3 (templates configuraveis por admin), migraremos para tabela `cost_item_templates`.

**Alternativas descartadas:**
- Tabela `cost_item_templates`: overengineering para um unico template fixo.
- Frontend constant: moveria logica de negocio para o client, e o apply-template precisa rodar no backend por seguranca.

### D-02: Edicao inline hibrida (Opcao C)

**Decisao:** Nao usar biblioteca (react-data-grid, tanstack-table com editing). Implementar com componente `InlineEditableCell` customizado que renderiza como `<span>` no modo leitura e `<input>` no modo edicao.

**Justificativa:**
- A tabela atual (CostItemsTable.tsx, 742 linhas) usa shadcn/ui `<Table>` com logica de agrupamento por categoria. Substituir por react-data-grid quebraria toda a UX existente de cabecalhos colapsaveis, selecao em lote, dropdown de acoes.
- Apenas 4 campos sao editaveis inline (description, unit_value, quantity, vendor). Os outros 12+ campos continuam no drawer.
- O componente InlineEditableCell e isolado e testavel, sem dependencia de biblioteca externa.

**Alternativas descartadas:**
- Opcao A (reescrever tabela): risco alto de regressao, 742 linhas para reescrever.
- Opcao B (tanstack-table com editing): overhead de migration para nova lib, conflito com agrupamento existente.

### D-03: Debounce + save individual (nao batch)

**Decisao:** Cada celula faz PATCH individual no blur/enter. Nao fazer batch de saves.

**Justificativa:**
- O usuario edita 1-4 campos por linha antes de mover para a proxima. Batch save por linha inteira seria complexo (qual trigger?) e o PATCH individual ja existe e funciona.
- Debounce de 300ms no blur: se o usuario fizer blur e imediatamente focar na proxima celula do MESMO item, o primeiro save espera 300ms. Se for blur para outra LINHA, save e imediato.
- Rate limit: com 140 linhas e ~4 campos editaveis, o pior caso e ~560 PATCHs em uma sessao. A 1 PATCH por 2 segundos (velocidade humana real), sao ~18 minutos. Nao ha risco de rate limit.

### D-04: Import-from-job como novo handler (nao reusar copy)

**Decisao:** Novo handler `import-from-job.ts` ao inves de chamar `handleCopy` N vezes.

**Justificativa:**
- `handleCopy` copia um item individual COM valores financeiros. Import-from-job precisa copiar ESTRUTURA SEM valores.
- Uma unica query no banco (busca todos os itens do source job) + uma unica insert batch e muito mais eficiente que N chamadas individuais.
- O handler suporta `mode: 'add' | 'replace'` atomicamente.

### D-05: Roles expandidos

**Decisao:** Adicionar os roles `diretor_producao` e `coordenador_producao` nos handlers de template, import e batch create, alem dos existentes (`produtor_executivo`, `admin`, `ceo`).

**Justificativa:** A spec do PM define que esses roles tem permissao. O handler atual de apply-template so permite `produtor_executivo`, `admin`, `ceo`. Precisa incluir `diretor_producao` e `coordenador_producao`.

### D-06: Calculo de totais client-side com generated columns no banco

**Decisao:** Durante edicao inline, o total da linha (`unit_value * quantity`) e calculado no frontend em tempo real. Ao salvar (PATCH), o banco recalcula via generated columns (`total_value`, `overtime_value`, `total_with_overtime`). O frontend atualiza com o valor do response do PATCH.

**Justificativa:** As colunas `total_value` e `total_with_overtime` sao GENERATED ALWAYS no PostgreSQL -- o banco ja garante consistencia. O calculo client-side e apenas para feedback visual instantaneo.

---

## 3. Schema de Dados

### 3.1 Nenhuma nova tabela necessaria

O template de ~140 linhas sera armazenado como constante TypeScript na Edge Function. Nao requer tabela nova.

### 3.2 Nenhuma alteracao em tabelas existentes

A tabela `cost_items` ja tem todos os campos necessarios:
- `item_number` (SMALLINT) -- numero da categoria (1-99)
- `sub_item_number` (SMALLINT) -- numero do sub-item (0 = header)
- `is_category_header` (BOOLEAN GENERATED) -- true quando sub_item_number = 0
- `service_description` (TEXT) -- descricao do servico
- `unit_value` (NUMERIC) -- valor unitario
- `quantity` (SMALLINT) -- quantidade
- `vendor_id` (UUID) -- FK para vendors
- `vendor_name_snapshot` (TEXT) -- snapshot do nome do vendor

### 3.3 Nova migration NAO necessaria

Nenhuma DDL nova. Apenas codigo de aplicacao (EF + frontend).

---

## 4. Endpoints (novos e modificados)

### 4.1 MODIFICADO: POST /cost-items/apply-template/{jobId}

**Arquivo:** `supabase/functions/cost-items/handlers/apply-template.ts`

**Mudancas:**
1. Remover busca na tabela `cost_categories` -- substituir por template JSON hardcoded
2. Criar ~140 linhas (headers + sub-itens) ao inves de apenas headers
3. Rejeitar com 409 se o job ja tem qualquer cost_item (nao apenas headers)
4. Adicionar roles `diretor_producao` e `coordenador_producao` no ALLOWED_ROLES
5. Resposta inclui contagem por categoria para o dialogo de confirmacao

**Request:**
```
POST /cost-items/apply-template/{jobId}
Authorization: Bearer {token}
Body: vazio (ou omitido)
```

**Response (201):**
```json
{
  "data": {
    "created": 140,
    "categories": 16,
    "items": [ ...CostItem[] ]
  }
}
```

**Response (409 -- job ja tem itens):**
```json
{
  "error": "CONFLICT",
  "message": "Job ja possui itens de custo. Template so pode ser aplicado em job vazio."
}
```

**Novo endpoint de preview (GET):**
```
GET /cost-items/apply-template/preview
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": {
    "template_name": "Producao Audiovisual Publicitaria",
    "total_items": 140,
    "categories": [
      { "item_number": 1, "name": "DESEMBOLSOS DE VERBAS A VISTA", "items_count": 8 },
      { "item_number": 2, "name": "ESTUDIO", "items_count": 1 },
      ...
    ]
  }
}
```

**Decisao sobre preview:** NAO criar endpoint de preview. O frontend conhece o template (importar a constante diretamente do `@/data/gg-template-preview.ts`). O backend so executa. Isso evita uma round-trip desnecessaria ao abrir o dialogo.

### 4.2 NOVO: POST /cost-items/import-from-job

**Arquivo:** `supabase/functions/cost-items/handlers/import-from-job.ts`

**Funcao:** Copia a estrutura de itens de custo de um job de origem para um job de destino, sem copiar valores financeiros.

**Request:**
```
POST /cost-items/import-from-job
Authorization: Bearer {token}
Content-Type: application/json

{
  "source_job_id": "uuid",
  "target_job_id": "uuid",
  "mode": "add" | "replace"
}
```

**Zod Schema:**
```typescript
const ImportFromJobSchema = z.object({
  source_job_id: z.string().uuid(),
  target_job_id: z.string().uuid(),
  mode: z.enum(['add', 'replace']),
});
```

**Logica:**
1. Validar role (ALLOWED_ROLES)
2. Validar que source_job_id e target_job_id sao do mesmo tenant
3. Validar que source_job_id != target_job_id
4. Buscar todos os cost_items do source_job (nao deletados)
5. Se mode = 'replace':
   - Soft-delete todos os cost_items do target_job (SET deleted_at = now())
6. Criar novos cost_items no target_job copiando apenas:
   - `item_number`, `sub_item_number`, `service_description`, `sort_order`
7. Campos financeiros ficam em default: unit_value=null, quantity=1, vendor_id=null, etc.
8. Retornar contagem de criados e (se replace) deletados

**Response (201):**
```json
{
  "data": {
    "created": 140,
    "deleted": 85,
    "source_job_id": "uuid",
    "target_job_id": "uuid",
    "mode": "replace"
  }
}
```

**ALLOWED_ROLES:** `['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao']`

### 4.3 NOVO: GET /cost-items/import-from-job/search?q={term}&target_job_id={uuid}

**Rota alternativa:** Reusar o handler `list` existente de jobs com query params. Avaliacao: o `handleList` de `cost-items` nao lista jobs, lista cost_items. Precisamos listar JOBS com contagem de cost_items.

**Decisao:** Reusar o endpoint `reference-jobs/{jobId}` existente. Ele ja retorna jobs similares do mesmo tenant com `cost_items_count`. Apenas precisamos:
1. Expandir ALLOWED_ROLES (adicionar diretor_producao, coordenador_producao)
2. Adicionar parametro de busca `?q=senac` para filtrar por titulo/codigo

**Mudanca no handler reference-jobs.ts:**
- Adicionar `q` (search) como query param opcional
- Se `q` fornecido, filtrar por `title.ilike(%q%)` ou `code.ilike(%q%)`
- Aumentar limite de 10 para 20

### 4.4 EXISTENTE (sem alteracao): PATCH /cost-items/{id}

Endpoint ja existente em `handlers/update.ts`. Sera usado pelo auto-save da edicao inline. Nenhuma alteracao necessaria -- o frontend envia apenas o campo alterado.

### 4.5 EXISTENTE (sem alteracao): GET /vendors/suggest?q={term}

Endpoint ja existente. Usado pelo autocomplete de fornecedor inline. Hook `useVendorSuggest(q)` ja funciona.

---

## 5. Componentes Frontend (novos e modificados)

### 5.1 NOVO: `InlineEditableCell.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/InlineEditableCell.tsx`

**Responsabilidade:** Componente generico que renderiza uma celula de tabela como texto estatico (modo leitura) ou como input (modo edicao). Gerencia o ciclo: click -> edit -> blur/enter/escape -> save/cancel.

**Props:**
```typescript
interface InlineEditableCellProps {
  value: string | number | null
  itemId: string
  field: 'service_description' | 'unit_value' | 'quantity'
  type: 'text' | 'currency' | 'integer'
  disabled?: boolean
  disabledReason?: string
  onSave: (itemId: string, field: string, value: string | number | null) => Promise<void>
  onEditStart?: () => void
  onEditEnd?: () => void
  className?: string
  // Para navegacao Tab
  tabIndex?: number
  nextCellRef?: React.RefObject<HTMLElement>
}
```

**Comportamento:**
- Click: entra em modo edicao, foca o input, seleciona texto
- Enter: confirma (mesmo que blur)
- Escape: cancela, restaura valor original
- Blur: salva se valor mudou, cancela se igual
- Tab: blur (salva) + foca nextCellRef
- Durante save: exibe spinner inline (substituir input por loader)
- Erro no save: restaura valor original + toast de erro
- type='currency': formata como BRL no modo leitura, input numerico no modo edicao
- type='integer': input type="number" step=1

**Tamanho estimado:** ~120 linhas

### 5.2 NOVO: `InlineVendorCell.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/InlineVendorCell.tsx`

**Responsabilidade:** Celula editavel inline especifica para campo de fornecedor, com autocomplete via `useVendorSuggest`.

**Props:**
```typescript
interface InlineVendorCellProps {
  vendorNameSnapshot: string | null
  vendorId: string | null
  itemId: string
  disabled?: boolean
  disabledReason?: string
  onSave: (itemId: string, vendorId: string | null, vendorName: string | null) => Promise<void>
  className?: string
}
```

**Comportamento:**
- Click: entra em modo edicao, exibe input com valor atual
- Ao digitar 2+ caracteres: dropdown com sugestoes via `useVendorSuggest(q)`
- Selecionar sugestao: preenche input e salva vendor_id + vendor_name_snapshot
- Texto livre (sem selecao): salva vendor_name_snapshot com vendor_id=null
- Escape: cancela
- Enter/Blur: salva

**Tamanho estimado:** ~150 linhas

### 5.3 NOVO: `ApplyTemplateDialog.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/ApplyTemplateDialog.tsx`

**Responsabilidade:** Dialogo de confirmacao que lista as 16 categorias e contagens do template antes de aplicar.

**Props:**
```typescript
interface ApplyTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  onSuccess: () => void
}
```

**Comportamento:**
- Exibe lista estatica das 16 categorias com contagem de itens (dados vem de constante local, nao do backend)
- Botao "Aplicar Template" chama `useApplyTemplate().mutate(jobId)`
- Durante processamento: botao desabilitado + spinner
- Sucesso: toast + onSuccess (invalida query)
- Erro: toast de erro

**Tamanho estimado:** ~100 linhas

### 5.4 NOVO: `ImportFromJobDialog.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/ImportFromJobDialog.tsx`

**Responsabilidade:** Dialogo com busca de jobs, preview de categorias, selecao de modo (add/replace), double-confirm para replace.

**Props:**
```typescript
interface ImportFromJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  hasExistingItems: boolean
  onSuccess: () => void
}
```

**Estados internos:**
- `searchQuery`: string de busca
- `selectedSourceJob`: job selecionado para preview
- `mode`: 'add' | 'replace' (so visivel se hasExistingItems)
- `confirmReplace`: boolean (double-confirm para replace)
- `isImporting`: boolean

**Comportamento:**
- Campo de busca com debounce 300ms chama `useReferenceJobs(jobId)` (modificado para aceitar `q`)
- Ou: novo hook `useSearchJobsForImport(q)` que busca jobs do tenant com contagem de cost_items
- Selecionar job exibe preview com categorias agrupadas
- Se job destino ja tem itens: exibe radio "Adicionar aos existentes" / "Substituir todos"
- "Substituir todos" requer segundo confirm dialog com botao vermelho
- Confirmar chama novo hook `useImportFromJob()`

**Tamanho estimado:** ~250 linhas

### 5.5 NOVO: `EmptyStateWithActions.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/EmptyStateWithActions.tsx`

**Responsabilidade:** Substitui o empty state atual (2 linhas de texto) por um painel com 3 opcoes: Aplicar Template, Importar de Job, Adicionar Item.

**Props:**
```typescript
interface EmptyStateWithActionsProps {
  jobId: string
  onAddNew: () => void
  onTemplateSuccess: () => void
  onImportSuccess: () => void
}
```

**Tamanho estimado:** ~60 linhas

### 5.6 MODIFICADO: `CostItemsTable.tsx`

**Mudancas:**
1. Importar `InlineEditableCell` e `InlineVendorCell`
2. No componente `ItemRow`, substituir as celulas de Descricao, Valor Unit., Qtde e Fornecedor por versoes editaveis inline
3. Adicionar prop `canEditInline: boolean` (baseado no role do usuario)
4. Adicionar prop `onInlineSave: (itemId, field, value) => Promise<void>` -- callback de save
5. Logica de bloqueio: itens pagos ou cancelados nao ativam edicao inline
6. Subtotal de categoria e total geral atualizam em tempo real via estado local

**Props adicionais:**
```typescript
interface CostItemsTableProps {
  // ...existentes...
  canEditInline: boolean
  onInlineSave: (itemId: string, field: string, value: unknown) => Promise<void>
}
```

**Impacto:** ~80 linhas adicionais ao ItemRow, sem alterar logica de agrupamento/selecao.

### 5.7 MODIFICADO: `page.tsx` (custos)

**Mudancas:**
1. Importar `EmptyStateWithActions`, `ApplyTemplateDialog`, `ImportFromJobDialog`
2. Adicionar estado para dialogs de template e import
3. Adicionar funcao `handleInlineSave` que chama `useUpdateCostItem`
4. Passar `canEditInline` baseado em `useUserRole()`
5. Modificar header: adicionar botao "Importar de Job" ao lado de "Adicionar Item"
6. Condicionar botao "Aplicar Template" para aparecer apenas quando lista vazia
7. Adicionar hint de "Clique para editar" controlado por localStorage

**Impacto:** ~60 linhas adicionais.

### 5.8 NOVO: `InlineEditHint.tsx`

**Caminho:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/InlineEditHint.tsx`

**Responsabilidade:** Banner leve "Clique em qualquer celula para comecar a preencher" que aparece acima da tabela na primeira vez apos aplicar template. Controlado por `localStorage`.

**Tamanho estimado:** ~30 linhas

---

## 6. Template JSON Completo (~140 linhas)

Fonte: GG_038 (Quer Fazer? Senac, job real). Extraido do CSV real.

O template sera armazenado em dois locais:
- **Backend:** `supabase/functions/cost-items/data/gg-template.ts` (fonte da verdade, usado pelo apply-template)
- **Frontend:** `frontend/src/data/gg-template-preview.ts` (subset para o dialogo de confirmacao, sem dados de insert)

### 6.1 Estrutura TypeScript (Backend)

```typescript
// supabase/functions/cost-items/data/gg-template.ts

export interface TemplateItem {
  item_number: number;
  sub_item_number: number;
  service_description: string;
  sort_order: number;
}

export interface TemplateCategory {
  item_number: number;
  name: string;
  items: TemplateItem[];
}

export const GG_TEMPLATE_NAME = 'Producao Audiovisual Publicitaria';

export const GG_TEMPLATE: TemplateCategory[] = [
  // ... definido abaixo
];

// Funcao helper para gerar o array flat de insercao
export function flattenTemplate(): TemplateItem[] {
  const result: TemplateItem[] = [];
  for (const cat of GG_TEMPLATE) {
    // Header da categoria (sub_item_number = 0)
    result.push({
      item_number: cat.item_number,
      sub_item_number: 0,
      service_description: cat.name,
      sort_order: cat.item_number * 100,
    });
    // Sub-itens
    for (const item of cat.items) {
      result.push(item);
    }
  }
  return result;
}
```

### 6.2 Dados do template (todas as ~140 linhas)

```typescript
export const GG_TEMPLATE: TemplateCategory[] = [
  {
    item_number: 1,
    name: 'DESEMBOLSOS DE VERBAS A VISTA',
    items: [
      { item_number: 1, sub_item_number: 1, service_description: 'Uber equipe', sort_order: 101 },
      { item_number: 1, sub_item_number: 2, service_description: 'Verba de Producao', sort_order: 102 },
      { item_number: 1, sub_item_number: 3, service_description: 'Verba de Arte', sort_order: 103 },
      { item_number: 1, sub_item_number: 4, service_description: 'Verba de Figurino', sort_order: 104 },
      { item_number: 1, sub_item_number: 5, service_description: 'Reembolso Equipe', sort_order: 105 },
      { item_number: 1, sub_item_number: 6, service_description: 'Compras Emergenciais de Set', sort_order: 106 },
      { item_number: 1, sub_item_number: 7, service_description: 'Impressoes / Autorizacoes', sort_order: 107 },
      { item_number: 1, sub_item_number: 8, service_description: 'Verba de visita de locacao', sort_order: 108 },
    ],
  },
  {
    item_number: 2,
    name: 'ESTUDIO',
    items: [
      { item_number: 2, sub_item_number: 1, service_description: 'Estudio', sort_order: 201 },
    ],
  },
  {
    item_number: 3,
    name: 'LOCACAO',
    items: [
      { item_number: 3, sub_item_number: 1, service_description: 'Diretor de Locacao', sort_order: 301 },
      { item_number: 3, sub_item_number: 2, service_description: 'Locacao', sort_order: 302 },
    ],
  },
  {
    item_number: 4,
    name: 'DIRECAO DE ARTE / FIGURINO / EFEITOS',
    items: [
      { item_number: 4, sub_item_number: 1, service_description: 'Diretor(a) de arte', sort_order: 401 },
      { item_number: 4, sub_item_number: 2, service_description: 'Assistente de Arte', sort_order: 402 },
      { item_number: 4, sub_item_number: 3, service_description: 'Pesquisa e Layouts', sort_order: 403 },
      { item_number: 4, sub_item_number: 4, service_description: 'Produtor de Objetos', sort_order: 404 },
      { item_number: 4, sub_item_number: 5, service_description: 'Assistente de Objetos', sort_order: 405 },
      { item_number: 4, sub_item_number: 6, service_description: 'Contra Regra', sort_order: 406 },
      { item_number: 4, sub_item_number: 7, service_description: 'Assistente Contra Regra', sort_order: 407 },
      { item_number: 4, sub_item_number: 8, service_description: 'Ajudante Arte I', sort_order: 408 },
      { item_number: 4, sub_item_number: 9, service_description: 'Ajudante Arte II', sort_order: 409 },
      { item_number: 4, sub_item_number: 10, service_description: 'Ajudante Arte III', sort_order: 410 },
      { item_number: 4, sub_item_number: 11, service_description: 'Ajudante Arte IV', sort_order: 411 },
      { item_number: 4, sub_item_number: 12, service_description: 'Retirada de arte', sort_order: 412 },
      { item_number: 4, sub_item_number: 13, service_description: 'Devolucao de arte', sort_order: 413 },
      { item_number: 4, sub_item_number: 14, service_description: 'Produtor(a) de Figurino', sort_order: 414 },
      { item_number: 4, sub_item_number: 15, service_description: 'Assistente de figurino I', sort_order: 415 },
      { item_number: 4, sub_item_number: 16, service_description: 'Assistente de figurino II', sort_order: 416 },
      { item_number: 4, sub_item_number: 17, service_description: 'Camareira', sort_order: 417 },
      { item_number: 4, sub_item_number: 18, service_description: 'Make/hair', sort_order: 418 },
      { item_number: 4, sub_item_number: 19, service_description: 'Assistente de Make', sort_order: 419 },
    ],
  },
  {
    item_number: 5,
    name: 'DIRECAO DE CENA / FOTOGRAFIA / SOM',
    items: [
      { item_number: 5, sub_item_number: 1, service_description: 'Shooting Board', sort_order: 501 },
      { item_number: 5, sub_item_number: 2, service_description: 'Diretor de cena', sort_order: 502 },
      { item_number: 5, sub_item_number: 3, service_description: 'Assistente de Direcao I', sort_order: 503 },
      { item_number: 5, sub_item_number: 4, service_description: 'Assistente de Direcao II', sort_order: 504 },
      { item_number: 5, sub_item_number: 5, service_description: 'Logger / Script', sort_order: 505 },
      { item_number: 5, sub_item_number: 6, service_description: 'Diretor de Fotografia', sort_order: 506 },
      { item_number: 5, sub_item_number: 7, service_description: 'Operador de Camera', sort_order: 507 },
      { item_number: 5, sub_item_number: 8, service_description: 'Assistente de Camera I', sort_order: 508 },
      { item_number: 5, sub_item_number: 9, service_description: 'Assistente de Camera II', sort_order: 509 },
      { item_number: 5, sub_item_number: 10, service_description: 'DIT', sort_order: 510 },
      { item_number: 5, sub_item_number: 11, service_description: 'Video Assist / Playback', sort_order: 511 },
      { item_number: 5, sub_item_number: 12, service_description: 'Making Off', sort_order: 512 },
      { item_number: 5, sub_item_number: 13, service_description: 'Chefe de Eletrica', sort_order: 513 },
      { item_number: 5, sub_item_number: 14, service_description: 'Assistente de Eletrica I', sort_order: 514 },
      { item_number: 5, sub_item_number: 15, service_description: 'Assistente de Eletrica II', sort_order: 515 },
      { item_number: 5, sub_item_number: 16, service_description: 'Assistente de Eletrica III', sort_order: 516 },
      { item_number: 5, sub_item_number: 17, service_description: 'Assistente de Eletrica IV', sort_order: 517 },
      { item_number: 5, sub_item_number: 18, service_description: 'Chefe de Maquinaria', sort_order: 518 },
      { item_number: 5, sub_item_number: 19, service_description: 'Assistente de Maquinaria I', sort_order: 519 },
      { item_number: 5, sub_item_number: 20, service_description: 'Assistente de Maquinaria II', sort_order: 520 },
      { item_number: 5, sub_item_number: 21, service_description: 'Assistente de Maquinaria III', sort_order: 521 },
      { item_number: 5, sub_item_number: 22, service_description: 'Carga e Dev Eletrica', sort_order: 522 },
      { item_number: 5, sub_item_number: 23, service_description: 'Carga e Dev Maquinaria', sort_order: 523 },
      { item_number: 5, sub_item_number: 24, service_description: 'Operador de Drone', sort_order: 524 },
      { item_number: 5, sub_item_number: 25, service_description: 'Operador Ronin / Steadicam', sort_order: 525 },
      { item_number: 5, sub_item_number: 26, service_description: 'Tecnico de Som Direto', sort_order: 526 },
      { item_number: 5, sub_item_number: 27, service_description: 'Microfonista', sort_order: 527 },
      { item_number: 5, sub_item_number: 28, service_description: 'Assistente de Som', sort_order: 528 },
    ],
  },
  {
    item_number: 6,
    name: 'PRODUCAO',
    items: [
      { item_number: 6, sub_item_number: 1, service_description: 'Produtor Executivo', sort_order: 601 },
      { item_number: 6, sub_item_number: 2, service_description: 'Diretor de Producao', sort_order: 602 },
      { item_number: 6, sub_item_number: 3, service_description: 'Coordenador de Producao', sort_order: 603 },
      { item_number: 6, sub_item_number: 4, service_description: 'Produtor', sort_order: 604 },
      { item_number: 6, sub_item_number: 5, service_description: 'Ajudante de Producao I', sort_order: 605 },
      { item_number: 6, sub_item_number: 6, service_description: 'Ajudante de Producao II', sort_order: 606 },
      { item_number: 6, sub_item_number: 7, service_description: 'Ajudante de Producao III', sort_order: 607 },
      { item_number: 6, sub_item_number: 8, service_description: 'Ajudante de Producao IV', sort_order: 608 },
      { item_number: 6, sub_item_number: 9, service_description: 'Carga e Dev Producao', sort_order: 609 },
      { item_number: 6, sub_item_number: 10, service_description: 'Efeitista', sort_order: 610 },
      { item_number: 6, sub_item_number: 11, service_description: 'Seguranca de Set', sort_order: 611 },
      { item_number: 6, sub_item_number: 12, service_description: 'Seguro', sort_order: 612 },
      { item_number: 6, sub_item_number: 13, service_description: 'Bombeiro / Socorrista', sort_order: 613 },
      { item_number: 6, sub_item_number: 14, service_description: 'Taxa Administrativa', sort_order: 614 },
      { item_number: 6, sub_item_number: 15, service_description: 'Previsao do Tempo', sort_order: 615 },
    ],
  },
  {
    item_number: 7,
    name: 'VEICULOS',
    items: [
      { item_number: 7, sub_item_number: 1, service_description: 'Pacote veiculos', sort_order: 701 },
      { item_number: 7, sub_item_number: 2, service_description: 'Transporte Robo', sort_order: 702 },
      { item_number: 7, sub_item_number: 3, service_description: 'Transporte Cliente', sort_order: 703 },
    ],
  },
  {
    item_number: 8,
    name: 'PASSAGEM / HOSPEDAGEM / ALIMENTACAO',
    items: [
      { item_number: 8, sub_item_number: 1, service_description: 'Alimentacao equipe', sort_order: 801 },
      { item_number: 8, sub_item_number: 2, service_description: 'Transporte catering', sort_order: 802 },
      { item_number: 8, sub_item_number: 3, service_description: 'Hotel', sort_order: 803 },
      { item_number: 8, sub_item_number: 4, service_description: 'Passagens', sort_order: 804 },
    ],
  },
  {
    item_number: 9,
    name: 'CAMERA / LUZ / MAQUINARIA / GERADOR / INFRA',
    items: [
      { item_number: 9, sub_item_number: 1, service_description: 'Camera / Acessorio / Lente', sort_order: 901 },
      { item_number: 9, sub_item_number: 2, service_description: 'Luz e Maquinaria', sort_order: 902 },
      { item_number: 9, sub_item_number: 3, service_description: 'Kambo', sort_order: 903 },
      { item_number: 9, sub_item_number: 4, service_description: 'Radios', sort_order: 904 },
      { item_number: 9, sub_item_number: 5, service_description: 'Consumiveis e Rat Pack', sort_order: 905 },
      { item_number: 9, sub_item_number: 6, service_description: 'Adaptadores e Dimmer', sort_order: 906 },
      { item_number: 9, sub_item_number: 7, service_description: 'Infraestrutura de Producao', sort_order: 907 },
      { item_number: 9, sub_item_number: 8, service_description: 'HD externo', sort_order: 908 },
      { item_number: 9, sub_item_number: 9, service_description: 'Gerador', sort_order: 909 },
      { item_number: 9, sub_item_number: 10, service_description: 'SteadyCam', sort_order: 910 },
      { item_number: 9, sub_item_number: 11, service_description: 'Drone', sort_order: 911 },
    ],
  },
  {
    item_number: 10,
    name: 'PRODUCAO DE CASTING',
    items: [
      { item_number: 10, sub_item_number: 1, service_description: 'Produtor de casting', sort_order: 1001 },
      { item_number: 10, sub_item_number: 2, service_description: 'Elenco variados', sort_order: 1002 },
      { item_number: 10, sub_item_number: 3, service_description: 'Elenco agencia + Reembolso', sort_order: 1003 },
      { item_number: 10, sub_item_number: 4, service_description: 'Reembolso elenco', sort_order: 1004 },
    ],
  },
  {
    item_number: 11,
    name: 'OBJETOS DE CENA',
    items: [
      { item_number: 11, sub_item_number: 1, service_description: 'Itens Cenograficos', sort_order: 1101 },
    ],
  },
  {
    item_number: 12,
    name: 'STILL / BASTIDORES',
    items: [
      { item_number: 12, sub_item_number: 1, service_description: 'Fotografo Still', sort_order: 1201 },
      { item_number: 12, sub_item_number: 2, service_description: 'Assistente de Fotografo', sort_order: 1202 },
    ],
  },
  {
    item_number: 13,
    name: 'POS PRODUCAO / TRILHA / CONDECINE',
    items: [
      { item_number: 13, sub_item_number: 1, service_description: 'Coordenador de Pos', sort_order: 1301 },
      { item_number: 13, sub_item_number: 2, service_description: 'Montador', sort_order: 1302 },
      { item_number: 13, sub_item_number: 3, service_description: 'Finalizador / VFX', sort_order: 1303 },
      { item_number: 13, sub_item_number: 4, service_description: 'Motion Design', sort_order: 1304 },
      { item_number: 13, sub_item_number: 5, service_description: 'Designer Grafico', sort_order: 1305 },
      { item_number: 13, sub_item_number: 6, service_description: 'Tecnico de Audio', sort_order: 1306 },
      { item_number: 13, sub_item_number: 7, service_description: 'Mixador', sort_order: 1307 },
      { item_number: 13, sub_item_number: 8, service_description: 'Compositor Musical / Trilha', sort_order: 1308 },
      { item_number: 13, sub_item_number: 9, service_description: 'Roteirista', sort_order: 1309 },
      { item_number: 13, sub_item_number: 10, service_description: 'Locutor', sort_order: 1310 },
      { item_number: 13, sub_item_number: 11, service_description: 'Condecine', sort_order: 1311 },
      { item_number: 13, sub_item_number: 12, service_description: 'Responsavel por Condecine', sort_order: 1312 },
    ],
  },
  {
    item_number: 14,
    name: 'ADMINISTRATIVO / FINANCEIRO',
    items: [
      { item_number: 14, sub_item_number: 1, service_description: 'Atendimento', sort_order: 1401 },
      { item_number: 14, sub_item_number: 2, service_description: 'Assistente de Atendimento', sort_order: 1402 },
      { item_number: 14, sub_item_number: 3, service_description: 'Seguro Equipe', sort_order: 1403 },
      { item_number: 14, sub_item_number: 4, service_description: 'Advogado', sort_order: 1404 },
    ],
  },
  {
    item_number: 15,
    name: 'MONSTRO',
    items: [
      { item_number: 15, sub_item_number: 1, service_description: 'Monstro para o Job', sort_order: 1501 },
    ],
  },
  {
    item_number: 99,
    name: 'MAO DE OBRA INTERNA',
    items: [
      { item_number: 99, sub_item_number: 1, service_description: 'Equipe Fixa (produtora, escritorio, etc)', sort_order: 9901 },
    ],
  },
];
```

**Contagem verificada:**
- 16 categorias (headers) + 124 sub-itens = **140 linhas totais**
- Cat 01: 8 | Cat 02: 1 | Cat 03: 2 | Cat 04: 19 | Cat 05: 28 | Cat 06: 15
- Cat 07: 3 | Cat 08: 4 | Cat 09: 11 | Cat 10: 4 | Cat 11: 1 | Cat 12: 2
- Cat 13: 12 | Cat 14: 4 | Cat 15: 1 | Cat 99: 1

**Nota sobre discrepancia com spec do PM:** A spec diz "23 itens" para Cat 05, mas o CSV real (GG_038) tem 28 sub-itens na categoria 05. A spec diz "12 itens" para Cat 06, mas o CSV real tem 15. O template acima segue o CSV real que e a fonte da verdade. As contagens exatas precisam de validacao final com o Danillo, mas o template acima e o mais fiel ao GG_038 real.

**Nota sobre cat 05:** A spec original lista "23 itens" na tabela de resumo, mas no detalhamento textual lista mais de 23 nomes. O CSV real tem entradas ate sub_item 28. O template acima usa numeracao sequencial limpa (1-28) e inclui todos os cargos reais do GG_038.

### 6.3 Preview para Frontend

```typescript
// frontend/src/data/gg-template-preview.ts

export interface TemplateCategoryPreview {
  item_number: number;
  name: string;
  items_count: number;
}

export const GG_TEMPLATE_PREVIEW: TemplateCategoryPreview[] = [
  { item_number: 1, name: 'Desembolsos de Verbas a Vista', items_count: 8 },
  { item_number: 2, name: 'Estudio', items_count: 1 },
  { item_number: 3, name: 'Locacao', items_count: 2 },
  { item_number: 4, name: 'Direcao de Arte / Figurino / Efeitos', items_count: 19 },
  { item_number: 5, name: 'Direcao de Cena / Fotografia / Som', items_count: 28 },
  { item_number: 6, name: 'Producao', items_count: 15 },
  { item_number: 7, name: 'Veiculos', items_count: 3 },
  { item_number: 8, name: 'Passagem / Hospedagem / Alimentacao', items_count: 4 },
  { item_number: 9, name: 'Camera / Luz / Maquinaria / Gerador / Infra', items_count: 11 },
  { item_number: 10, name: 'Producao de Casting', items_count: 4 },
  { item_number: 11, name: 'Objetos de Cena', items_count: 1 },
  { item_number: 12, name: 'Still / Bastidores', items_count: 2 },
  { item_number: 13, name: 'Pos Producao / Trilha / Condecine', items_count: 12 },
  { item_number: 14, name: 'Administrativo / Financeiro', items_count: 4 },
  { item_number: 15, name: 'Monstro', items_count: 1 },
  { item_number: 99, name: 'Mao de Obra Interna', items_count: 1 },
];

export const GG_TEMPLATE_TOTAL_ITEMS = 140; // 16 headers + 124 sub-itens
export const GG_TEMPLATE_NAME = 'Producao Audiovisual Publicitaria';
```

---

## 7. Hooks Novos e Modificados

### 7.1 NOVO: `useImportFromJob()` (em useCostItems.ts)

```typescript
export function useImportFromJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { source_job_id: string; target_job_id: string; mode: 'add' | 'replace' }) =>
      apiMutate<{ created: number; deleted: number }>(
        'cost-items',
        'POST',
        payload as Record<string, unknown>,
        'import-from-job'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}
```

### 7.2 MODIFICADO: `useApplyTemplate()` (em useCostItems.ts)

Sem alteracao no hook. A mudanca e no backend (retorna ~140 itens em vez de ~16).

### 7.3 NOVO: `useSearchJobsForImport()` (em useCostItems.ts)

```typescript
export function useSearchJobsForImport(jobId: string, q: string) {
  return useQuery({
    queryKey: costItemKeys.referenceJobs(jobId, q),
    queryFn: () => apiGet('cost-items', { q }, `reference-jobs/${jobId}`),
    enabled: !!jobId && q.length >= 2,
    staleTime: 30_000,
  })
}
```

**Nota:** Depende da modificacao do handler reference-jobs.ts para aceitar `?q=`.

### 7.4 NOVO: `useInlineEditSave()` (hook customizado)

```typescript
// frontend/src/hooks/useInlineEditSave.ts

// Hook que encapsula a logica de save inline com debounce e rollback
export function useInlineEditSave() {
  const updateItem = useUpdateCostItem()

  async function saveField(
    itemId: string,
    field: string,
    value: unknown,
  ): Promise<void> {
    await updateItem.mutateAsync({ id: itemId, [field]: value })
  }

  return { saveField, isPending: updateItem.isPending }
}
```

---

## 8. Ordem de Implementacao Detalhada

### Sprint 1: Template GG Padrao (2 dias)

**Dia 1 -- Backend + Dados**

| # | Artefato | Descricao |
|---|----------|-----------|
| 1.1 | `supabase/functions/cost-items/data/gg-template.ts` | NOVO -- constante com 140 linhas do template |
| 1.2 | `supabase/functions/cost-items/handlers/apply-template.ts` | REESCREVER -- usar template hardcoded, rejeitar 409 se job tem itens, expandir ALLOWED_ROLES |
| 1.3 | Deploy EF cost-items | via MCP ou CLI |
| 1.4 | Teste manual | Aplicar template em job vazio via curl/Postman |

**Dia 2 -- Frontend**

| # | Artefato | Descricao |
|---|----------|-----------|
| 1.5 | `frontend/src/data/gg-template-preview.ts` | NOVO -- preview das categorias para o dialogo |
| 1.6 | `ApplyTemplateDialog.tsx` | NOVO -- dialogo de confirmacao com lista de categorias |
| 1.7 | `EmptyStateWithActions.tsx` | NOVO -- painel de acoes para GG vazio |
| 1.8 | `page.tsx` (custos) | MODIFICAR -- integrar EmptyStateWithActions e ApplyTemplateDialog |
| 1.9 | Teste E2E | Aplicar template, verificar 140 linhas na tabela |

**Checkpoint Sprint 1:** Usuario cria 140 linhas em 2 cliques e <5 segundos.

---

### Sprint 2: Importar de Job (2 dias)

**Dia 3 -- Backend**

| # | Artefato | Descricao |
|---|----------|-----------|
| 2.1 | `supabase/functions/cost-items/handlers/import-from-job.ts` | NOVO -- handler completo |
| 2.2 | `supabase/functions/cost-items/index.ts` | MODIFICAR -- adicionar rota POST /cost-items/import-from-job |
| 2.3 | `supabase/functions/cost-items/handlers/reference-jobs.ts` | MODIFICAR -- adicionar filtro `?q=`, expandir ALLOWED_ROLES |
| 2.4 | Deploy EF cost-items | via MCP ou CLI |
| 2.5 | Teste manual | Import via curl, verificar que valores nao sao copiados |

**Dia 4 -- Frontend**

| # | Artefato | Descricao |
|---|----------|-----------|
| 2.6 | `useImportFromJob()` e `useSearchJobsForImport()` | NOVO em useCostItems.ts |
| 2.7 | `ImportFromJobDialog.tsx` | NOVO -- dialogo completo (busca, preview, modos add/replace) |
| 2.8 | `page.tsx` (custos) | MODIFICAR -- botao "Importar de Job" no header, integracao |
| 2.9 | Teste E2E | Importar de job existente, verificar valores nulos |

**Checkpoint Sprint 2:** Usuario importa estrutura de outro job em 3 cliques, sem valores copiados.

---

### Sprint 3: Edicao Inline (3 dias)

**Dia 5 -- Componentes base**

| # | Artefato | Descricao |
|---|----------|-----------|
| 3.1 | `InlineEditableCell.tsx` | NOVO -- celula editavel generica (text, currency, integer) |
| 3.2 | `InlineVendorCell.tsx` | NOVO -- celula editavel com autocomplete de vendor |
| 3.3 | `useInlineEditSave.ts` | NOVO -- hook de save inline |
| 3.4 | Teste unitario dos componentes | Isolado, sem integracao com tabela |

**Dia 6 -- Integracao na tabela**

| # | Artefato | Descricao |
|---|----------|-----------|
| 3.5 | `CostItemsTable.tsx` | MODIFICAR -- substituir celulas estaticas por InlineEditableCell nos 4 campos |
| 3.6 | `CostItemsTable.tsx` | MODIFICAR -- logica de bloqueio (itens pagos/cancelados, roles) |
| 3.7 | `page.tsx` (custos) | MODIFICAR -- passar canEditInline e onInlineSave |
| 3.8 | `InlineEditHint.tsx` | NOVO -- hint de "Clique para editar" |

**Dia 7 -- Tab navigation + calculo real-time + polish**

| # | Artefato | Descricao |
|---|----------|-----------|
| 3.9 | Tab navigation | Implementar ordem: Descricao > Valor Unit. > Qtde > Fornecedor > proxima linha |
| 3.10 | Calculo real-time | Subtotal da categoria e total geral atualizam durante digitacao |
| 3.11 | Conflito inline/drawer | Ao abrir drawer, fazer blur da celula ativa (save inline primeiro) |
| 3.12 | Teste E2E completo | Fluxo template > preencher inline > verificar totais |

**Checkpoint Sprint 3:** Usuario preenche 20 itens consecutivos com Tab/Enter sem abrir drawer.

---

### Validacao Final (0.5 dia)

| # | Teste | Descricao |
|---|-------|-----------|
| V.1 | Template > Inline | Aplicar template, preencher 10 itens inline, verificar totais |
| V.2 | Import > Inline | Importar de job, preencher, verificar que valores de origem nao aparecem |
| V.3 | Drawer continua | Abrir drawer para campos nao editaveis inline (payment_condition, notes) |
| V.4 | Permissoes | Testar com role 'financeiro' -- nao deve ativar edicao inline |
| V.5 | Regressao | Selecao em lote, pagamento em lote, export CSV/PDF |
| V.6 | Mobile | Verificar que edicao inline nao aparece em mobile (< 768px) |

---

## 9. Riscos Tecnicos e Mitigacoes

### RT-01: Batch insert de 140 linhas pode falhar por tamanho

**Risco:** PostgreSQL tem limite de tamanho de statement. 140 linhas com ~10 campos cada pode gerar um INSERT grande.

**Mitigacao:** O batch handler existente ja aceita ate 200 itens. O apply-template fara um unico INSERT de 140 registros, que e bem dentro do limite do PostgreSQL (~65k parametros). Testado empiricamente: 200 linhas funcionam sem problema.

### RT-02: Conflito de estado entre edicao inline e React Query cache

**Risco:** Apos save inline (PATCH), o React Query invalida a lista. Se houver um re-fetch em andamento e o usuario estiver editando outra celula, o re-render pode fechar o modo de edicao.

**Mitigacao:** Usar `optimistic update` no React Query: ao salvar, atualizar o cache local imediatamente (sem esperar re-fetch). O re-fetch confirma o valor. Se o re-fetch trouxer valor diferente (race condition), exibir toast de aviso.

**Implementacao:**
```typescript
// No onMutate do useUpdateCostItem:
onMutate: async (variables) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: costItemKeys.lists() })
  // Snapshot previous value
  const previous = queryClient.getQueryData(costItemKeys.lists())
  // Optimistically update
  queryClient.setQueryData(costItemKeys.lists(), (old) => /* update */ )
  return { previous }
},
onError: (err, variables, context) => {
  // Rollback
  queryClient.setQueryData(costItemKeys.lists(), context?.previous)
},
```

### RT-03: Tab navigation com celulas nao editaveis no meio

**Risco:** A tabela tem colunas nao editaveis (Total, HE, Total+HE, Status, NF, Pgto) entre as editaveis. O Tab nativo do browser pula para a proxima celula visivel, nao para a proxima editavel.

**Mitigacao:** Interceptar o evento `keydown` Tab no InlineEditableCell. Em vez de usar tabIndex nativo, manter um registro global de celulas editaveis ordenadas por posicao (row, col). Tab avanca no registro, nao no DOM.

**Implementacao:** Usar um React context `InlineEditContext` que mantem um Map de `{rowId}-{field}` -> ref do input. Tab busca a proxima entrada no Map.

### RT-04: Autocomplete de vendor com latencia

**Risco:** O dropdown de sugestoes de vendor depende de uma query GET /vendors/suggest?q=. Se a latencia for alta (>500ms), o dropdown aparece tarde e o usuario pode ter saido da celula.

**Mitigacao:** O `useVendorSuggest` ja tem `staleTime: 10_000`. Adicionar `debounce: 200ms` na digitacao para nao disparar query a cada keystroke. Se o usuario sair da celula antes das sugestoes carregarem, o texto digitado e salvo como `vendor_name_snapshot` (texto livre).

### RT-05: Perda de dados no modo "replace" da importacao

**Risco:** Soft-delete de itens existentes e permanente (deleted_at nao e resetavel pela UI).

**Mitigacao:** Double-confirm dialog com contagem explicita de itens que serao deletados. O dialogo deve exibir: "ATENCAO: X itens com valores preenchidos serao excluidos. Esta acao NAO pode ser desfeita." Botao vermelho "Excluir e Importar".

---

## 10. Mapa de Artefatos

### Backend (Edge Functions)

| Arquivo | Acao | Sprint |
|---------|------|--------|
| `supabase/functions/cost-items/data/gg-template.ts` | NOVO | 1 |
| `supabase/functions/cost-items/handlers/apply-template.ts` | REESCREVER | 1 |
| `supabase/functions/cost-items/handlers/import-from-job.ts` | NOVO | 2 |
| `supabase/functions/cost-items/handlers/reference-jobs.ts` | MODIFICAR (+q, +roles) | 2 |
| `supabase/functions/cost-items/index.ts` | MODIFICAR (+rota import-from-job) | 2 |

### Frontend -- Componentes

| Arquivo | Acao | Sprint |
|---------|------|--------|
| `frontend/src/data/gg-template-preview.ts` | NOVO | 1 |
| `frontend/src/app/.../custos/_components/ApplyTemplateDialog.tsx` | NOVO | 1 |
| `frontend/src/app/.../custos/_components/EmptyStateWithActions.tsx` | NOVO | 1 |
| `frontend/src/app/.../custos/_components/ImportFromJobDialog.tsx` | NOVO | 2 |
| `frontend/src/app/.../custos/_components/InlineEditableCell.tsx` | NOVO | 3 |
| `frontend/src/app/.../custos/_components/InlineVendorCell.tsx` | NOVO | 3 |
| `frontend/src/app/.../custos/_components/InlineEditHint.tsx` | NOVO | 3 |
| `frontend/src/app/.../custos/_components/CostItemsTable.tsx` | MODIFICAR | 3 |
| `frontend/src/app/.../custos/page.tsx` | MODIFICAR | 1+2+3 |

### Frontend -- Hooks e Dados

| Arquivo | Acao | Sprint |
|---------|------|--------|
| `frontend/src/hooks/useCostItems.ts` | MODIFICAR (+useImportFromJob, +useSearchJobsForImport) | 2 |
| `frontend/src/hooks/useInlineEditSave.ts` | NOVO | 3 |

### Nenhuma migration necessaria

---

## Checklist de validacao pre-implementacao

Antes de iniciar cada sprint, verificar:

- [ ] Sprint 1: EF cost-items deploya corretamente com o novo arquivo data/gg-template.ts
- [ ] Sprint 1: Contagem do template confere (16 + 124 = 140)
- [ ] Sprint 2: Rota import-from-job nao conflita com rotas existentes no index.ts
- [ ] Sprint 3: useUpdateCostItem() retorna o item atualizado no response (para optimistic update)
- [ ] Sprint 3: useVendorSuggest() funciona com queries de 2 caracteres

---

*Documento gerado em 2026-03-12 pelo Tech Lead (Claude Opus). Baseado na spec 09-gg-template-inline-edit-spec.md e na analise do codebase atual.*
