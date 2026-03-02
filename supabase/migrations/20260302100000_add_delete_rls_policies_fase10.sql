-- Migration: Adicionar DELETE RLS policies para tabelas da Fase 10
-- Findings: FASE10-ALTO-001 — tabelas financeiras sem policy FOR DELETE
-- Apenas admin/ceo podem deletar registros financeiros criticos

SET search_path TO public;

-- cost_categories: admin, ceo, financeiro podem deletar categorias
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cost_categories_delete' AND tablename = 'cost_categories'
  ) THEN
    CREATE POLICY cost_categories_delete ON cost_categories
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo', 'financeiro')
      );
  END IF;
END $$;

-- vendors: admin, ceo, financeiro podem deletar vendors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vendors_delete' AND tablename = 'vendors'
  ) THEN
    CREATE POLICY vendors_delete ON vendors
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo', 'financeiro')
      );
  END IF;
END $$;

-- bank_accounts: admin, ceo, financeiro podem deletar contas bancarias
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'bank_accounts_delete' AND tablename = 'bank_accounts'
  ) THEN
    CREATE POLICY bank_accounts_delete ON bank_accounts
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo', 'financeiro')
      );
  END IF;
END $$;

-- cost_items: admin, ceo podem deletar itens de custo (mais restritivo)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cost_items_delete' AND tablename = 'cost_items'
  ) THEN
    CREATE POLICY cost_items_delete ON cost_items
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
      );
  END IF;
END $$;

-- cash_advances: admin, ceo podem deletar adiantamentos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cash_advances_delete' AND tablename = 'cash_advances'
  ) THEN
    CREATE POLICY cash_advances_delete ON cash_advances
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
      );
  END IF;
END $$;

-- expense_receipts: admin, ceo, financeiro podem deletar comprovantes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'expense_receipts_delete' AND tablename = 'expense_receipts'
  ) THEN
    CREATE POLICY expense_receipts_delete ON expense_receipts
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo', 'financeiro')
      );
  END IF;
END $$;

-- financial_records: admin, ceo podem deletar registros financeiros
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'financial_records_delete' AND tablename = 'financial_records'
  ) THEN
    CREATE POLICY financial_records_delete ON financial_records
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
      );
  END IF;
END $$;

-- invoices: admin, ceo podem deletar notas fiscais
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'invoices_delete' AND tablename = 'invoices'
  ) THEN
    CREATE POLICY invoices_delete ON invoices
      FOR DELETE USING (
        tenant_id = public.get_tenant_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
      );
  END IF;
END $$;
