# AUDITORIA DE SEGURANCA - ONDA 1.5 MULTI-TENANT SIGNUP
**Data:** 2026-03-09
**Auditor:** Security Engineer ELLAHOS
**Supabase Project:** etvapcxesaxhsvzgaane
**Escopo:** signup/page.tsx, onboarding/page.tsx, useOnboarding.ts, EF onboarding (5 handlers), migrations 20260309120000 e 20260309110000, middleware.ts, layout.tsx, api.ts

---

## RESUMO EXECUTIVO

0 CRITICOS | 2 ALTOS | 5 MEDIOS | 4 BAIXOS — **10 de 11 CORRIGIDOS** (2026-03-10)

Base solida: JWT validado server-side em todas as rotas via getAuthContext(), RLS usando get_tenant_id() do JWT (nunca do body), Zod em todos os handlers PATCH, CORS dinamico com allowlist.

---

## FINDINGS ALTOS

### ONDA15-ALTO-001: Tenant criado antes da confirmacao de email

**Classificacao:** ALTA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linhas 35-113
**Status:** **CORRIGIDO** (2026-03-10)

O trigger on_auth_user_created dispara no AFTER INSERT ON auth.users - imediatamente no signup,
ANTES da confirmacao de email. Qualquer pessoa pode criar N tenants com emails invalidos ou de
terceiros sem confirmar nenhum. Cada signup cria tenant + profile permanentes no banco.

**Correcao aplicada:** fn_cleanup_ghost_tenants() (SECURITY DEFINER) + pg_cron diario as 03:00 UTC.
Remove tenants fantasmas com 5 criterios de seguranca: onboarding_completed=false, criado ha 48h+,
email NAO confirmado, 0 jobs, apenas 1 profile. Migration: 20260310100000_ghost_tenant_cleanup.sql.

---

### ONDA15-ALTO-002: Middleware com catch vazio - fail open em falha de autenticacao

**Classificacao:** ALTA
**OWASP:** A05 - Security Misconfiguration
**Arquivo:** frontend/src/lib/supabase/middleware.ts linhas 79-83
**Status:** **CORRIGIDO** (2026-03-10)

O bloco catch retorna NextResponse.next() se o Supabase estiver indisponivel ou lancar excecao.
**Correcao:** catch agora redireciona para /login exceto rotas publicas conhecidas (fail-closed).

---

## FINDINGS MEDIOS

### ONDA15-MEDIO-001: JWT sem tenant_id na primeira sessao imediata pos-signup

**Classificacao:** MEDIA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linhas 88-92 + signup/page.tsx linha 96
**Status:** **CORRIGIDO** (2026-03-10)

**Correcao:** signup/page.tsx agora chama supabase.auth.refreshSession() apos signup bem-sucedido,
antes de redirecionar para /onboarding. JWT atualizado inclui tenant_id e role.

---

### ONDA15-MEDIO-002: company_name sem limite de tamanho server-side

**Classificacao:** MEDIA
**OWASP:** A03 - Injection (data integrity)
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linha 47
**Status:** **CORRIGIDO** (2026-03-10)

**Correcao:** trigger sanitiza com left(trim(), 100). Coluna company_name duplicada removida do INSERT.

---

### ONDA15-MEDIO-003: logo_url aceita qualquer URL sem validacao de dominio

**Classificacao:** MEDIA
**OWASP:** A10 - Server-Side Request Forgery (parcial)
**Arquivo:** supabase/functions/onboarding/handlers/update-company.ts linha 13
**Status:** **CORRIGIDO** (2026-03-10)

**Correcao:** update-company.ts agora valida HTTPS-only e bloqueia IPs privados/localhost em logo_url.

---

### ONDA15-MEDIO-004: Redirect de onboarding client-side - bypassavel

**Classificacao:** MEDIA
**OWASP:** A01 - Broken Access Control
**Arquivo:** frontend/src/app/(dashboard)/layout.tsx linhas 43-68
**Status:** **CORRIGIDO** (2026-03-10)

**Correcao:** onboarding/page.tsx agora verifica onboarding_completed e redireciona para /dashboard
se ja concluido. Guard impede reacesso ao wizard.

---

### ONDA15-MEDIO-005: Logs de producao expoem userId e tenantId em cada request

**Classificacao:** MEDIA
**OWASP:** A09 - Security Logging and Monitoring Failures
**Arquivo:** supabase/functions/onboarding/index.ts linhas 45-51 e todos os 5 handlers
**Status:** **CORRIGIDO** (2026-03-10)

**Correcao:** logs truncados para id.substring(0, 8) em todos os handlers. Role removido dos logs.

---

## FINDINGS BAIXOS

### ONDA15-BAIXO-001: Senha minima de 6 caracteres
**Classificacao:** BAIXA | **Status:** **CORRIGIDO** (2026-03-10)
**Arquivo:** frontend/src/app/(auth)/signup/page.tsx
**Correcao:** minimo alterado para 8 caracteres no frontend.

### ONDA15-BAIXO-002: CNPJ sem validacao de digitos verificadores no backend
**Classificacao:** BAIXA | **Status:** **CORRIGIDO** (2026-03-10)
**Arquivo:** supabase/functions/onboarding/handlers/update-company.ts
**Correcao:** algoritmo de digitos verificadores implementado (isValidCnpj) no frontend e backend.

### ONDA15-BAIXO-003: Email enumeration via mensagem diferenciada no signup
**Classificacao:** BAIXA | **Status:** **CORRIGIDO** (2026-03-10)
**Arquivo:** frontend/src/app/(auth)/signup/page.tsx
**Correcao:** mensagem generica para todos os erros de signup (nao revela se email existe).

### ONDA15-BAIXO-004: Cache de token singleton em api.ts - risco SSR
**Classificacao:** BAIXA | **Status:** ABERTO
**Arquivo:** frontend/src/lib/api.ts linhas 66-103
_cachedToken e _cachedTokenExp sao variaveis de modulo singleton. Se api.ts for importado em
Server Components ou Server Actions no futuro, token pode vazar entre usuarios no mesmo processo.
Documentar explicitamente como client-only.

---

## PONTOS POSITIVOS

1. JWT validado server-side em 100% das rotas via getAuthContext()
2. tenant_id extraido do JWT (app_metadata), nunca do body do request
3. RLS ativo em todas as tabelas com get_tenant_id() do JWT
4. Zod em todos os handlers PATCH (company, profile, integrations)
5. CORS dinamico com allowlist de origens - nao wildcard
6. SECURITY DEFINER com SET search_path fixo no trigger
7. Slug unico com UUID hash para isolamento de tenant
8. Role admin setado via trigger no JWT, nao via request do cliente
9. Verificacao de role (ADMIN_ROLES) em todos os 5 handlers da EF
10. getSupabaseClient() usa token do usuario (RLS ativo), nao service_role

---

## TABELA RESUMO

| ID | Severidade | Descricao | Status |
|----|------------|-----------|--------|
| ONDA15-ALTO-001 | ALTA | Tenant criado antes da confirmacao de email | **CORRIGIDO** (2026-03-10) — fn_cleanup_ghost_tenants() + pg_cron |
| ONDA15-ALTO-002 | ALTA | Middleware catch vazio - fail open em falha de auth | **CORRIGIDO** (2026-03-10) |
| ONDA15-MEDIO-001 | MEDIA | JWT sem tenant_id na primeira sessao pos-signup | **CORRIGIDO** (2026-03-10) |
| ONDA15-MEDIO-002 | MEDIA | company_name sem limite de tamanho server-side | **CORRIGIDO** (2026-03-10) |
| ONDA15-MEDIO-003 | MEDIA | logo_url aceita qualquer URL sem validacao de dominio | **CORRIGIDO** (2026-03-10) |
| ONDA15-MEDIO-004 | MEDIA | Redirect onboarding client-side bypassavel | **CORRIGIDO** (2026-03-10) |
| ONDA15-MEDIO-005 | MEDIA | Logs expoem userId/tenantId em producao | **CORRIGIDO** (2026-03-10) |
| ONDA15-BAIXO-001 | BAIXA | Senha minima 6 chars - abaixo do recomendado | **CORRIGIDO** (2026-03-10) |
| ONDA15-BAIXO-002 | BAIXA | CNPJ sem validacao de digitos verificadores | **CORRIGIDO** (2026-03-10) |
| ONDA15-BAIXO-003 | BAIXA | Email enumeration via mensagem diferenciada | **CORRIGIDO** (2026-03-10) |
| ONDA15-BAIXO-004 | BAIXA | Cache de token singleton em api.ts - risco SSR | ABERTO (baixo risco, doc-only) |