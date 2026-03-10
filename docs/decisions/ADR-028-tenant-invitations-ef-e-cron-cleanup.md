# ADR-028: EF tenant-invitations (integrada ao onboarding) + CRON cleanup de tenants fantasmas

**Status:** Aceito
**Data:** 2026-03-10
**Autor:** Tech Lead ELLAHOS

---

## Contexto

A Onda 1.5 implementou multi-tenant signup com onboarding wizard (5 passos). O passo 3 permite ao admin adicionar emails + roles para convidar membros, mas atualmente os convites sao apenas salvos localmente no state do wizard -- nao ha envio real.

Paralelamente, ja existe uma EF `tenant-management` com handlers completos de invite (POST, GET, DELETE, accept). A tabela `tenant_invitations` ja existe no banco com RLS, indices e trigger de updated_at.

Alem disso, o finding ONDA15-ALTO-001 identifica que o trigger `on_auth_user_created` cria tenants ANTES da confirmacao de email, gerando tenants fantasmas quando o usuario nao confirma.

## Decisao

### Feature 1: Integrar onboarding wizard com tenant-management (NAO criar nova EF)

**A EF `tenant-invitations` NAO sera criada como Edge Function separada.** Os endpoints ja existem em `tenant-management`:

| Operacao | Rota existente | Handler |
|----------|---------------|---------|
| Criar convite | `POST /tenant-management/invitations` | `invite.ts` |
| Listar convites | `GET /tenant-management/invitations` | `list-invitations.ts` |
| Cancelar convite | `DELETE /tenant-management/invitations/:id` | `revoke-invitation.ts` |
| Aceitar convite | `POST /tenant-management/invitations/accept` | `accept-invitation.ts` |
| Ver detalhes (publico) | `GET /tenant-management/invitations/details?token=X` | inline no index.ts |

O que falta e apenas **conectar o frontend do onboarding ao backend existente**.

### Feature 2: CRON cleanup via pg_cron (SQL puro, sem EF)

Seguir o padrao do projeto: `daily-deadline-alerts` ja roda como SQL puro dentro de pg_cron. O cleanup tambem sera SQL puro, sem Edge Function.

---

## Plano Tecnico Detalhado

---

### PARTE 1: Conectar Onboarding ao tenant-management/invitations

#### 1.1 Problema atual (passo 3 do wizard)

No `onboarding/page.tsx` linhas 775-784, o passo 3 apenas salva os convites localmente e mostra um toast:

```typescript
// Convites salvos localmente — envio real sera implementado
if (wizardState.invites.length > 0) {
  toast.success(`${wizardState.invites.length} convite(s) salvo(s)...`)
}
```

Nenhuma chamada HTTP e feita.

#### 1.2 Solucao

Alterar o passo 3 para chamar `POST /tenant-management/invitations` para cada convite da lista. O endpoint ja:
- Valida email (Zod)
- Verifica duplicatas (mesmo email + tenant + nao aceito + nao expirado)
- Gera token UUID
- Envia email via Resend (se RESEND_API_KEY configurada)
- Retorna accept_url e email_sent

#### 1.3 Alteracoes necessarias no frontend

**Arquivo:** `frontend/src/app/onboarding/page.tsx`

1. Importar `apiMutate` (ou usar fetch direto com token do Supabase)
2. No `handleNext` do passo 3, iterar sobre `wizardState.invites` e chamar POST para cada um
3. Tratar erros parciais (se 3 de 5 falharem, informar quais falharam)
4. Nao bloquear avanco -- se o envio falhar, permitir seguir (passo e opcional)

**Logica proposta:**

```typescript
} else if (currentStep === 3) {
  if (wizardState.invites.length > 0) {
    const results = await Promise.allSettled(
      wizardState.invites.map(inv =>
        fetch(`${SUPABASE_URL}/functions/v1/tenant-management/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ email: inv.email, role: inv.role }),
        }).then(res => res.json())
      )
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    if (sent > 0) toast.success(`${sent} convite(s) enviado(s)`)
    if (failed > 0) toast.warning(`${failed} convite(s) falharam`)
  }
  markCompleted(3)
  setCurrentStep(4)
}
```

#### 1.4 Fix de roles desalinhados (finding do review)

O INVITE_ROLES no onboarding usa valores que NAO existem no ENUM `user_role`:

| Onboarding INVITE_ROLES | ENUM user_role | invite.ts VALID_ROLES |
|------------------------|----------------|----------------------|
| `coordenador` | `coordenador` | `coordenador_producao` |

O ENUM real e `coordenador` (migration 001_enums.sql). Porem o invite.ts usa `coordenador_producao` que NAO existe no ENUM. **O bug esta no invite.ts, nao no onboarding.**

**Correcao no invite.ts:**
- Remover `coordenador_producao` do VALID_ROLES
- Adicionar `coordenador` (alinhado com ENUM)
- Adicionar `atendimento` e `comercial` (faltam no VALID_ROLES mas existem no ENUM)
- Remover `assistente` e `membro` (NAO existem no ENUM)

VALID_ROLES corrigido:
```typescript
const VALID_ROLES = [
  'admin', 'ceo', 'produtor_executivo', 'coordenador',
  'diretor', 'financeiro', 'atendimento', 'comercial', 'freelancer',
] as const;
```

#### 1.5 Fluxo do convidado

O fluxo ja esta 100% implementado:

1. Admin convida via wizard ou via `/settings/team`
2. Email enviado via Resend com link `https://teste-ellah-os.vercel.app/invite/{token}`
3. Convidado abre link -> pagina `/(auth)/invite/[token]/page.tsx`
4. Se nao logado: redireciona para login com `returnUrl=/invite/{token}`
5. Se logado: botao "Aceitar Convite" -> POST `/tenant-management/invitations/accept`
6. Backend marca `accepted_at` e `accepted_by`

**Lacuna critica no fluxo de aceite:** O `accept-invitation.ts` marca o convite como aceito mas NAO cria o profile no tenant do convidado. O usuario precisa ser vinculado ao tenant.

**Correcao necessaria no accept-invitation.ts:**

Apos marcar `accepted_at`, o handler precisa:

1. Verificar se o usuario ja tem profile neste tenant (idempotencia)
2. Se nao tem: criar profile com `tenant_id` do convite, `role` do convite, dados do auth.users
3. Atualizar `raw_app_meta_data` do usuario para incluir `tenant_id` + `role` (para que o JWT futuro tenha esses dados)
4. Usar service client (bypass RLS) pois o usuario nao pertence ao tenant ainda

```typescript
// Apos marcar accepted_at:

// 1. Verificar se profile ja existe
const { data: existingProfile } = await service
  .from('profiles')
  .select('id')
  .eq('id', resolvedUserId)
  .eq('tenant_id', invitation.tenant_id)
  .maybeSingle();

if (!existingProfile && resolvedUserId) {
  // 2. Buscar dados do usuario
  const { data: { user } } = await service.auth.admin.getUserById(resolvedUserId);

  // 3. Criar profile
  await service.from('profiles').insert({
    id: resolvedUserId,
    tenant_id: invitation.tenant_id,
    email: user?.email ?? invitation.email ?? '',
    full_name: user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '',
    role: invitation.role,
  });

  // 4. Atualizar app_metadata para JWT
  await service.auth.admin.updateUserById(resolvedUserId, {
    app_metadata: {
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    },
  });
}
```

**NOTA:** Isso assume single-tenant por usuario (um usuario pertence a um tenant). Se multi-tenant por usuario for necessario no futuro (Onda 4), esta logica sera revisitada.

---

### PARTE 2: CRON Cleanup de Tenants Fantasmas

#### 2.1 Abordagem: pg_cron com SQL puro

**Justificativa:**
- O projeto ja usa pg_cron para `daily-deadline-alerts` e `process-integration-queue`
- SQL puro evita dependencia de Edge Function (CRON_SECRET, HTTP)
- Cleanup e operacao interna sem necessidade de logica de negocio complexa
- **ATENCAO:** Supabase Free tier tem limite de 2 cron jobs -- ja estamos no limite. Precisamos verificar se o cleanup pode ser agregado ao job existente ou se precisamos upgrade

**Decisao sobre limite de cron jobs:**
- Opcao A: Agregar o cleanup como CTE adicional dentro do `daily-deadline-alerts` (executa 1x/dia as 11h UTC)
- Opcao B: Substituir o `process-integration-queue` (que roda a cada minuto) por um job que faz ambas as coisas
- Opcao C: Usar EF com CRON_SECRET chamada via `process-integration-queue` existente

**Recomendacao: Opcao A** -- agregar ao `daily-deadline-alerts`. O cleanup nao precisa rodar mais que 1x/dia e nao ha urgencia em limpar tenants fantasmas (48h de tolerancia).

#### 2.2 Query SQL para identificar tenants fantasmas

```sql
-- Identificar tenants fantasmas:
-- 1. Tenant criado ha mais de 48h
-- 2. Dono (unico profile com role='admin') tem auth.users.email_confirmed_at IS NULL
-- 3. Tenant NAO tem onboarding_completed = true
-- 4. Tenant NAO tem nenhum job criado (para seguranca extra)

WITH ghost_tenants AS (
  SELECT t.id AS tenant_id
  FROM tenants t
  INNER JOIN profiles p ON p.tenant_id = t.id AND p.role = 'admin'
  INNER JOIN auth.users u ON u.id = p.id
  WHERE t.onboarding_completed = false
    AND t.created_at < (now() - INTERVAL '48 hours')
    AND u.email_confirmed_at IS NULL
    -- Seguranca: nao deletar tenants que ja tem dados
    AND NOT EXISTS (
      SELECT 1 FROM jobs j WHERE j.tenant_id = t.id AND j.deleted_at IS NULL
    )
    -- Nao ter outros membros alem do admin (alguem aceitou convite)
    AND (SELECT count(*) FROM profiles p2 WHERE p2.tenant_id = t.id) = 1
)
```

#### 2.3 Cascading cleanup

A tabela `tenants` ja tem `ON DELETE CASCADE` em todas as FKs:
- `profiles` -> CASCADE
- `tenant_invitations` -> CASCADE
- `jobs` (nao tera nenhum, verificado na query)
- `tenant_settings` e qualquer tabela com FK para tenants -> CASCADE

**Porem**, precisamos tambem limpar o auth.users:

```sql
-- Cleanup completo:
-- 1. Deletar o auth.user (via service role -- pg_cron roda como superuser)
-- 2. O CASCADE do tenant limpa profiles, invitations, etc.

DELETE FROM auth.users
WHERE id IN (
  SELECT p.id
  FROM ghost_tenants gt
  INNER JOIN profiles p ON p.tenant_id = gt.tenant_id AND p.role = 'admin'
);

DELETE FROM tenants
WHERE id IN (SELECT tenant_id FROM ghost_tenants);
```

**IMPORTANTE:** pg_cron roda com permissoes do postgres user, que tem acesso ao schema auth. Isso funciona sem necessidade de service role key.

#### 2.4 Migration: adicionar cleanup ao daily-deadline-alerts

Nova migration que faz `cron.unschedule('daily-deadline-alerts')` e `cron.schedule` com o SQL estendido, adicionando a CTE de cleanup no inicio.

Nome da migration: `20260310100000_add_ghost_tenant_cleanup_to_daily_cron.sql`

#### 2.5 Logs e observabilidade

O pg_cron loga execucoes em `cron.job_run_details`. Para monitorar:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-deadline-alerts')
ORDER BY start_time DESC
LIMIT 10;
```

Adicionar SELECT de contagem no final do cleanup CTE para que o log registre quantos tenants foram limpos.

---

### PARTE 3: Outros fixes necessarios (convergentes com audit)

#### 3.1 Fix na pagina de aceite de convite

A pagina `/(auth)/invite/[token]/page.tsx` funciona, mas o fluxo nao cria profile. O fix esta descrito em 1.5 acima (no backend accept-invitation.ts).

#### 3.2 Alinhamento de tenant_invitations.role com ENUM

A coluna `role` na tabela `tenant_invitations` e `text` (nao tipada como ENUM). Isso e intencional -- permite flexibilidade sem ALTER TYPE. A validacao acontece no Zod do handler.

---

## Consequencias

### Positivas
- Zero Edge Functions novas -- reutiliza infraestrutura existente
- Convites realmente enviados durante o onboarding (nao mais "placeholder")
- Tenants fantasmas limpos automaticamente sem intervencao manual
- Nenhum custo extra de cron job (reutiliza o existente)

### Negativas
- O daily-deadline-alerts fica mais complexo (mais CTEs)
- Se o cron falhar, tanto alertas quanto cleanup param (mas ja e assim)
- Single-tenant por usuario limita escalabilidade futura (Onda 4 revisitara)

### Riscos
- O DELETE de auth.users no pg_cron precisa ser testado cuidadosamente (verificar se CASCADE do Supabase Auth nao causa side effects)
- A query de ghost_tenants pode erroneamente pegar tenants legitimos se a heuristica for fraca -- por isso incluimos 3 safeguards: sem jobs, sem membros extras, sem onboarding completo

---

## Alternativas Consideradas

### 1. Criar EF `tenant-invitations` separada
**Rejeitada:** Duplicaria os endpoints ja existentes em `tenant-management`. Viola DRY. Os handlers de invite em tenant-management estao completos e funcionais.

### 2. Usar Supabase Auth inviteUserByEmail() para convites
**Rejeitada:** A funcao `inviteUserByEmail()` do Supabase Auth cria um auth.users pre-populado com magic link. Funciona para signup automatico, mas nao permite definir `app_metadata.tenant_id` no momento do invite (so no aceite). Alem disso, nao temos controle sobre o template do email -- o sistema ja usa Resend com template proprio.

### 3. EF separada com CRON_SECRET para cleanup
**Rejeitada:** Consumiria um cron job a mais (limite do Free tier ja atingido). SQL puro dentro do cron existente e mais simples e eficiente.

### 4. Mover trigger para AFTER UPDATE (email confirmado) em vez de CRON cleanup
**Considerada mas adiada:** Melhor solucao a longo prazo, mas requer refatoracao do signup flow inteiro (o frontend assume que o tenant ja existe apos signup). O CRON cleanup e uma solucao pragmatica para o curto prazo.

---

## Checklist de Implementacao

### Sprint 1: Backend fixes + CRON

- [ ] Fix `invite.ts` VALID_ROLES para alinhar com ENUM `user_role`
- [ ] Fix `accept-invitation.ts` para criar profile + atualizar app_metadata
- [ ] Migration: adicionar cleanup CTE ao `daily-deadline-alerts`
- [ ] Testar cleanup no banco local com dados de teste

### Sprint 2: Frontend integration

- [ ] Alterar passo 3 do onboarding para chamar POST /tenant-management/invitations
- [ ] Obter access_token do Supabase no wizard para Authorization header
- [ ] Tratar erros parciais (Promise.allSettled)
- [ ] Toast com resultado: N enviados, M falharam

### Sprint 3: QA

- [ ] Testar fluxo completo: signup -> onboarding -> convite -> email -> aceite -> login
- [ ] Testar cleanup: criar tenant fake -> esperar 48h (ou alterar timestamp) -> verificar delecao
- [ ] Verificar que tenants com dados NAO sao deletados
- [ ] Verificar que convites expirados NAO bloqueiam aceite de novos convites
