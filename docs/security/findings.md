# Relatorio de Auditoria de Seguranca - ELLAHOS

**Data:** 2026-02-17  
**Auditor:** Security Engineer - ELLAHOS  
**Supabase Project:** etvapcxesaxhsvzgaane  
**Escopo:** Schema completo do banco de dados (Fase 1 - modulo Jobs)  
**Tabelas auditadas:** tenants, profiles, clients, agencies, contacts, people, jobs, job_team, job_deliverables, job_history, job_budgets, job_files

---

## RESUMO EXECUTIVO

O schema da Fase 1 do ELLAHOS apresenta uma base solida de multi-tenancy com RLS habilitado em todas as tabelas. Foram identificados **2 achados CRITICOS**, **4 ALTOS**, **6 MEDIOS** e **4 BAIXOS** que precisam ser corrigidos antes de entrar em producao ou avancar para a Fase 2.

O achado mais grave e uma policy RLS com bug de auto-referencia que concede acesso administrativo a qualquer usuario autenticado para gerenciar perfis de QUALQUER TENANT sem verificacao real de isolamento. O segundo critico e uma race condition na geracao de codigos de job que causa duplicacao de job_code em ambiente de producao com concorrencia.

---

## CRITICOS (corrigir ANTES de ir para Fase 2)

---

### [CRITICO-001] Policy "Admins manage profiles" com bug de auto-referencia - cross-tenant privilege escalation

**Tabela:** profiles  
**Policy:** "Admins manage profiles" (comando ALL)  
**Classificacao:** CRITICO  
**OWASP:** A01 - Broken Access Control  

**Descricao do problema:**

A policy atual para administracao de profiles e:



A expressao  compara  com ela mesma. Esta expressao e sempre  para qualquer linha nao-nula. Isso significa que a policy efetivamente se reduz a:



**Impacto real:**

Qualquer usuario cujo proprio profile tenha  ou  pode executar ALL (SELECT, INSERT, UPDATE, DELETE) em **TODOS os profiles de TODOS os tenants**, nao apenas do seu proprio tenant. Isso e uma violacao completa do isolamento multi-tenant.

Cenario de ataque:
1. Atacante cria conta no ELLAHOS em qualquer tenant
2. Atacante obtem role admin no proprio profile (via bug de onboarding, acesso direto ao Supabase Dashboard, ou exploracao de outra vulnerabilidade)
3. Atacante executa UPDATE em profiles de outros tenants, alterando roles, emails ou dados de acesso
4. Atacante escala privilegios em qualquer tenant do sistema, comprometendo isolamento completo

**Correcao necessaria:**



Esta versao correta: (a) verifica o role do usuario autenticado via auth.uid(); (b) garante que o admin so acessa profiles do SEU proprio tenant via ; (c) elimina o cross-tenant access completamente.

**Prioridade:** Corrigir imediatamente, antes de qualquer deploy em producao.

---

# Auditoria de Seguranca - Fase 6 (Gestao de Equipe + Aprovacoes)

**Data:** 2026-02-19
**Auditor:** Security Engineer - ELLAHOS
**Supabase Project:** etvapcxesaxhsvzgaane
**Escopo:** Edge Functions allocations + approvals; pagina publica /approve/[token]; RLS de tabelas novas
**Arquivos auditados:**
- supabase/functions/approvals/ (index.ts + 8 handlers)
- supabase/functions/allocations/ (index.ts + 6 handlers)
- supabase/functions/_shared/ (auth, cors, supabase-client, vault, etc.)
- frontend/src/app/approve/[token]/page.tsx
- frontend/src/hooks/usePublicApproval.ts
- frontend/src/hooks/useApprovals.ts
- frontend/src/lib/api.ts
- supabase/migrations/20260219_fase5_1_infrastructure_foundation.sql
- supabase/migrations/20260219_fase5_2_pg_cron_jobs.sql

---

## RESUMO EXECUTIVO DA FASE 6

A Fase 6 implementa fluxo de aprovacao com pagina publica para clientes externos e APIs para alocacoes de equipe. A arquitetura central esta correta: auth via supabase.auth.getUser (server-side, nao decode local do JWT), tenant_id sempre do JWT nunca do payload, Zod em todas as mutacoes, separacao clara publica/autenticada no roteador.

Foram identificados **0 CRITICOS**, **2 ALTOS**, **4 MEDIOS** e **4 BAIXOS** nesta fase.

---

## ALTOS

---

### [FASE6-ALTO-001] Migrations ausentes para approval_requests, approval_logs e allocations

**Classificacao:** ALTA
**OWASP:** A01 - Broken Access Control
**Tabelas afetadas:** approval_requests, approval_logs, allocations

O repositorio contem apenas 2 migrations (fase5_1 e fase5_2). As tabelas usadas pelas Edge Functions da Fase 6 nao possuem migration versionada, impossibilitando auditoria do RLS via codigo-fonte. A funcao approvals usa getSupabaseClient(auth.token) para operacoes autenticadas, tornando o RLS a ultima defesa de isolamento multi-tenant. Se o RLS estiver ausente ou incorreto, usuario de tenant A pode ler ou modificar aprovacoes de tenant B passando um approval_id valido.

SQL de verificacao imediata (Supabase SQL Editor):

    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = chr(39) + "public" + chr(39) + " AND tablename IN (chr(39) + "approval_requests" + chr(39) + ", chr(39) + "approval_logs" + chr(39) + ", chr(39) + "allocations" + chr(39) + ");

SQL de verificacao imediata (Supabase SQL Editor):

    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('approval_requests', 'approval_logs', 'allocations');

**Recomendacao:**
1. Criar migration idempotente com ENABLE ROW LEVEL SECURITY
2. Policies USING (tenant_id = get_tenant_id()) para SELECT/INSERT/UPDATE/DELETE
3. Indice UNIQUE em approval_requests.token
4. Verificar RLS no Dashboard antes de qualquer deploy

---

### [FASE6-ALTO-002] Endpoint publico POST /respond sem verificacao de Origin

**Classificacao:** ALTA
**OWASP:** A01 - Broken Access Control / A05 - Security Misconfiguration
**Arquivo:** supabase/functions/approvals/handlers/respond.ts

CORS configurado com wildcard e o endpoint nao verifica o header Origin. Atacante que obtenha o link de aprovacao pode enviar POST diretamente para a Edge Function de qualquer servidor, sem passar pelo frontend. O rate limiting existe (10 tentativas/hora por approval_id, linhas 52-60) mas e permissivo para aprovacoes com implicacao financeira como orcamento_detalhado.

**Recomendacao:**
1. Verificar header Origin no respond.ts e rejeitar origens nao autorizadas para POST
2. Reduzir rate limit de 10 para 3 tentativas por hora por approval_id
3. Adicionar rate limiting por IP (clientIp ja capturado na linha 68 do respond.ts)

---

## MEDIOS

---

### [FASE6-MEDIO-001] approvalId sem validacao UUID em 4 handlers autenticados

**Classificacao:** MEDIA
**OWASP:** A03 - Injection
**Arquivos:** handlers/get-logs.ts, approve-internal.ts, reject-internal.ts, resend.ts

Os handlers publicos get-by-token.ts (linhas 11-13) e respond.ts (linhas 22-24) validam formato UUID. Os handlers autenticados nao. Input invalido causa erro 500 em vez de 404, podendo expor mensagens internas via console.error. SQL injection nao e possivel (Supabase usa prepared statements).

**Recomendacao:** Adicionar no topo de cada handler com ID de path:

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (\!uuidRegex.test(approvalId))
      throw new AppError('NOT_FOUND', 'Aprovacao nao encontrada', 404);

---

### [FASE6-MEDIO-002] CORS wildcard em todas as Edge Functions incluindo autenticadas

**Classificacao:** MEDIA
**OWASP:** A05 - Security Misconfiguration
**Arquivo:** supabase/functions/_shared/cors.ts (linha 3)

"Access-Control-Allow-Origin": "*" aplicado a todas as funcoes, incluindo allocations e approvals que retornam dados de negocio do tenant. Pratica inadequada mesmo com Authorization header obrigatorio.

**Recomendacao:** Criar dois conjuntos de headers CORS no shared: corsPublicHeaders (wildcard, para /approve) e corsAuthHeaders(origin) retornando o dominio especifico do ELLAHOS para rotas autenticadas.

---

### [FASE6-MEDIO-003] Token de aprovacao com validade fixa de 30 dias

**Classificacao:** MEDIA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** supabase/functions/approvals/handlers/create.ts (linhas 56-58)

Todos os tipos de aprovacao recebem token valido por 30 dias. Aprovacoes de orcamento_detalhado e entrega tem implicacao financeira/contratual: link via WhatsApp por 30 dias representa risco se dispositivo for comprometido.

**Recomendacao:** Validade diferenciada: briefing=30d, corte=14d, finalizacao=14d, orcamento_detalhado=7d, entrega=7d.

---

### [FASE6-MEDIO-004] pg_cron invoca integration-processor sem X-Cron-Secret

**Classificacao:** MEDIA
**OWASP:** A07 - Identification and Authentication Failures
**Arquivo:** supabase/migrations/20260219_fase5_2_pg_cron_jobs.sql (linhas 52-62)

O SQL envia apenas Content-Type sem header de autenticacao, apesar do comentario mencionar X-Cron-Secret. Qualquer pessoa que conheça a URL publica da Edge Function pode acionar o processamento da fila, causando consumo de recursos (WhatsApp, Drive API) ou race conditions.

**Recomendacao:** Incluir header x-cron-secret com valor do Vault na chamada net.http_post. Validar o header na Edge Function integration-processor antes de processar.

---

## BAIXOS

---

### [FASE6-BAIXO-001] staleTime de 60s em usePublicApproval

**Classificacao:** BAIXA
**Arquivo:** frontend/src/hooks/usePublicApproval.ts (linha 17)

Dois aprovadores abrindo o mesmo link simultaneamente podem ambos ver status pending. O segundo recebe erro 409 sem feedback claro ao usuario.

**Recomendacao:** staleTime: 0 na pagina publica. Tratar erro 409 com refetch() e mensagem explicativa no page.tsx.

---

### [FASE6-BAIXO-002] file_url sem restricao de dominio

**Classificacao:** BAIXA
**OWASP:** A01 - Broken Access Control
**Arquivo:** supabase/functions/approvals/handlers/create.ts (linha 18)

file_url aceita qualquer URL valida (z.string().url()). Usuario interno poderia criar aprovacao com URL de phishing exibida ao cliente na pagina publica como botao "Ver arquivo". rel=noopener noreferrer esta correto mas dominio nao e validado.

**Recomendacao:** Restringir file_url a dominios confiantes: *.supabase.co/storage, drive.google.com, docs.google.com, dominio do DocuSeal.

---

### [FASE6-BAIXO-003] allocationId sem validacao UUID nos handlers de allocations

**Classificacao:** BAIXA
**Arquivos:** supabase/functions/allocations/handlers/soft-delete.ts, update.ts

Mesmo problema do FASE6-MEDIO-001. Impacto menor por ser rota exclusivamente autenticada sem superficie publica.

**Recomendacao:** Idem FASE6-MEDIO-001.

---

### [FASE6-BAIXO-004] actor full_name exposto nos logs de aprovacao

**Classificacao:** BAIXA
**Arquivo:** supabase/functions/approvals/handlers/get-logs.ts (linha 29)

GET /approvals/:id/logs retorna full_name de usuarios internos via join actor:actor_id(id, full_name). Rota e autenticada (correto), mas deve ser documentada explicitamente como somente interna para evitar exposicao acidental em manutencao futura.

---

## ASPECTOS POSITIVOS

1. Auth server-side: getAuthContext() usa supabase.auth.getUser(token), nao decode local do JWT.
2. tenant_id sempre do JWT: nunca do payload. Correto em todos os handlers.
3. Token UUID forte: gen_random_uuid() = 122 bits de entropia, nao guessable.
4. Separacao publica/autenticada: index.ts trata /public/* antes de getAuthContext().
5. Validacao Zod em todas as mutacoes: RespondSchema, CreateApprovalSchema, CreateAllocationSchema.
6. Rate limiting no endpoint publico: respond.ts limita 10 tentativas/hora por approval_id.
7. service_role restrito: usado apenas para audit logs e notificacoes, nao operacoes de negocio.
8. Error sanitization: safeErrorMessage() em api.ts mascara erros internos do banco.
9. Pagina publica sem dados sensiveis: getByToken retorna subset seguro sem tenant_id, emails, telefones.
10. Soft delete em allocations: historico preservado.

---

## TABELA RESUMO

| ID | Severidade | Descricao | Status |
|---|---|---|---|
| FASE6-ALTO-001 | ALTA | Migrations ausentes para approval_requests/logs/allocations | Aberto |
| FASE6-ALTO-002 | ALTA | POST /respond sem verificacao de Origin | Aberto |
| FASE6-MEDIO-001 | MEDIA | approvalId sem validacao UUID em 4 handlers | Aberto |
| FASE6-MEDIO-002 | MEDIA | CORS wildcard em endpoints autenticados | Aberto |
| FASE6-MEDIO-003 | MEDIA | Token de aprovacao 30 dias independente do tipo | Aberto |
| FASE6-MEDIO-004 | MEDIA | pg_cron sem X-Cron-Secret | Aberto |
| FASE6-BAIXO-001 | BAIXA | staleTime 60s na pagina publica | Aberto |
| FASE6-BAIXO-002 | BAIXA | file_url sem restricao de dominio | Aberto |
| FASE6-BAIXO-003 | BAIXA | allocationId sem validacao UUID em allocations | Aberto |
| FASE6-BAIXO-004 | BAIXA | actor full_name exposto em logs | Aberto |

