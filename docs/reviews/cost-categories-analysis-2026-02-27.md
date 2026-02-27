# Analise de Estrutura: cost_categories + cost_items

**Data:** 27/02/2026
**Autor:** Database Architect - ELLAHOS
**Escopo:** Tabelas cost_categories, cost_items, vendors, bank_accounts (Migration 019)
**Fonte:** Migration `20260227100000_fase_10_financial_module_schema.sql` + Edge Functions em `supabase/functions/cost-items/`
**Status:** ANALISE SOMENTE - nenhuma alteracao aplicada

---

## 1. Estado Atual (DDL Resumido)

### 1.1 cost_categories

```sql
CREATE TABLE cost_categories (
  id                UUID        PK DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL FK tenants(id) ON DELETE CASCADE,
  item_number       SMALLINT    NOT NULL,          -- 1-99
  display_name      TEXT        NOT NULL,
  production_type   TEXT        NOT NULL DEFAULT 'all',
  description       TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  sort_order        SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_cost_categories_production_type CHECK (
    production_type IN ('filme_publicitario','branded_content','videoclipe',
                        'documentario','conteudo_digital','all')
  ),
  CONSTRAINT chk_cost_categories_item_number CHECK (item_number BETWEEN 1 AND 99),
  CONSTRAINT uq_cost_categories_tenant_type_item UNIQUE (tenant_id, production_type, item_number)
);
```

**Indices:**
- `idx_cost_categories_tenant` ON (tenant_id, production_type) WHERE deleted_at IS NULL

**RLS:** 3 policies (SELECT, INSERT, UPDATE) usando `get_tenant_id()`
**Trigger:** `trg_cost_categories_updated_at` via `update_updated_at()`

### 1.2 cost_items (resumo - ~45 colunas)

```sql
CREATE TABLE cost_items (
  id                    UUID          PK DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL FK tenants(id) ON DELETE CASCADE,
  job_id                UUID          FK jobs(id) ON DELETE CASCADE,  -- NULL = custo fixo
  item_number           SMALLINT      NOT NULL,     -- 1-99 (grupo de custo)
  sub_item_number       SMALLINT      NOT NULL DEFAULT 0,  -- 0 = header da categoria
  is_category_header    BOOLEAN       GENERATED (sub_item_number = 0),
  service_description   TEXT          NOT NULL,
  -- ... 35+ colunas de valores, vendor snapshot, status, NF, pagamento ...
  vendor_id             UUID          FK vendors(id) ON DELETE SET NULL,
  created_by            UUID          FK profiles(id),
  nf_document_id        UUID          FK nf_documents(id),
  nf_requested_by       UUID          FK profiles(id),

  CONSTRAINT chk_cost_items_item_number CHECK (item_number BETWEEN 1 AND 99),
  -- 7 constraints CHECK adicionais para status, payment_condition, payment_method, etc.
);
```

**Indices:** 7 indices parciais bem elaborados
**RLS:** 3 policies (SELECT, INSERT, UPDATE) usando `get_tenant_id()`

---

## 2. Problemas Encontrados

### P-01: cost_items.item_number NAO tem FK para cost_categories [CRITICAL]

**Problema:** A coluna `cost_items.item_number` e um SMALLINT livre validado apenas por CHECK (1-99). Nao ha nenhuma FK nem referencia estrutural para `cost_categories`. A relacao item_number entre as duas tabelas e apenas convencional/logica -- nao ha enforcement no banco.

**Impacto:**
- Um cost_item pode ter item_number=50 mesmo que nao exista nenhuma categoria 50 em cost_categories
- Nao ha garantia que o item_number referenciado no cost_item corresponde a uma categoria real do tenant
- O `apply-template.ts` cria headers (sub_item_number=0) copiando display_name de cost_categories, mas depois disso a ligacao e perdida
- Renomear uma categoria em cost_categories NAO reflete nos cost_items existentes (intencional pelo design de snapshot, mas nao documentado como decisao)

**Causa raiz:** O design optou por duplicar o item_number como integer em vez de criar uma FK UUID entre cost_items e cost_categories. Isso foi feito para suportar custos fixos (sem job_id) e para simplicidade, mas sacrificou integridade referencial.

---

### P-02: UNIQUE constraint de cost_categories ignora soft-delete [HIGH]

**Problema:** A constraint `uq_cost_categories_tenant_type_item UNIQUE (tenant_id, production_type, item_number)` e uma constraint de tabela (nao um partial index). Isso significa que se um registro de cost_categories for soft-deleted (`deleted_at IS NOT NULL`), nao sera possivel criar outro com o mesmo (tenant_id, production_type, item_number).

**Cenario de falha:**
1. Admin cria categoria Item 5 para 'filme_publicitario'
2. Admin faz soft-delete dessa categoria
3. Admin tenta criar nova categoria Item 5 para 'filme_publicitario' -> FALHA (violacao UNIQUE)

**Impacto:** Impossibilidade de recriar categorias apos soft-delete sem intervencao direta no banco.

---

### P-03: cost_items NAO tem UNIQUE constraint para (tenant_id, job_id, item_number, sub_item_number) [HIGH]

**Problema:** Nao existe nenhuma UNIQUE constraint que impeca a criacao de dois cost_items com o mesmo (job_id, item_number, sub_item_number). O indice `idx_cost_items_tenant_job` existe para performance, mas NAO e UNIQUE.

**Cenario de falha:**
1. Produtor cria sub_item 1 do Item 5 (Diretor de Cena) para o Job X
2. Por bug ou chamada duplicada, cria outro sub_item 1 do Item 5 para o Job X -> SUCESSO (duplicata)
3. Views e dashboards mostram valores duplicados, causando soma incorreta

**Impacto:** Duplicatas silenciosas que corrompem relatorios financeiros.

---

### P-04: cost_items.sub_item_number NAO tem CHECK constraint [MEDIUM]

**Problema:** O `item_number` tem CHECK (BETWEEN 1 AND 99), mas `sub_item_number` nao tem nenhum CHECK. Aceita valores negativos ou extremamente altos.

**Cenario:** `INSERT ... sub_item_number = -5` -> SUCESSO. E `is_category_header` seria false (pois -5 != 0), o que esta correto logicamente, mas o valor negativo nao faz sentido no dominio.

---

### P-05: cost_categories NAO tem DELETE RLS policy [MEDIUM]

**Problema:** Existem policies para SELECT, INSERT e UPDATE, mas nao para DELETE. Usando soft-delete o problema e menor (pois DELETE real e raro), mas se alguem executar um `DELETE FROM cost_categories WHERE ...` com service_role, a RLS nao impede acesso cross-tenant.

Mesmo cenario para: cost_items, vendors, bank_accounts, cash_advances, expense_receipts. Nenhuma dessas tabelas tem policy FOR DELETE.

**Nota:** Como o sistema usa soft-delete (UPDATE de deleted_at), a policy de UPDATE ja cobre o fluxo normal. Mas a ausencia da policy DELETE deixa uma brecha se o service_role nao for usado com cuidado ou se alguem tentar DELETE direto.

---

### P-06: cost_categories.display_name NAO tem constraint de comprimento [LOW]

**Problema:** O campo `display_name` e TEXT NOT NULL sem CHECK de comprimento. Um usuario pode inserir um display_name com 10.000 caracteres.

**Impacto:** Baixo em termos de seguranca, mas pode causar problemas de renderizacao no frontend. A spec previu service_description com max 500 chars em cost_items, mas cost_categories.display_name nao tem limite.

---

### P-07: Hierarquia item/sub-item definida por convencao, nao por estrutura [HIGH]

**Problema:** A hierarquia de categorias e sub-itens e inteiramente baseada em convencao:
- cost_categories define os "grupos" (item 1 a 15 e 99)
- cost_items usa `sub_item_number = 0` para marcar o header da categoria
- cost_items usa `sub_item_number > 0` para os sub-itens

Nao ha nenhuma constraint que garanta:
1. Que todo cost_item com sub_item_number > 0 tenha um correspondente sub_item_number = 0 no mesmo (job_id, item_number)
2. Que os sub_item_numbers sejam sequenciais dentro de um item_number
3. Que um header (sub_item_number=0) nao tenha valores financeiros preenchidos

**Cenario de falha:**
- Criar sub_item 3 do Item 5 sem nunca ter criado sub_item 0 (header) -> SUCESSO
- O header fica "invisivel" na listagem -- a view vw_resumo_custos_job faz MAX(CASE WHEN is_category_header THEN ...) que retorna NULL para item_name

---

### P-08: vendors NAO tem UNIQUE parcial em (tenant_id, cpf) e (tenant_id, cnpj) [MEDIUM]

**Problema:** Existem indices parciais em `(tenant_id, cpf)` e `(tenant_id, cnpj)`, mas sao indices regulares (para busca), NAO UNIQUE. Isso significa que dois vendors podem ter o mesmo CPF ou CNPJ dentro do mesmo tenant.

**Cenario:**
1. Importar vendor "Joao Silva" com CPF 12345678901
2. Importar vendor "J. Silva" com CPF 12345678901 -> SUCESSO (duplicata por CPF)

A dedup por `normalized_name` pega nomes similares, mas se o mesmo CPF/CNPJ for cadastrado com nomes diferentes, passa despercebido.

---

### P-09: bank_accounts.tenant_id pode divergir de vendors.tenant_id [MEDIUM]

**Problema:** `bank_accounts` tem `tenant_id` e `vendor_id`. Nao ha constraint que garanta que o tenant_id do bank_account seja o mesmo do vendor referenciado. Se alguem inserir com service_role ou por bug:

```sql
INSERT INTO bank_accounts (tenant_id, vendor_id, ...)
VALUES ('tenant_A', 'vendor_de_tenant_B', ...);
```

O RLS impede isso para usuarios normais (pois so veem vendor_id do proprio tenant), mas com service_role ou trigger isso pode acontecer.

---

### P-10: Trigger updated_at referencia funcoes diferentes [LOW]

**Problema menor:** A migration 015 (financial_records, budget_items, invoices) usa `update_updated_at_column()`. A migration 019 (cost_categories, cost_items, vendors, etc.) usa `update_updated_at()`. Ambas existem no banco e fazem a mesma coisa, mas a inconsistencia dificulta manutencao.

---

### P-11: cost_categories.sort_order vs item_number -- redundancia sem regra clara [LOW]

**Problema:** A tabela cost_categories tem tanto `item_number` (posicao logica: 1-15, 99) quanto `sort_order` (ordem de exibicao). Nao ha constraint que defina a relacao entre eles. Nada impede sort_order=99 para item_number=1 e sort_order=1 para item_number=99.

**Impacto:** Ambiguidade sobre qual campo usar para ordenacao. O apply-template.ts copia sort_order, mas o list.ts ordena por item_number.

---

### P-12: Views usam SECURITY INVOKER mas nao filtram deleted_at em todas as joins [LOW]

**Problema:** A view `vw_resumo_custos_job` filtra `ci.deleted_at IS NULL` nos cost_items, mas nao filtra `j.deleted_at IS NULL` nos jobs (no JOIN da vw_calendario_pagamentos). Se um job for soft-deleted, seus cost_items ainda aparecem no calendario.

---

## 3. Recomendacoes de Melhoria

### R-01: Criar FK explicita entre cost_items e cost_categories [CRITICAL]

**Opcao A (recomendada): Adicionar coluna `cost_category_id` como FK**

```sql
-- Adicionar FK para cost_categories
ALTER TABLE cost_items
  ADD COLUMN IF NOT EXISTS cost_category_id UUID
    REFERENCES cost_categories(id) ON DELETE SET NULL;

-- Indice na FK
CREATE INDEX IF NOT EXISTS idx_cost_items_cost_category
  ON cost_items(cost_category_id) WHERE cost_category_id IS NOT NULL;

-- Comentario
COMMENT ON COLUMN cost_items.cost_category_id IS
  'FK para cost_categories. Referencia a categoria template usada. SET NULL se categoria for removida.';
```

**Opcao B (alternativa leve): Constraint de validacao via trigger**

```sql
CREATE OR REPLACE FUNCTION fn_validate_cost_item_category()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  -- Apenas validar se existe a categoria no tenant
  IF NOT EXISTS (
    SELECT 1 FROM cost_categories
    WHERE tenant_id = NEW.tenant_id
      AND item_number = NEW.item_number
      AND deleted_at IS NULL
  ) THEN
    RAISE WARNING 'item_number % nao encontrado em cost_categories do tenant', NEW.item_number;
    -- WARNING em vez de EXCEPTION para nao bloquear migracao de dados historicos
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cost_items_validate_category
  BEFORE INSERT OR UPDATE OF item_number ON cost_items
  FOR EACH ROW EXECUTE FUNCTION fn_validate_cost_item_category();
```

**Recomendacao:** Opcao A e a mais robusta. A Opcao B e boa como complemento ou como medida transitoria (nao bloqueia migracao de dados historicos).

**Prioridade:** CRITICAL

---

### R-02: Converter UNIQUE de cost_categories para partial index que respeita soft-delete [HIGH]

```sql
-- Remover UNIQUE constraint que ignora soft-delete
ALTER TABLE cost_categories
  DROP CONSTRAINT IF EXISTS uq_cost_categories_tenant_type_item;

-- Criar partial unique index que permite "recriar" apos soft-delete
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_categories_tenant_type_item_active
  ON cost_categories(tenant_id, production_type, item_number)
  WHERE deleted_at IS NULL;
```

**Prioridade:** HIGH

---

### R-03: Adicionar UNIQUE parcial em cost_items para evitar duplicatas [HIGH]

```sql
-- Para cost_items com job_id (custos de job):
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_items_job_item_subitem
  ON cost_items(tenant_id, job_id, item_number, sub_item_number)
  WHERE job_id IS NOT NULL AND deleted_at IS NULL;

-- Para cost_items sem job_id (custos fixos mensais):
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_items_fixed_item_subitem_month
  ON cost_items(tenant_id, item_number, sub_item_number, period_month)
  WHERE job_id IS NULL AND deleted_at IS NULL;
```

**Prioridade:** HIGH

---

### R-04: Adicionar CHECK em sub_item_number [MEDIUM]

```sql
ALTER TABLE cost_items
  ADD CONSTRAINT chk_cost_items_sub_item_number CHECK (
    sub_item_number BETWEEN 0 AND 999
  );
```

**Prioridade:** MEDIUM

---

### R-05: Adicionar policies FOR DELETE em todas as tabelas Fase 10 [MEDIUM]

```sql
-- cost_categories
DROP POLICY IF EXISTS cost_categories_delete ON cost_categories;
CREATE POLICY cost_categories_delete ON cost_categories
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- cost_items
DROP POLICY IF EXISTS cost_items_delete ON cost_items;
CREATE POLICY cost_items_delete ON cost_items
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- vendors
DROP POLICY IF EXISTS vendors_delete ON vendors;
CREATE POLICY vendors_delete ON vendors
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- bank_accounts
DROP POLICY IF EXISTS bank_accounts_delete ON bank_accounts;
CREATE POLICY bank_accounts_delete ON bank_accounts
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- cash_advances
DROP POLICY IF EXISTS cash_advances_delete ON cash_advances;
CREATE POLICY cash_advances_delete ON cash_advances
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- expense_receipts
DROP POLICY IF EXISTS expense_receipts_delete ON expense_receipts;
CREATE POLICY expense_receipts_delete ON expense_receipts
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
```

**Prioridade:** MEDIUM

---

### R-06: Adicionar CHECK de comprimento em display_name [LOW]

```sql
ALTER TABLE cost_categories
  ADD CONSTRAINT chk_cost_categories_display_name_length CHECK (
    char_length(display_name) BETWEEN 1 AND 200
  );
```

**Prioridade:** LOW

---

### R-07: Adicionar UNIQUE parcial em vendors para CPF e CNPJ [MEDIUM]

```sql
-- Impedir dois vendors com mesmo CPF no mesmo tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_tenant_cpf
  ON vendors(tenant_id, cpf)
  WHERE cpf IS NOT NULL AND deleted_at IS NULL;

-- Impedir dois vendors com mesmo CNPJ no mesmo tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_tenant_cnpj
  ON vendors(tenant_id, cnpj)
  WHERE cnpj IS NOT NULL AND deleted_at IS NULL;
```

**Prioridade:** MEDIUM

---

### R-08: Adicionar cross-tenant constraint em bank_accounts [MEDIUM]

```sql
-- Trigger que valida que bank_accounts.tenant_id == vendors.tenant_id
CREATE OR REPLACE FUNCTION fn_validate_bank_account_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_vendor_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_vendor_tenant
    FROM vendors WHERE id = NEW.vendor_id;

  IF v_vendor_tenant IS NULL THEN
    RAISE EXCEPTION 'Vendor % nao encontrado', NEW.vendor_id;
  END IF;

  IF v_vendor_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'bank_accounts.tenant_id (%) diverge de vendors.tenant_id (%)',
      NEW.tenant_id, v_vendor_tenant;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bank_accounts_validate_tenant ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_validate_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, vendor_id ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_validate_bank_account_tenant();
```

**Prioridade:** MEDIUM

---

### R-09: Padronizar funcao de updated_at trigger [LOW]

```sql
-- Garantir alias para a funcao usada na migration 015
DO $$ BEGIN
  -- Se update_updated_at_column nao existe, criar como wrapper
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

COMMENT ON FUNCTION update_updated_at() IS
  'Funcao padrao para trigger de updated_at. Usar ESTA em novas migrations.';
```

**Nota:** Idealmente em novas migrations usar sempre `update_updated_at()`. Nao vale a pena migrar os triggers existentes.

**Prioridade:** LOW

---

### R-10: Adicionar filtro deleted_at na view vw_calendario_pagamentos [LOW]

```sql
CREATE OR REPLACE VIEW vw_calendario_pagamentos
WITH (security_invoker = true)
AS
SELECT
  ci.tenant_id,
  ci.payment_due_date,
  ci.job_id,
  j.code AS job_code,
  j.title AS job_title,
  COUNT(*) FILTER (WHERE ci.payment_status != 'cancelado') AS items_count,
  COUNT(*) FILTER (WHERE ci.payment_status = 'pago') AS items_paid,
  COUNT(*) FILTER (WHERE ci.payment_status = 'pendente') AS items_pending,
  COALESCE(SUM(ci.total_with_overtime) FILTER (WHERE ci.payment_status != 'cancelado'), 0) AS total_budgeted,
  COALESCE(SUM(COALESCE(ci.actual_paid_value, ci.total_with_overtime)) FILTER (WHERE ci.payment_status = 'pago'), 0) AS total_paid,
  COALESCE(SUM(ci.total_with_overtime) FILTER (WHERE ci.payment_status = 'pendente'), 0) AS total_pending,
  (ci.payment_due_date < CURRENT_DATE AND COUNT(*) FILTER (WHERE ci.payment_status = 'pendente') > 0) AS is_overdue
FROM cost_items ci
JOIN jobs j ON j.id = ci.job_id AND j.deleted_at IS NULL  -- <<< ADICIONAR ESTE FILTRO
WHERE ci.deleted_at IS NULL
  AND ci.is_category_header = false
  AND ci.payment_due_date IS NOT NULL
GROUP BY ci.tenant_id, ci.payment_due_date, ci.job_id, j.code, j.title
ORDER BY ci.payment_due_date ASC;
```

**Prioridade:** LOW

---

## 4. Resumo Priorizado

| # | Problema | Prioridade | Fix |
|---|----------|------------|-----|
| R-01 | cost_items.item_number sem FK para cost_categories | CRITICAL | Adicionar cost_category_id UUID FK |
| R-02 | UNIQUE de cost_categories nao respeita soft-delete | HIGH | Converter para partial unique index |
| R-03 | cost_items sem UNIQUE para (job, item, sub_item) | HIGH | Criar partial unique index |
| R-07 | vendors sem UNIQUE em CPF/CNPJ por tenant | MEDIUM | Criar partial unique indices |
| R-04 | sub_item_number sem CHECK | MEDIUM | Adicionar CHECK 0-999 |
| R-05 | Ausencia de DELETE RLS policies | MEDIUM | Adicionar FOR DELETE policies |
| R-08 | bank_accounts cross-tenant possivel | MEDIUM | Trigger de validacao |
| R-06 | display_name sem limite de comprimento | LOW | CHECK char_length |
| R-09 | Duas funcoes de updated_at trigger | LOW | Documentar padrao |
| R-10 | View calendario nao filtra jobs soft-deleted | LOW | Adicionar j.deleted_at IS NULL |

---

## 5. Observacoes Adicionais

### 5.1 Decisao de design: item_number como integer vs FK

O design atual usa `item_number` (integer) como "chave logica" entre cost_categories e cost_items. Isso tem vantagens:
- Simplicidade na importacao de dados historicos (basta informar o numero)
- Performance (join por integer vs UUID)
- Flexibilidade (cost_items pode ter item_number que nao existe em cost_categories)

E desvantagens:
- Sem integridade referencial
- Sem cascata de operacoes
- Impossivel rastrear qual template gerou qual item

A recomendacao R-01 (Opcao A) resolve isso adicionando `cost_category_id` como FK OPCIONAL, mantendo `item_number` como coluna de dados. Assim:
- `item_number` continua existindo para ordenacao e agrupamento
- `cost_category_id` garante rastreabilidade quando aplicavel
- Dados importados podem ter cost_category_id NULL (import historico)

### 5.2 Estado dos dados

Como nao tenho acesso direto ao banco (falta service_role token), nao foi possivel verificar:
- Se a migration 019 ja foi aplicada
- Se ha dados existentes nas tabelas
- Se ha inconsistencias nos dados reais

Recomendo executar as seguintes queries de diagnostico apos confirmar que a migration foi aplicada:

```sql
-- Verificar se ha cost_items com item_number que nao existe em cost_categories
SELECT DISTINCT ci.item_number, ci.tenant_id
FROM cost_items ci
WHERE ci.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cost_categories cc
    WHERE cc.tenant_id = ci.tenant_id
      AND cc.item_number = ci.item_number
      AND cc.deleted_at IS NULL
  );

-- Verificar cost_items duplicados (mesmo job + item + sub_item)
SELECT tenant_id, job_id, item_number, sub_item_number, COUNT(*)
FROM cost_items
WHERE deleted_at IS NULL
GROUP BY tenant_id, job_id, item_number, sub_item_number
HAVING COUNT(*) > 1;

-- Verificar sub_items orfaos (sem header)
SELECT ci.tenant_id, ci.job_id, ci.item_number, ci.sub_item_number
FROM cost_items ci
WHERE ci.deleted_at IS NULL
  AND ci.sub_item_number > 0
  AND NOT EXISTS (
    SELECT 1 FROM cost_items header
    WHERE header.tenant_id = ci.tenant_id
      AND header.job_id = ci.job_id
      AND header.item_number = ci.item_number
      AND header.sub_item_number = 0
      AND header.deleted_at IS NULL
  );

-- Verificar vendors com mesmo CPF no mesmo tenant
SELECT tenant_id, cpf, COUNT(*), array_agg(full_name)
FROM vendors
WHERE cpf IS NOT NULL AND deleted_at IS NULL
GROUP BY tenant_id, cpf
HAVING COUNT(*) > 1;

-- Verificar bank_accounts com tenant_id divergente do vendor
SELECT ba.id, ba.tenant_id AS ba_tenant, v.tenant_id AS vendor_tenant
FROM bank_accounts ba
JOIN vendors v ON v.id = ba.vendor_id
WHERE ba.tenant_id != v.tenant_id;
```

### 5.3 Ordem de implementacao sugerida para os fixes

1. **R-02** (UNIQUE soft-delete) -- corrigir antes de popular dados
2. **R-03** (UNIQUE cost_items) -- corrigir antes de popular dados
3. **R-01** (FK cost_category_id) -- requer decisao do Tech Lead sobre Opcao A vs B
4. **R-07** (UNIQUE vendors CPF/CNPJ) -- corrigir antes da migracao de EQUIPE.csv
5. **R-04, R-05, R-06** -- podem ser aplicados a qualquer momento
6. **R-08, R-09, R-10** -- baixa urgencia, aplicar no proximo batch de fixes
