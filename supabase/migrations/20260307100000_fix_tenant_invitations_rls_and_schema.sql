-- Fix tenant_invitations: add missing updated_at, fix RLS policies to use auth.uid() pattern

-- 1. Add missing updated_at column
ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Add updated_at trigger (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_tenant_invitations'
  ) THEN
    CREATE TRIGGER set_updated_at_tenant_invitations
      BEFORE UPDATE ON public.tenant_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;

-- 3. Drop broken RLS policies that use jwt.claims (tenant_id not in JWT)
DROP POLICY IF EXISTS "tenant_invitations_tenant_isolation" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update" ON public.tenant_invitations;

-- 4. Create correct RLS policies using auth.uid() + profiles join (same as other tables)

-- SELECT: any user in the same tenant can see invitations
CREATE POLICY "tenant_invitations_select"
  ON public.tenant_invitations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- INSERT: only admin/ceo can create invitations
CREATE POLICY "tenant_invitations_insert"
  ON public.tenant_invitations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'ceo')
    )
  );

-- UPDATE: only admin/ceo can update invitations
CREATE POLICY "tenant_invitations_update"
  ON public.tenant_invitations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'ceo')
    )
  );

-- DELETE: only admin/ceo can delete invitations
CREATE POLICY "tenant_invitations_delete"
  ON public.tenant_invitations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'ceo')
    )
  );

-- 5. Add missing indices
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id
  ON public.tenant_invitations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token
  ON public.tenant_invitations(token);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_invited_by
  ON public.tenant_invitations(invited_by);
