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


---

# Auditoria de Seguranca Preventiva - Fase 7 (Dashboard + Relatorios + Portal do Cliente)

**Data:** 2026-02-20
**Auditor:** Security Engineer - ELLAHOS
**Supabase Project:** etvapcxesaxhsvzgaane
**Escopo:** Arquitetura preventiva da Fase 7 (ainda nao implementada)
**Documento auditado:** docs/architecture/fase-7-architecture.md
**Foco:** RPCs SECURITY DEFINER, portal publico, RLS novas tabelas, dados sensiveis, idempotencia

---

## RESUMO EXECUTIVO DA FASE 7

A arquitetura da Fase 7 demonstra boas praticas em varios pontos: RPCs SECURITY DEFINER com search_path fixo, tenant_id como parametro em 8 de 9 RPCs, filtros de dados sensiveis aplicados no banco, e lista explicita de campos financeiros proibidos no portal.

Foram identificados **0 CRITICOS**, **1 ALTO**, **4 MEDIOS** e **3 BAIXOS**.

Achados prioritarios antes da implementacao:
1. [FASE7-ALTO-001] RLS de client_portal_messages nao restringe direction: usuario autenticado pode fabricar mensagens como se fossem do cliente externo.
2. [FASE7-MEDIO-001] idempotency_key nullable torna o UNIQUE constraint ineficaz quando o cliente nao envia a chave explicitamente.

---

## RESULTADO POR ITEM AUDITADO

### 1. RPCs SECURITY DEFINER

Todas as 9 RPCs usam SECURITY DEFINER e SET search_path = public.

| RPC | p_tenant_id | Filtro correto | Cross-tenant possivel | Resultado |
|-----|-------------|----------------|----------------------|-----------|
| get_dashboard_kpis | OK | OK (7 subqueries) | Nao | OK |
| get_pipeline_summary | OK | OK | Nao | OK |
| get_revenue_by_month | OK | OK | Nao | OK |
| get_alerts | OK | OK (4 UNION branches) | Nao | OK |
| get_recent_activity | OK | OK | Nao | OK |
| get_report_financial_monthly | OK | OK | Nao | OK |
| get_report_performance | OK | OK (4 branches IF) | Nao | OK |
| get_report_team_utilization | OK | Parcial (ver FASE7-MEDIO-002) | False positive possivel | ATENCAO |
| get_portal_timeline | Nao tem (usa token) | OK via v_session.tenant_id | Nao | ATENCAO (ver FASE7-MEDIO-003) |

### 2. Portal do Cliente (endpoints publicos)

| Aspecto | Resultado | Detalhe |
|---------|-----------|---------|
| Token UUID v4 (2^122) | OK | gen_random_uuid() = 122 bits. Brute force inviavel. |
| Rate limiting descrito | ATENCAO | Ver FASE7-MEDIO-004 - conta sucesso, nao tentativas |
| Dados financeiros filtrados | OK | Nenhum campo proibido na RPC get_portal_timeline |
| Eventos de historico filtrados | OK | SQL: IN (status_change, approval, file_upload) |
| Arquivos filtrados | OK | SQL: IN (briefing, aprovacoes, entregaveis) |
| Aprovacoes internas excluidas | OK | SQL: AND ar.approver_type = 'external' |

### 3. RLS das novas tabelas

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE | Resultado |
|--------|-----|--------|--------|--------|--------|-----------|
| client_portal_sessions | OK | OK | OK | OK | Ausente (intencional) | OK |
| client_portal_messages | OK | OK | PROBLEMA (ver FASE7-ALTO-001) | Ausente | Ausente | ALTO |
| report_snapshots | OK | OK | OK | Ausente (imutavel) | Ausente (pg_cron) | OK |

### 4. Dados sensiveis no portal

A RPC get_portal_timeline retorna para o endpoint publico apenas:
- session: id, job_title, job_code, job_status, permissions
- timeline: id, event_type, description, created_at
- documents: id, name, url, category, created_at
- approvals: id, approval_type, title, description, file_url, status, approval_token, expires_at, created_at
- messages: id, direction, sender_name, content, attachments, created_at

Campos auditados ausentes na resposta publica: closed_value, production_cost, margin_percentage, gross_profit, health_score, tax_value, other_costs, risk_buffer. **OK**.

Nota: health_score e margin_percentage aparecem nos KPIs do dashboard e alertas, porem esses endpoints sao AUTENTICADOS (usuarios internos do tenant). Correto.

### 5. Idempotencia de client_portal_messages

Ver FASE7-MEDIO-001. **ATENCAO**.

---
## ALTO

---

### [FASE7-ALTO-001] RLS portal_messages_insert nao restringe direction - falsificacao de remetente

**Classificacao:** ALTA
**OWASP:** A01 - Broken Access Control
**Tabela:** client_portal_messages
**Referencia:** docs/architecture/fase-7-architecture.md, secao 2.1.2 (linhas 164-177)

**Descricao do problema:**

A policy RLS de INSERT autenticado para client_portal_messages e:



O WITH CHECK valida apenas tenant_id. Nao valida o campo direction. Qualquer usuario autenticado do tenant pode executar um INSERT com direction = 'client_to_producer', falsificando que a mensagem foi enviada pelo cliente externo, sem passar pela Edge Function.

**Cenario de ataque:**
1. Usuario interno autenticado acessa o SDK Supabase diretamente com o JWT dele.
2. Insere linha em client_portal_messages com direction = 'client_to_producer' e sender_name = [nome do cliente].
3. A equipe ve a mensagem como se fosse do cliente.
4. Em caso de disputa contratual, o historico esta contaminado.
5. A notificacao portal_message_received e disparada como se fosse mensagem real do cliente.

A arquitetura documenta que client_to_producer e inserido via service_role (endpoint publico), mas o banco nao enforca essa invariante. O RLS e a ultima linha de defesa.

**Correcao necessaria (dois niveis):**

Nivel 1 - CHECK constraint no schema (defesa no banco):


Nivel 2 - Refinar policy RLS de INSERT autenticado:


Com as duas correcoes, o banco garante: (a) usuario autenticado so insere producer_to_client, (b) sender_user_id deve bater com o usuario logado, (c) client_to_producer so pode ter sender_user_id NULL.

---
## MEDIOS

---

### [FASE7-MEDIO-001] idempotency_key nullable - UNIQUE constraint ineficaz sem chave explicita

**Classificacao:** MEDIA
**OWASP:** A08 - Software and Data Integrity Failures
**Tabela:** client_portal_messages
**Referencia:** docs/architecture/fase-7-architecture.md, linhas 136 e 145

**Descricao do problema:**

O schema define idempotency_key TEXT sem NOT NULL e um UNIQUE constraint:

    idempotency_key  TEXT,
    CONSTRAINT uq_portal_messages_idempotency UNIQUE (idempotency_key)

Em PostgreSQL, UNIQUE em coluna nullable permite multiplos NULLs (NULL != NULL na semantica SQL). Qualquer requisicao sem idempotency_key pode ser inserida multiplas vezes. Em rede instavel com retry automatico no cliente, a mesma mensagem e duplicada sem que o banco rejeite.

**Correcao:**

Tornar obrigatorio para client_to_producer via CHECK constraint:

    ALTER TABLE client_portal_messages
      ADD CONSTRAINT chk_portal_messages_idempotency_required
        CHECK (
          direction = 'producer_to_client'
          OR (direction = 'client_to_producer' AND idempotency_key IS NOT NULL)
        );

Na Edge Function send-message: se o cliente nao enviar idempotency_key, gerar no handler como hash(session_id + truncate(content, 100) + floor(epoch/60)). Retornar 409 Conflict em UNIQUE violation.

---

### [FASE7-MEDIO-002] get_report_team_utilization - subquery de conflitos sem tenant_id em a2

**Classificacao:** MEDIA
**OWASP:** A01 - Broken Access Control (vazamento de informacao entre tenants)
**RPC:** get_report_team_utilization
**Referencia:** docs/architecture/fase-7-architecture.md, linhas 789-802

**Descricao do problema:**

A subquery de conflict_count junta allocations a1 e a2 via people_id mas a2 nao tem filtro de tenant_id:

    SELECT count(*)
    FROM allocations a1
    JOIN allocations a2 ON a1.people_id = a2.people_id
      AND a1.id < a2.id
      AND a1.deleted_at IS NULL
      AND a2.deleted_at IS NULL
      -- a2 NAO tem filtro de tenant_id
      AND a1.allocation_start <= a2.allocation_end
      AND a1.allocation_end >= a2.allocation_start
    WHERE a1.people_id = p.id
      AND a1.tenant_id = p_tenant_id

Como a RPC e SECURITY DEFINER, ela le allocations de qualquer tenant. Se o mesmo UUID de people_id existir em dois tenants, a subquery conta conflitos com allocations do outro tenant, vazando a existencia de dados entre tenants e retornando conflict_count incorreto.

**Correcao:**

    JOIN allocations a2 ON a1.people_id = a2.people_id
      AND a1.id < a2.id
      AND a1.deleted_at IS NULL
      AND a2.deleted_at IS NULL
      AND a2.tenant_id = p_tenant_id    -- ADICIONAR ESTE FILTRO
      AND a1.allocation_start <= a2.allocation_end
      AND a1.allocation_end >= a2.allocation_start

---
### [FASE7-MEDIO-003] get_portal_timeline SECURITY DEFINER sem rate limiting no endpoint GET publico

**Classificacao:** MEDIA
**OWASP:** A05 - Security Misconfiguration
**RPC:** get_portal_timeline / Endpoint GET /client-portal/public/:token
**Referencia:** docs/architecture/fase-7-architecture.md, secao 3.3 e 9.2

**Descricao do problema:**

A arquitetura define rate limiting apenas para POST (envio de mensagens), nao para GET (leitura do portal). O endpoint GET aceita qualquer UUID como token e dispara uma query SQL por requisicao. Sem rate limiting no GET, um atacante pode chamar o endpoint com UUIDs aleatorios em alta frequencia (fuzzing de tokens), causando carga no banco.

A funcao nao faz UPDATE quando o token nao existe (RETURN NULL antes do UPDATE), portanto o overhead e apenas o SELECT inicial. O risco principal e consumo de compute da Edge Function.

Adicionalmente, a funcao deve retornar HTTP 404 generico tanto para token nao encontrado quanto para sessao expirada ou inativa, sem distinguir os casos (previne enumeracao de estado do token).

**Correcao:**

1. Aplicar rate limiting por IP no handler get-by-token: maximo 60 requisicoes/minuto por IP (x-forwarded-for).
2. Documentar na migration que get_portal_timeline e a unica excecao ao padrao p_tenant_id, com justificativa.
3. Verificar que a Edge Function retorna 404 identico para token invalido, expirado e inativo.

---

### [FASE7-MEDIO-004] Rate limiting conta mensagens bem-sucedidas, nao tentativas de envio

**Classificacao:** MEDIA
**OWASP:** A05 - Security Misconfiguration
**Endpoint:** POST /client-portal/public/:token/message
**Referencia:** docs/architecture/fase-7-architecture.md, secao 3.3 e 9.2

**Descricao do problema:**

A arquitetura define rate limit de max 20 mensagens por sessao na ultima hora. O mecanismo conta mensagens inseridas com sucesso em client_portal_messages, diferente do pattern da Fase 6 que conta approval_logs incluindo tentativas rejeitadas.

Problema 1 (UX): Apos 20 mensagens legitimas enviadas com sucesso, o cliente real e bloqueado. Em projeto com revisoes intensas o limite e atingivel por clientes honestos.
Problema 2 (seguranca): Limite e por sessao, nao por IP. Atacante com token valido pode enviar 20 mensagens/hora continuamente.
Problema 3 (semantica): Nao registra tentativas bloqueadas, impossibilitando deteccao de abuse.

**Correcao:**

1. Aumentar limite de 20 para 50 mensagens por hora por sessao, ou tornar configuravel via permissions JSONB.
2. Adicionar rate limiting secundario por IP: maximo 200 requisicoes/hora no endpoint por IP de origem.
3. Logar tentativas rejeitadas (429) para detectar padroes de abuse.

---
## BAIXOS

---

### [FASE7-BAIXO-001] sender_name livre no endpoint publico - spoofing de identidade

**Classificacao:** BAIXA
**OWASP:** A03 - Injection
**Endpoint:** POST /client-portal/public/:token/message
**Referencia:** docs/architecture/fase-7-architecture.md, secao 3.3

**Descricao do problema:**

O endpoint publico aceita sender_name do cliente sem restricao documentada. Um cliente com o token pode enviar mensagens com sender_name = "Ellah Producoes" ou outro nome interno, gerando confusao para a equipe sobre a origem da mensagem.

**Correcao:**

No handler send-message, nao aceitar sender_name do payload. Usar como sender_name o campo label da client_portal_session (controlado pela equipe ao criar a sessao). Se label for null, usar o nome do contact_id associado buscado do banco. O nome exibido deve ser controlado pela produtora, nao pelo cliente externo.

---

### [FASE7-BAIXO-002] Ausencia de policy DELETE em client_portal_sessions nao documentada

**Classificacao:** BAIXA
**Tabela:** client_portal_sessions
**Referencia:** docs/architecture/fase-7-architecture.md, secao 2.1.1

**Descricao do problema:**

O RLS de client_portal_sessions tem policies para SELECT, INSERT e UPDATE mas nao ha policy para DELETE. A ausencia e intencional (soft delete via deleted_at), mas nao esta comentada no schema. Um desenvolvedor que tente DELETE fisico via SDK recebera erro de permissao sem mensagem clara, podendo adicionar uma policy DELETE por engano.

**Correcao:**

Adicionar comentario explicito na migration:

    -- Nota: DELETE fisico nao e permitido por design (soft delete via deleted_at).
    -- A ausencia de policy DELETE e intencional: RLS nega por padrao (deny by default).

---

### [FASE7-BAIXO-003] session.id exposto desnecessariamente na resposta publica

**Classificacao:** BAIXA
**RPC:** get_portal_timeline
**Referencia:** docs/architecture/fase-7-architecture.md, linha 859

**Descricao do problema:**

A RPC retorna o campo id da sessao na resposta publica (linha 859: 'id', v_session.id). Nenhuma funcionalidade documentada do portal necessita do session.id no lado do cliente: o token ja serve como identificador unico. O session.id e informacao interna desnecessaria para o contexto publico.

**Correcao:**

Remover o campo id da resposta da RPC e atualizar o Response Example na secao 3.3 da arquitetura.

---

## ASPECTOS POSITIVOS DA FASE 7

1. SET search_path = public em todas as RPCs: previne schema injection em funcoes SECURITY DEFINER.
2. p_tenant_id como parametro em 8 de 9 RPCs: padrao correto, tenant_id nunca confiado ao RLS em SECURITY DEFINER.
3. Lista completa de campos financeiros proibidos no portal (secao 9.2): closed_value, production_cost, gross_profit, margin_percentage, net_profit, tax_value, other_costs, risk_buffer.
4. Filtros de historico e arquivo aplicados no SQL da RPC, nao no TypeScript apos retorno.
5. Aprovacoes internas excluidas do portal: AND ar.approver_type = 'external' na RPC.
6. Token UUID v4 para sessoes: 2^122 combinacoes, consistente com Fase 6.
7. is_active + expires_at: dois mecanismos independentes de revogacao de acesso ao portal.
8. Soft delete em client_portal_sessions: historico de acesso preservado para auditoria.
9. RLS habilitado em todas as 3 novas tabelas com get_tenant_id().
10. get_portal_timeline verifica expires_at antes de retornar dados.
11. Sessao pode ser desativada instantaneamente via is_active = false.
12. RLS em report_snapshots impede acesso cruzado entre tenants em dados cacheados.

---

## TABELA RESUMO - FASE 7

| ID | Severidade | Descricao | Status |
|----|------------|-----------|--------|
| FASE7-ALTO-001 | ALTA | RLS portal_messages_insert sem restricao de direction - falsificacao de remetente | Aberto |
| FASE7-MEDIO-001 | MEDIA | idempotency_key nullable - UNIQUE constraint ineficaz sem chave explicita | Aberto |
| FASE7-MEDIO-002 | MEDIA | get_report_team_utilization - subquery de conflitos sem tenant_id em a2 | Aberto |
| FASE7-MEDIO-003 | MEDIA | get_portal_timeline sem rate limiting no endpoint GET publico | Aberto |
| FASE7-MEDIO-004 | MEDIA | Rate limiting conta mensagens bem-sucedidas, nao tentativas | Aberto |
| FASE7-BAIXO-001 | BAIXA | sender_name livre no endpoint publico - spoofing de identidade | Aberto |
| FASE7-BAIXO-002 | BAIXA | Ausencia de policy DELETE em client_portal_sessions nao documentada | Aberto |
| FASE7-BAIXO-003 | BAIXA | session.id exposto desnecessariamente na resposta publica | Aberto |
