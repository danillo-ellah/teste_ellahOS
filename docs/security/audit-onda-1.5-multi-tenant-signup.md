# AUDITORIA DE SEGURANCA - ONDA 1.5 MULTI-TENANT SIGNUP
**Data:** 2026-03-09
**Auditor:** Security Engineer ELLAHOS
**Supabase Project:** etvapcxesaxhsvzgaane
**Escopo:** signup/page.tsx, onboarding/page.tsx, useOnboarding.ts, EF onboarding (5 handlers), migrations 20260309120000 e 20260309110000, middleware.ts, layout.tsx, api.ts

---

## RESUMO EXECUTIVO

0 CRITICOS | 2 ALTOS | 5 MEDIOS | 4 BAIXOS — **9 de 11 CORRIGIDOS** (2026-03-10)

Base solida: JWT validado server-side em todas as rotas via getAuthContext(), RLS usando get_tenant_id() do JWT (nunca do body), Zod em todos os handlers PATCH, CORS dinamico com allowlist.

---

## FINDINGS ALTOS

### ONDA15-ALTO-001: Tenant criado antes da confirmacao de email

**Classificacao:** ALTA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linhas 35-113
**Status:** ABERTO

O trigger on_auth_user_created dispara no AFTER INSERT ON auth.users - imediatamente no signup,
ANTES da confirmacao de email. Qualquer pessoa pode criar N tenants com emails invalidos ou de
terceiros sem confirmar nenhum. Cada signup cria tenant + profile permanentes no banco.

Cenario: POST /auth/v1/signup com company_name + email falso -> tenant criado -> abandonado.
Em escala: banco poluido com tenants fantasmas, consumo de storage e conexoes.

Correcao recomendada: mover logica de criacao para AFTER UPDATE que verifica
  NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL.
Alternativa: job de limpeza para tenants sem email confirmado apos 24h.

---

### ONDA15-ALTO-002: Middleware com catch vazio - fail open em falha de autenticacao

**Classificacao:** ALTA
**OWASP:** A05 - Security Misconfiguration
**Arquivo:** frontend/src/lib/supabase/middleware.ts linhas 79-83
**Status:** ABERTO

O bloco catch retorna NextResponse.next() se o Supabase estiver indisponivel ou lancar excecao.
Principio correto: fail closed (negar por padrao). Em degradacao parcial do Supabase,
rotas /jobs /financeiro /settings ficam acessiveis sem token valido.

Correcao: substituir por redirect para /login em caso de erro, exceto rotas publicas conhecidas.

---

## FINDINGS MEDIOS

### ONDA15-MEDIO-001: JWT sem tenant_id na primeira sessao imediata pos-signup

**Classificacao:** MEDIA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linhas 88-92 + signup/page.tsx linha 96
**Status:** ABERTO

O trigger faz UPDATE auth.users para inserir tenant_id em raw_app_meta_data. Quando o Supabase
retorna data.session imediatamente (sem confirmacao de email), o JWT foi emitido ANTES do UPDATE.
O token nao tem tenant_id. getAuthContext() retorna FORBIDDEN (403) na primeira chamada ao onboarding/status.

Correcao: forcar refresh do token antes de redirecionar para /onboarding (supabase.auth.refreshSession()).

---

### ONDA15-MEDIO-002: company_name sem limite de tamanho server-side

**Classificacao:** MEDIA
**OWASP:** A03 - Injection (data integrity)
**Arquivo:** migrations/20260309120000_multi_tenant_signup_trigger.sql linha 47
**Status:** ABERTO

company_name vem de raw_user_meta_data (controlado pelo browser, enviavel direto via API Auth).
O trigger insere sem truncamento em tenants.name e tenants.company_name.
Correcao: v_company_name := left(trim(NEW.raw_user_meta_data->>company_name), 100);

---

### ONDA15-MEDIO-003: logo_url aceita qualquer URL sem validacao de dominio

**Classificacao:** MEDIA
**OWASP:** A10 - Server-Side Request Forgery (parcial)
**Arquivo:** supabase/functions/onboarding/handlers/update-company.ts linha 13
**Status:** ABERTO

Zod valida formato URL mas aceita qualquer dominio: http://localhost, IPs internos, 169.254.169.254.
A URL e armazenada e renderizada como img src. Riscos: open redirect via img, SSRF parcial se
houver fetch server-side do logo (geracao de PDF, thumbnails).
Correcao: refinamento Zod exigindo HTTPS e bloqueando IPs privados.

---

### ONDA15-MEDIO-004: Redirect de onboarding client-side - bypassavel

**Classificacao:** MEDIA
**OWASP:** A01 - Broken Access Control
**Arquivo:** frontend/src/app/(dashboard)/layout.tsx linhas 43-68
**Status:** ABERTO

Check de onboarding_completed em useEffect (client-side). Dashboard renderiza completamente antes
do redirect. Se a chamada a /onboarding/status falhar (catch silencioso linha 64), usuario nunca
e redirecionado. Bypassavel cancelando a requisicao via DevTools.
Correcao ideal: mover check para middleware Next.js, armazenando onboarding_completed no
raw_app_meta_data do usuario para disponibilidade no JWT.

---

### ONDA15-MEDIO-005: Logs de producao expoem userId e tenantId em cada request

**Classificacao:** MEDIA
**OWASP:** A09 - Security Logging and Monitoring Failures
**Arquivo:** supabase/functions/onboarding/index.ts linhas 45-51 e todos os 5 handlers
**Status:** ABERTO

console.log com userId, tenantId, role em cada request. Visiveis no Supabase Dashboard em producao.
userId (UUID) pode ser correlacionado com email via auth.users.
Correcao: truncar IDs em producao (id.substring(0,8) + ...) ou usar nivel DEBUG desabilitavel.

---

## FINDINGS BAIXOS

### ONDA15-BAIXO-001: Senha minima de 6 caracteres
**Classificacao:** BAIXA | **Status:** ABERTO
**Arquivo:** frontend/src/app/(auth)/signup/page.tsx linha 58
Abaixo do recomendado pelo NIST SP 800-63B (8+) para plataformas B2B com dados financeiros.
Alterar para 8+ no frontend e no Supabase Dashboard > Authentication > Password Strength.

### ONDA15-BAIXO-002: CNPJ sem validacao de digitos verificadores no backend
**Classificacao:** BAIXA | **Status:** ABERTO
**Arquivo:** supabase/functions/onboarding/handlers/update-company.ts linha 13
Zod aceita qualquer string ate 20 chars como cnpj. Adicionar algoritmo de digitos verificadores.

### ONDA15-BAIXO-003: Email enumeration via mensagem diferenciada no signup
**Classificacao:** BAIXA | **Status:** ABERTO
**Arquivo:** frontend/src/app/(auth)/signup/page.tsx linhas 10-12
Mensagem especifica para email duplicado permite enumerar emails validos.
Mitigacao: mensagem generica para todos os casos de email duplicado.

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
| ONDA15-ALTO-001 | ALTA | Tenant criado antes da confirmacao de email | ABERTO (aceito: job limpeza futuro) |
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