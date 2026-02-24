
-- D1: UNIQUE CNPJ por tenant (permite NULL, mas se preenchido, deve ser unico no tenant)
-- Usando partial unique index para ignorar NULLs e soft-deletes
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cnpj_tenant_unique 
  ON public.clients (tenant_id, cnpj) 
  WHERE cnpj IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_cnpj_tenant_unique 
  ON public.agencies (tenant_id, cnpj) 
  WHERE cnpj IS NOT NULL AND deleted_at IS NULL;

-- D2: Contacts XOR constraint — contato deve ter client_id OU agency_id, nao ambos
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS chk_contacts_entity_xor;
ALTER TABLE public.contacts 
  ADD CONSTRAINT chk_contacts_entity_xor 
  CHECK (
    (client_id IS NOT NULL AND agency_id IS NULL) OR 
    (client_id IS NULL AND agency_id IS NOT NULL)
  );

-- D3: Financial records — amount deve ser positivo
ALTER TABLE public.financial_records 
  DROP CONSTRAINT IF EXISTS chk_financial_records_amount_positive;
ALTER TABLE public.financial_records 
  ADD CONSTRAINT chk_financial_records_amount_positive 
  CHECK (amount > 0);

-- D3: Budget items — quantity e unit_value devem ser positivos
ALTER TABLE public.budget_items 
  DROP CONSTRAINT IF EXISTS chk_budget_items_quantity_positive;
ALTER TABLE public.budget_items 
  ADD CONSTRAINT chk_budget_items_quantity_positive 
  CHECK (quantity > 0);

ALTER TABLE public.budget_items 
  DROP CONSTRAINT IF EXISTS chk_budget_items_unit_value_positive;
ALTER TABLE public.budget_items 
  ADD CONSTRAINT chk_budget_items_unit_value_positive 
  CHECK (unit_value >= 0);
