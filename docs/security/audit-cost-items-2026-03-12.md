# Auditoria de Seguranca: cost-items Edge Function

**Data:** 2026-03-12  
**Auditor:** Security Engineer - ELLAHOS  
**Escopo:** EF cost-items (CRUD + apply-template + import-from-job + batch) + EF vendors/suggest  
**Resultado:** 0 CRITICOS | 2 ALTOS | 4 MEDIOS | 4 BAIXOS | 3 INFOS

---

## Resumo dos Achados

| ID | Severidade | Descricao | Status |
|----|------------|-----------|--------|
| FASE10-ALTO-001 | ALTA | fetchVendorSnapshot sem filtro tenant: leak de PIX/banco cross-tenant | ABERTO |
| FASE10-ALTO-002 | ALTA | CORS wildcard em 4 respostas 409 de vendors/create.ts | ABERTO |
| FASE10-MEDIO-001 | MEDIA | Campos URL sem validacao de formato/dominio | ABERTO |
| FASE10-MEDIO-002 | MEDIA | RBAC inconsistente entre handlers | ABERTO |
| FASE10-MEDIO-003 | MEDIA | batch.ts nao valida job_id pertence ao tenant | ABERTO |
| FASE10-MEDIO-004 | MEDIA | reference-jobs: parametro q interpolado em .or() sem sanitizacao | ABERTO |
| FASE10-BAIXO-001 | BAIXA | vendors/suggest expoe 6 de 11 digitos do CPF | ABERTO |
| FASE10-BAIXO-002 | BAIXA | Race condition no guard count=0 de apply-template/import-from-job | ABERTO |
| FASE10-BAIXO-003 | BAIXA | console.log expoem tenantId/userId em producao | ABERTO |
| FASE10-BAIXO-004 | BAIXA | insertError.message exposto no detail de respostas 500 | ABERTO |
| FASE10-INFO-001 | INFO | RLS ativo e correto em cost_items, vendors, bank_accounts | OK |
| FASE10-INFO-002 | INFO | IMMUTABLE_FIELDS + Zod strict() em update.ts | OK |
| FASE10-INFO-003 | INFO | JWT validado antes de qualquer handler | OK |

---

## ALTA: FASE10-ALTO-001

**Titulo:** fetchVendorSnapshot sem filtro de tenant — PIX e banco de outro tenant potencialmente copiados como snapshot

**Severidade:** ALTA | **OWASP:** A01 - Broken Access Control / A04 - Insecure Design

**Arquivos:** update.ts linhas 127-156 e 332-345 | create.ts linhas 87-120 e 215-217

**Descricao:**

A funcao fetchVendorSnapshot em update.ts e create.ts consulta vendors e bank_accounts usando apenas .eq(id, vendorId) sem .eq(tenant_id). A protecao atual depende exclusivamente do RLS (JWT do usuario). Riscos: (1) Se RLS for removido em migration futura, chave PIX e banco de outro tenant sao copiados como snapshot permanente no cost_item. (2) vendor_id de outro tenant e gravado silenciosamente sem erro. (3) Inconsistencia de dados sem alerta.

**Fix:** Adicionar .eq(tenant_id, auth.tenantId) nas queries de vendors e bank_accounts dentro de fetchVendorSnapshot em ambos os handlers. Passar tenantId como parametro adicional da funcao.

---

## ALTA: FASE10-ALTO-002

**Titulo:** CORS wildcard em 4 respostas 409 de vendors/create.ts — endpoint autenticado exposto a qualquer origem

**Severidade:** ALTA | **OWASP:** A05 - Security Misconfiguration

**Arquivo:** supabase/functions/vendors/handlers/create.ts, linhas 108-113, 148-153, 190-195, 230-235

**Descricao:**

As respostas 409 de deduplicacao (por nome, CPF, CNPJ e email) retornam Access-Control-Allow-Origin: * hardcoded em vez de usar getCorsHeaders(req). Essas respostas incluem dados do vendor existente: UUID, full_name e email. Com CORS wildcard, qualquer pagina maliciosa pode fazer um POST autenticado, receber o 409 e ler a resposta cross-origin — o que seria bloqueado com origin especifico.

O restante da EF vendors/index.ts usa corretamente getCorsHeaders(req). Apenas esses 4 blocos de resposta inline fogem do padrao.

**Fix:** Substituir os 4 blocos de headers inline por getCorsHeaders(req): headers: { ...getCorsHeaders(req), Content-Type: application/json }

---

## MEDIA: FASE10-MEDIO-001

**Titulo:** Campos URL sem validacao de formato ou dominio

**Severidade:** MEDIA | **OWASP:** A03 - Injection

**Arquivo:** supabase/functions/cost-items/handlers/update.ts, linhas 116-123

**Descricao:**

Os campos nf_drive_url, payment_proof_url, nf_filename e payment_proof_filename aceitam qualquer string via Zod z.string().optional().nullable() sem restricao de comprimento, formato de URL ou whitelist de dominio. Riscos: URLs com esquemas arbitrarios (javascript:, data:, file:) armazenadas no banco; SSRF se o sistema fizer fetch dessas URLs no futuro; strings ilimitadas em comprimento.

**Fix:** Adicionar z.string().url().max(2048) para campos URL e z.string().max(255) para nomes de arquivo. Considerar whitelist de dominios: drive.google.com, *.supabase.co.

---

## MEDIA: FASE10-MEDIO-002

**Titulo:** RBAC inconsistente entre handlers — diretor_producao pode apply-template mas nao create/update

**Severidade:** MEDIA | **OWASP:** A01 - Broken Access Control

**Descricao:**

Matriz de roles diverge sem documentacao: create/update/delete/batch permitem [financeiro, produtor_executivo, admin, ceo]. Ja apply-template/import-from-job permitem [ceo, produtor_executivo, admin, diretor_producao, coordenador_producao]. Isso cria incoerencia: diretor_producao pode criar dezenas de itens via apply-template (operacao de criacao em massa) mas nao pode criar 1 item via create. Alem disso, financeiro — que gerencia custos — nao pode aplicar template.

**Fix:** Definir matriz RBAC explicita. Opcao A: adicionar diretor_producao e coordenador_producao em create/update. Opcao B: remover esses roles de apply-template/import-from-job e adicionar financeiro. Documentar a decisao.

---

## MEDIA: FASE10-MEDIO-003

**Titulo:** batch.ts nao valida que job_id pertence ao tenant antes do INSERT

**Severidade:** MEDIA | **OWASP:** A01 - Broken Access Control

**Arquivo:** supabase/functions/cost-items/handlers/batch.ts, linhas 77-88

**Descricao:**

O handler valida que todos os itens tem o mesmo job_id (consistencia do array) mas nao consulta o banco para confirmar que esse job_id pertence ao tenant autenticado. A protecao atual e apenas o RLS no INSERT. Comparar com apply-template.ts que faz corretamente: .eq(id, jobId).eq(tenant_id, auth.tenantId). Um job_id de outro tenant pode ser submetido; o INSERT falha por RLS ou FK mas com mensagem de erro do banco potencialmente exposta.

**Fix:** Adicionar consulta de validacao antes do INSERT, igual ao apply-template: buscar o job com .eq(id, jobId).eq(tenant_id, auth.tenantId).is(deleted_at, null) e lancar NOT_FOUND 404 se nao existir.

---

## MEDIA: FASE10-MEDIO-004

**Titulo:** reference-jobs parametro q interpolado em PostgREST or() sem sanitizacao

**Severidade:** MEDIA | **OWASP:** A03 - Injection

**Arquivo:** supabase/functions/cost-items/handlers/reference-jobs.ts, linhas 64-65

**Descricao:** Parametro q da query string e interpolado diretamente em .or() do PostgREST sem remover caracteres especiais (virgulas, parenteses) que podem alterar logica da query. O endpoint vendors/suggest aplica sanitizacao correta mas reference-jobs nao. Risco de filtro injection e DoS por q=porcentagem.

**Fix:** Aplicar q.replace de [%_(),] e .slice(0,100) antes da interpolacao, igual ao suggest.ts.

---

## BAIXA: FASE10-BAIXO-001

**Titulo:** vendors/suggest exibe 6 de 11 digitos do CPF — mascara insuficiente

**Severidade:** BAIXA | **OWASP:** A02 - Data Exposure

**Arquivo:** supabase/functions/vendors/handlers/suggest.ts, linhas 51-54

**Descricao:** A mascara atual exibe os 6 digitos finais do CPF (4 + hifen + 2). O padrao seguro para autocomplete e nao retornar CPF, ou exibir apenas os 2 digitos verificadores. O endpoint e usado para selecionar nome de fornecedor e nao precisa de CPF.

**Fix:** Remover cpf e cnpj da resposta do suggest, ou reduzir mascara para exibir apenas os 2 ultimos digitos.

---

## BAIXA: FASE10-BAIXO-002

**Titulo:** Race condition no guard count=0 de apply-template e import-from-job

**Severidade:** BAIXA | **OWASP:** A04 - Insecure Design

**Arquivos:** apply-template.ts linhas 87-105 | import-from-job.ts linhas 67-85

**Descricao:** O check de count=0 antes do INSERT nao e atomico. Duas requisicoes simultaneas podem ambas passar pelo check e inserir templates duplicados. Nao existe constraint UNIQUE em (job_id, item_number, sub_item_number) que forcaria falha no segundo INSERT.

**Fix:** Adicionar UNIQUE INDEX parcial no banco: CREATE UNIQUE INDEX idx_cost_items_unique_item ON cost_items(job_id, item_number, sub_item_number) WHERE deleted_at IS NULL AND job_id IS NOT NULL.

---

## BAIXA: FASE10-BAIXO-003

**Titulo:** console.log expoem tenantId e userId em todos os handlers em producao

**Severidade:** BAIXA | **OWASP:** A09 - Security Logging and Monitoring Failures

**Descricao:** Todos os handlers fazem console.log com tenantId, userId e outros dados operacionais sem controle de nivel de log. Em producao esses logs ficam visiveis no dashboard Supabase e em sistemas de log externos, facilitando reconhecimento por attacker com acesso ao painel.

**Fix:** Controlar por variavel DENO_ENV: only log debug info when DENO_ENV \!= production.

---

## BAIXA: FASE10-BAIXO-004

**Titulo:** insertError.message do PostgreSQL exposto no campo detail de respostas 500

**Severidade:** BAIXA | **OWASP:** A05 - Security Misconfiguration

**Arquivos:** apply-template.ts linha 133 | import-from-job.ts linha 145 | batch.ts linha 165

**Descricao:** Em erros de banco, o insertError.message (mensagem raw do PostgreSQL) e incluido no campo detail da resposta 500 enviada ao cliente. Mensagens do PostgreSQL podem expor nomes de tabelas, constraints e valores que violaram constraints.

**Fix:** Remover o campo detail das respostas 500 publicas. Manter console.error server-side apenas.

---

## INFO: FASE10-INFO-001

**RLS ativo e correto em todas as tabelas financeiras**

RLS habilitado com ENABLE ROW LEVEL SECURITY em cost_items, vendors, bank_accounts, cost_categories. Todas as policies usam tenant_id = (SELECT get_tenant_id()) — forma correta com subquery estavel. Policies de DELETE adicionadas em migration dedicada 20260302100000. Nenhuma tabela financeira tem RLS desabilitado.

---

## INFO: FASE10-INFO-002

**IMMUTABLE_FIELDS e schema Zod strict() em update.ts — implementacao solida**

update.ts define IMMUTABLE_FIELDS como Set e rejeita campos imutaveis antes do parse Zod. O schema usa .strict() que rejeita campos desconhecidos. Todos os campos GENERATED do banco estao na lista de imutaveis. A combinacao e defensiva e bem implementada.

---

## INFO: FASE10-INFO-003

**JWT validado antes de qualquer handler — sem rota anonima**

index.ts chama getAuthContext(req) antes de qualquer roteamento. Nao existe rota de fallthrough sem autenticacao. getAuthContext valida Bearer token via supabase.auth.getUser, verifica tenant_id em app_metadata, e lanca FORBIDDEN para usuarios sem tenant. CORS pre-flight OPTIONS respondido antes da auth (correto).
