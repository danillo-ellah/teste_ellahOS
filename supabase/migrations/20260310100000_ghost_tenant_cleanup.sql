-- =============================================================================
-- Migration: Cleanup automatico de tenants fantasmas
-- Data: 2026-03-10
--
-- Contexto:
--   Quando alguem faz signup mas NAO confirma o email, o trigger
--   handle_new_user cria um tenant + profile que ficam abandonados no banco.
--   Esta migration cria uma function SECURITY DEFINER que identifica e remove
--   esses "tenants fantasmas" automaticamente.
--
-- Criterios para considerar um tenant como fantasma (TODOS devem ser verdadeiros):
--   1. onboarding_completed = false
--   2. Criado ha mais de 48 horas
--   3. O admin (unico profile) tem email NAO confirmado em auth.users
--   4. Nenhum job criado nesse tenant
--   5. Apenas 1 profile (o admin criado pelo trigger)
--
-- Operacoes:
--   1. CREATE OR REPLACE FUNCTION fn_cleanup_ghost_tenants() — SECURITY DEFINER
--   2. Opcionalmente agenda via pg_cron (se disponivel)
--
-- Estrategia de delecao:
--   - DELETE auth.users (CASCADE limpa profiles via FK)
--   - DELETE tenants (sem dependencias restantes num ghost tenant)
--   - Se auth.users nao puder ser deletado, deleta profiles + tenants no public
--
-- Chamada:
--   - Via pg_cron (se agendado): automatico diario as 03h UTC (00h BRT)
--   - Via n8n: POST para Edge Function que chama SELECT fn_cleanup_ghost_tenants()
--   - Via SQL manual: SELECT fn_cleanup_ghost_tenants()
--
-- Idempotencia:
--   - CREATE OR REPLACE FUNCTION
--   - cron.unschedule com bloco EXCEPTION
--   - Multiplas execucoes nao causam efeito colateral (sem dados = sem delecao)
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 1. Function principal: identifica e remove tenants fantasmas
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_cleanup_ghost_tenants()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ghost RECORD;
  v_deleted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_errors TEXT[] := '{}';
  v_start_time TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Iterar sobre tenants candidatos a fantasma
  FOR v_ghost IN
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      t.created_at AS tenant_created_at,
      p.id AS profile_id,
      p.email AS profile_email,
      au.email_confirmed_at
    FROM tenants t
    -- Join com profiles: pegar o unico profile do tenant
    INNER JOIN profiles p ON p.tenant_id = t.id AND p.deleted_at IS NULL
    -- Join com auth.users para verificar confirmacao de email
    INNER JOIN auth.users au ON au.id = p.id
    WHERE
      -- Criterio 1: onboarding nao concluido
      t.onboarding_completed = false
      -- Criterio 2: criado ha mais de 48 horas
      AND t.created_at < (now() - INTERVAL '48 hours')
      -- Criterio 3: email NAO confirmado
      AND au.email_confirmed_at IS NULL
      -- Criterio 4: nenhum job criado nesse tenant
      AND NOT EXISTS (
        SELECT 1 FROM jobs j WHERE j.tenant_id = t.id
      )
      -- Criterio 5: apenas 1 profile no tenant (o admin do signup)
      AND (
        SELECT count(*) FROM profiles p2
        WHERE p2.tenant_id = t.id AND p2.deleted_at IS NULL
      ) = 1
      -- Criterio extra: tenant nao foi soft-deleted
      AND t.deleted_at IS NULL
  LOOP
    BEGIN
      -- Passo 1: Tentar deletar o auth.users
      -- Isso fara CASCADE para profiles (profiles.id REFERENCES auth.users ON DELETE CASCADE)
      DELETE FROM auth.users WHERE id = v_ghost.profile_id;

      -- Passo 2: Deletar o tenant (agora sem profiles referenciando)
      -- Verificacao de seguranca: garantir que nao restou nenhum profile orfao
      -- (pode acontecer se houver profiles com deleted_at != NULL que nao foram limpos)
      DELETE FROM profiles WHERE tenant_id = v_ghost.tenant_id;
      DELETE FROM tenants WHERE id = v_ghost.tenant_id;

      v_deleted_count := v_deleted_count + 1;

      RAISE LOG '[ghost_cleanup] Tenant fantasma removido: id=%, name="%", email=%, criado_em=%',
        v_ghost.tenant_id, v_ghost.tenant_name, v_ghost.profile_email, v_ghost.tenant_created_at;

    EXCEPTION
      WHEN OTHERS THEN
        -- Se falhar (ex: FK violation inesperada), logar e continuar
        v_skipped_count := v_skipped_count + 1;
        v_errors := array_append(v_errors,
          format('tenant_id=%s, erro=%s', v_ghost.tenant_id, SQLERRM)
        );

        RAISE WARNING '[ghost_cleanup] Erro ao remover tenant %: %',
          v_ghost.tenant_id, SQLERRM;
    END;
  END LOOP;

  RAISE LOG '[ghost_cleanup] Concluido: % removidos, % ignorados, duracao=%ms',
    v_deleted_count, v_skipped_count,
    extract(milliseconds FROM clock_timestamp() - v_start_time)::integer;

  -- Retornar resultado estruturado (util para monitoramento via n8n ou EF)
  RETURN jsonb_build_object(
    'deleted_count', v_deleted_count,
    'skipped_count', v_skipped_count,
    'errors', to_jsonb(v_errors),
    'executed_at', now(),
    'duration_ms', extract(milliseconds FROM clock_timestamp() - v_start_time)::integer
  );
END;
$$;

COMMENT ON FUNCTION fn_cleanup_ghost_tenants() IS
  'Remove tenants fantasmas: signup sem confirmacao de email, sem jobs, sem onboarding, criados ha mais de 48h. '
  'Retorna JSON com contagem de removidos/ignorados. Pode ser chamada via pg_cron, n8n ou manualmente.';

-- =============================================================================
-- 2. Agendar via pg_cron (opcional — pode falhar se limite de jobs atingido)
--    Executa diariamente as 03:00 UTC (00:00 BRT)
--    Se pg_cron nao estiver disponivel ou limite atingido, a function ainda
--    pode ser chamada via n8n ou Edge Function.
-- =============================================================================

DO $$
BEGIN
  -- Remover agendamento anterior se existir (idempotencia)
  PERFORM cron.unschedule('ghost-tenant-cleanup');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Agendar execucao diaria as 03:00 UTC (00:00 BRT)
  PERFORM cron.schedule(
    'ghost-tenant-cleanup',
    '0 3 * * *',
    'SELECT fn_cleanup_ghost_tenants()'
  );

  RAISE LOG '[ghost_cleanup] pg_cron job agendado com sucesso: diario as 03:00 UTC';
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron indisponivel ou limite de jobs atingido
    -- A function fn_cleanup_ghost_tenants() ainda pode ser chamada manualmente
    -- ou via n8n/Edge Function
    RAISE WARNING '[ghost_cleanup] pg_cron nao disponivel ou limite atingido (%). '
      'Use n8n ou Edge Function para chamar fn_cleanup_ghost_tenants() periodicamente.',
      SQLERRM;
END $$;

-- =============================================================================
-- 3. Verificacao pos-migration
-- =============================================================================
-- Para verificar se o job foi criado:
--   SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'ghost-tenant-cleanup';
--
-- Para testar a function manualmente (sem deletar nada se nao houver fantasmas):
--   SELECT fn_cleanup_ghost_tenants();
--
-- Para ver quantos tenants fantasmas existem ANTES de rodar:
--   SELECT t.id, t.name, t.created_at, p.email, au.email_confirmed_at
--   FROM tenants t
--   INNER JOIN profiles p ON p.tenant_id = t.id AND p.deleted_at IS NULL
--   INNER JOIN auth.users au ON au.id = p.id
--   WHERE t.onboarding_completed = false
--     AND t.created_at < (now() - INTERVAL '48 hours')
--     AND au.email_confirmed_at IS NULL
--     AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.tenant_id = t.id)
--     AND (SELECT count(*) FROM profiles p2 WHERE p2.tenant_id = t.id AND p2.deleted_at IS NULL) = 1
--     AND t.deleted_at IS NULL;
-- =============================================================================
