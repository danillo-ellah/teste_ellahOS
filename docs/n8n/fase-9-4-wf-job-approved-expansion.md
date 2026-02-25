# [PRODUCAO] wf-job-approved — Expansao Fase 9.4

**Data:** 25/02/2026
**Autor:** n8n Workflow Architect — ELLAHOS
**Referencia:** docs/architecture/fase-9-automacoes-architecture.md secao 5.3
**Status:** Pronto para implementacao manual no n8n UI
**Prioridade:** P0

---

## 1. Contexto e Objetivo

O workflow `wf-job-approved` existe desde a Fase 5 e e acionado pelo `integration-processor` sempre que um job e aprovado no ELLAHOS (endpoint `jobs-status/:id/approve`). Atualmente ele cria a estrutura de pastas no Google Drive e envia notificacoes.

O workflow `JOB_FECHADO_CRIACAO` existe desde antes do ELLAHOS e funciona de forma independente: recebe um payload via webhook e cria 4 grupos WhatsApp via Z-API.

**Objetivo da Fase 9.4:** Conectar os dois. Apos o `wf-job-approved` criar as pastas no Drive, ele deve chamar o `JOB_FECHADO_CRIACAO` como sub-workflow, passando o payload completo com as URLs das pastas recem-criadas e os dados do job.

**Regra critica:** NAO alterar o `JOB_FECHADO_CRIACAO`. Ele permanece exatamente como esta.

---

## 2. Estado Atual do wf-job-approved (Pre-Expansao)

### 2.1 Trigger

- **Tipo:** Webhook (chamado pelo `integration-processor`)
- **Event type no ELLAHOS:** `n8n_webhook` com `payload.workflow = 'wf-job-approved'`
- **URL:** `https://ia.ellahfilmes.com/webhook/wf-job-approved` (URL real a confirmar no n8n)

### 2.2 Payload de entrada (enviado pelo integration-processor)

O `integration-processor` chama o webhook do n8n com o payload que foi enfileirado em `integration_events`. Com base no codigo da Edge Function `jobs-status/handlers/approve.ts`:

```json
{
  "workflow": "wf-job-approved",
  "job_id": "uuid-do-job",
  "job_title": "Nome do Job",
  "closed_value": 150000.00,
  "approval_type": "interna",
  "approved_by": "usuario@ellahfilmes.com"
}
```

### 2.3 Nodes existentes (estrutura estimada com base na Fase 5)

A sequencia de nodes atual do `wf-job-approved` e:

```
[1] Webhook Trigger
     |
     v
[2] HTTP Request — GET job details
    (busca dados completos do job via Edge Function ou Supabase REST)
     |
     v
[3] HTTP Request — POST drive-integration/:jobId/create-structure
    (chama a Edge Function para criar 26 pastas no Drive)
     |
     v
[4] IF — Drive criado com sucesso?
    |                    |
    | SIM                | NAO
    v                    v
[5] Set — extrair       [6] Set — logar erro
    URLs das pastas         e continuar
     |
     v
[7] HTTP Request — POST drive-integration/:jobId/sync-urls
    (salva URLs das pastas no banco via callback)
     |
     v
[8] WhatsApp Send
    (notificacao para grupo/canal interno)
```

**IMPORTANTE:** A estrutura exata dos nodes (nomes, IDs, conexoes) deve ser verificada no n8n UI antes de implementar a expansao. O diagrama acima e uma estimativa baseada na arquitetura da Fase 5.

---

## 3. Estado Desejado Apos Expansao

### 3.1 Diagrama do fluxo expandido

```
[1] Webhook Trigger
     |
     v
[2] HTTP Request — GET job details
    (busca: code, job_aba, title, client_id, agency_id)
     |
     v
[3] HTTP Request — GET client details
    (busca: clients.name via client_id)
     |
     v
[4] HTTP Request (opcional) — GET agency details
    (busca: agencies.name via agency_id, se existir)
     |
     v
[5] HTTP Request — POST drive-integration/:jobId/create-structure
     |
     v
[6] IF — Drive criado com sucesso?
    |                    |
    | SIM                | NAO
    v                    v
[7] HTTP Request       [X] Set — drive_error = true
    sync-urls              (continua para o Set Payload)
     |
     v
[8] Set — drive URLs
    (extrai root_url, financeiro_url, cronograma_url, contratos_url)
     |
     v
================== NODES NOVOS A ADICIONAR ==================
     |
     v
[N1] Set — "Montar Payload JOB_FECHADO_CRIACAO"
     (ver secao 4 para o mapeamento completo)
     |
     v
[N2] Execute Workflow — JOB_FECHADO_CRIACAO
     (modo: sub-workflow | passar payload do N1)
     |
     v
[N3] IF — "Sub-workflow executou com sucesso?"
    |                         |
    | SIM                     | NAO (erro ou timeout)
    v                         v
[N4] Set — log sucesso       [N5] Set — logar erro
    whatsapp_groups: X            (NAO falhar o wf-job-approved)
     |                             |
     +-----------------------------+
     v
[9] WhatsApp Send (existente)
    (notificacao interna — pode continuar normalmente)
```

### 3.2 Posicionamento dos nodes novos

Os 3 nodes novos (`N1`, `N2`, `N3`) devem ser inseridos **apos** o node de sync-urls (ou apos o node que extrai as URLs das pastas) e **antes** do node de WhatsApp Send final.

A logica de erro (`N3` -> `N5`) usa o output de erro do node `N2` (Execute Workflow). O branch de erro apenas loga a falha — o workflow continua normalmente para o WhatsApp Send.

---

## 4. Mapeamento de Campos (Payload ELLAHOS → JOB_FECHADO_CRIACAO)

Este e o mapeamento completo que o node `N1 Set` deve construir.

### 4.1 Fonte dos dados

Os dados vem de tres origens:
1. **Payload do webhook** (recebido no trigger): `job_id`, `job_title`, `closed_value`, `approval_type`, `approved_by`
2. **Banco de dados** (buscado pelo wf-job-approved): campos da tabela `jobs`, `clients`, `agencies`
3. **Resultado do Drive** (retornado pelo node de create-structure/sync-urls): URLs das pastas

### 4.2 Tabela de mapeamento

| Campo JOB_FECHADO_CRIACAO | Valor no ELLAHOS | Origem | Observacao |
|---------------------------|-----------------|--------|------------|
| `numero` | `jobs.code` | Banco (jobs) | Ex: "EL-2026-042" |
| `job_aba` | `jobs.job_aba` | Banco (jobs) | Ex: "42A" — sufixo da aba |
| `cliente` | `clients.name` | Banco (clients via FK) | Nome do cliente final |
| `agencia` | `agencies.name` | Banco (agencies via FK) | Nome da agencia; string vazia se null |
| `projeto` | `jobs.title` | Payload do webhook ou banco | Nome do projeto/job |
| `pasta_principal` | URL pasta `root` | Drive (sync-urls) | URL da pasta raiz no Drive |
| `planilha_producao` | URL pasta `financeiro` | Drive (sync-urls) | Pasta 02_FINANCEIRO |
| `cronograma` | URL pasta `cronograma` | Drive (sync-urls) | Pasta 04_CRONOGRAMA |
| `contratos` | URL pasta `contratos` | Drive (sync-urls) | Pasta 05_CONTRATOS |
| `PPM` | `""` (string vazia) | — | Nao disponivel no ELLAHOS ainda |
| `Carta_Orcamento` | `""` (string vazia) | — | Nao disponivel no ELLAHOS ainda |
| `valor_aprovado` | `jobs.closed_value` | Payload do webhook | Valor em reais (numero) |
| `aprovado_por` | `approval.approved_by` | Payload do webhook | Email do aprovador |
| `data_aprovacao` | `new Date().toISOString()` | Gerado no node | Timestamp da execucao |

**Campos sem mapeamento (string vazia por padrao):**
- `PPM` — planilha de planejamento de midia, nao existe no ELLAHOS
- `Carta_Orcamento` — URL da carta orcamento PDF, sera populada na Fase 9.7 (PDF Generator)
- Qualquer outro campo legado que o `JOB_FECHADO_CRIACAO` espere e que nao esteja listado acima

### 4.3 URLs do Drive — chaves da tabela drive_folders

A Edge Function `drive-integration/:jobId/sync-urls` persiste as URLs na tabela `drive_folders` com a coluna `folder_key`. As chaves relevantes para o JOB_FECHADO_CRIACAO sao:

| folder_key | Pasta fisica | Campo do payload |
|------------|-------------|-----------------|
| `root` | Pasta principal `{CODE}_{TITLE}_{CLIENT}` | `pasta_principal` |
| `financeiro` | `02_FINANCEIRO` | `planilha_producao` |
| `cronograma` | `04_CRONOGRAMA` | `cronograma` |
| `contratos` | `05_CONTRATOS` | `contratos` |

Se o Drive falhar e as pastas nao existirem, usar strings vazias para as URLs — o `JOB_FECHADO_CRIACAO` deve aceitar campos opcionais.

### 4.4 Expressoes n8n para o node Set (N1)

Abaixo estao as expressoes para configurar o node `Set` no n8n UI. Os nomes dos nodes referenciados (`HTTP Request drive details`, `HTTP Request sync-urls`, etc.) devem ser ajustados para os nomes reais dos nodes no workflow.

```
numero:           {{ $('HTTP Request - Job Details').item.json.data.code }}
job_aba:          {{ $('HTTP Request - Job Details').item.json.data.job_aba }}
cliente:          {{ $('HTTP Request - Client Details').item.json.data.name }}
agencia:          {{ $('HTTP Request - Agency Details').item.json?.data?.name ?? '' }}
projeto:          {{ $json.job_title }}
pasta_principal:  {{ $('HTTP Request - Sync URLs').item.json?.data?.folders?.find(f => f.folder_key === 'root')?.url ?? '' }}
planilha_producao:{{ $('HTTP Request - Sync URLs').item.json?.data?.folders?.find(f => f.folder_key === 'financeiro')?.url ?? '' }}
cronograma:       {{ $('HTTP Request - Sync URLs').item.json?.data?.folders?.find(f => f.folder_key === 'cronograma')?.url ?? '' }}
contratos:        {{ $('HTTP Request - Sync URLs').item.json?.data?.folders?.find(f => f.folder_key === 'contratos')?.url ?? '' }}
PPM:              {{ '' }}
Carta_Orcamento:  {{ '' }}
valor_aprovado:   {{ $json.closed_value }}
aprovado_por:     {{ $json.approved_by }}
data_aprovacao:   {{ $now.toISO() }}
```

**Nota sobre referencias de nodes:** As expressoes `$('Nome do Node')` referenciam pelo nome exato do node no n8n. Antes de implementar, abra o `wf-job-approved` no n8n UI e anote os nomes exatos dos nodes existentes para substituir nas expressoes acima.

---

## 5. Configuracao do Node N2 — Execute Workflow

### 5.1 Tipo de node

`n8n-nodes-base.executeWorkflow`

### 5.2 Parametros

| Parametro | Valor |
|-----------|-------|
| **Source** | Database |
| **Workflow** | Selecionar `JOB_FECHADO_CRIACAO` na lista |
| **Mode** | Run once for all items (processar tudo de uma vez) |
| **Wait for completion** | Sim (marcado) — para capturar erros |
| **Input data** | Passar os campos do node N1 (Set anterior) |

### 5.3 Tratamento de erro no node N2

No n8n, para capturar erros de um node e continuar o workflow:

1. Selecionar o node `N2 — Execute Workflow`
2. Em **Settings** (engrenagem) do node, habilitar **"Continue on fail"** = true
3. Isso garante que se o `JOB_FECHADO_CRIACAO` falhar (Z-API fora, timeout, erro interno), o `wf-job-approved` continua executando sem falhar

Alternativamente, conectar um node de **IF** ao output de erro do N2:
- Output `true` (sucesso): seguir para log de sucesso
- Output `false` (falha): seguir para log de erro (sem propagar a falha)

---

## 6. Configuracao do Node N3 — IF Error

### 6.1 Tipo de node

`n8n-nodes-base.if`

### 6.2 Logica da condicao

Se o `Continue on fail` estiver habilitado no N2, o campo `$json.error` vai existir em caso de falha. Configurar o IF assim:

| Campo | Operador | Valor |
|-------|----------|-------|
| `{{ $json.error }}` | exists | — |

- **Branch TRUE** (erro existe): ir para N5 (Set — log erro)
- **Branch FALSE** (sem erro): ir para N4 (Set — log sucesso)

### 6.3 Node N5 — Set Log Erro (branch de falha)

Tipo: `n8n-nodes-base.set`

Configurar os campos:
```
sub_workflow_status:  "error"
sub_workflow_error:   {{ $json.error?.message ?? 'Erro desconhecido' }}
sub_workflow_time:    {{ $now.toISO() }}
```

Este node apenas registra a falha nas variaveis do item — nao faz nenhuma acao externa (sem HTTP, sem webhook). O workflow continua normalmente para o WhatsApp Send.

### 6.4 Node N4 — Set Log Sucesso (branch de sucesso)

Tipo: `n8n-nodes-base.set`

Configurar os campos:
```
sub_workflow_status:  "success"
sub_workflow_time:    {{ $now.toISO() }}
```

---

## 7. Verificacao do Formato do JOB_FECHADO_CRIACAO

**Antes de implementar**, e obrigatorio verificar o formato de payload exato que o `JOB_FECHADO_CRIACAO` espera:

1. Abrir o `JOB_FECHADO_CRIACAO` no n8n UI (`ia.ellahfilmes.com`)
2. Verificar o primeiro node (geralmente Webhook Trigger ou Manual Trigger)
3. Identificar quais campos sao obrigatorios e seus nomes exatos
4. Verificar se o workflow aceita chamada como sub-workflow (Execute Workflow node) ou apenas via webhook

**Se o JOB_FECHADO_CRIACAO aceitar apenas webhook (nao sub-workflow):**

Nesse caso, o node `N2` deve ser do tipo `HTTP Request` apontando para o webhook do `JOB_FECHADO_CRIACAO`:

```
Metodo:  POST
URL:     https://ia.ellahfilmes.com/webhook/JOB_FECHADO_CRIACAO
Headers: Content-Type: application/json
Body:    {{ JSON.stringify($('N1 - Set Payload').item.json) }}
```

E o tratamento de erro segue o mesmo padrao: `Continue on fail = true` + IF para checar `$json.error`.

---

## 8. Instrucoes de Implementacao (Passo a Passo)

### Pre-requisitos

- [ ] Acesso ao n8n UI em `ia.ellahfilmes.com`
- [ ] Acesso ao workflow `wf-job-approved` (deve estar na lista de workflows)
- [ ] Acesso ao workflow `JOB_FECHADO_CRIACAO` (apenas para leitura — nao alterar)
- [ ] Credencial de Service Account Google Drive configurada no n8n (reusar existente)

### Passo 1 — Inspecionar JOB_FECHADO_CRIACAO

1. Abrir `JOB_FECHADO_CRIACAO` no n8n
2. **Anotar:**
   - ID do workflow (visivel na URL: `/workflow/XXXXX`)
   - Campos esperados no trigger (campos do body do webhook ou do Execute Workflow input)
   - Nomes exatos dos campos (case-sensitive)
3. **NAO salvar nenhuma alteracao**

### Passo 2 — Abrir wf-job-approved para edicao

1. Abrir `wf-job-approved` no n8n
2. Clicar em `Edit` (ou simplesmente abrir — n8n abre em modo edicao)
3. **Anotar os nomes exatos dos nodes existentes**, especialmente:
   - Nome do node que retorna os dados do job (HTTP Request)
   - Nome do node que retorna os dados de sync-urls (HTTP Request)
   - Nome do node de WhatsApp Send (ultimo node principal)

### Passo 3 — Adicionar node N1 (Set — Montar Payload)

1. Clicar no `+` apos o node de sync-urls (ou apos o node que extrai URLs das pastas)
2. Selecionar **Set**
3. Nomear: `Set - Payload JOB_FECHADO_CRIACAO`
4. Adicionar cada campo conforme a tabela do item 4.4
5. Ajustar as referencias `$('Nome do Node')` para os nomes reais dos nodes no workflow
6. Salvar o node

### Passo 4 — Adicionar node N2 (Execute Workflow)

**Opcao A — Sub-workflow (preferencial se JOB_FECHADO_CRIACAO aceitar):**

1. Clicar no `+` apos o N1
2. Selecionar **Execute Workflow**
3. Nomear: `Execute - JOB_FECHADO_CRIACAO`
4. Em **Source**: selecionar `Database`
5. Em **Workflow**: selecionar `JOB_FECHADO_CRIACAO` na lista dropdown
6. Em **Mode**: selecionar `Run once for all items`
7. Habilitar **Wait for completion**: sim
8. Em **Settings** (engrenagem): habilitar **Continue on fail** = true
9. Salvar o node

**Opcao B — HTTP Request para webhook (se JOB_FECHADO_CRIACAO nao aceitar sub-workflow):**

1. Clicar no `+` apos o N1
2. Selecionar **HTTP Request**
3. Nomear: `HTTP - Chamar JOB_FECHADO_CRIACAO`
4. Metodo: `POST`
5. URL: URL do webhook do JOB_FECHADO_CRIACAO (obtida no Passo 1)
6. Body: `JSON` > `Raw` > `{{ JSON.stringify($json) }}`
7. Em **Settings** (engrenagem): habilitar **Continue on fail** = true
8. Salvar o node

### Passo 5 — Adicionar node N3 (IF — Verificar Erro)

1. Clicar no `+` apos o N2
2. Selecionar **IF**
3. Nomear: `IF - Sub-workflow com erro?`
4. Configurar condicao:
   - Value 1: `{{ $json.error }}`
   - Operation: `exists`
5. Salvar o node

### Passo 6 — Adicionar nodes N4 e N5 (Log)

**N4 — Branch de sucesso (output FALSE do IF):**
1. Conectar ao output `false` do N3
2. Selecionar **Set**
3. Nomear: `Set - Log Sucesso JFC`
4. Campo: `sub_workflow_status` = `success`
5. Campo: `sub_workflow_time` = `{{ $now.toISO() }}`
6. Salvar

**N5 — Branch de erro (output TRUE do IF):**
1. Conectar ao output `true` do N3
2. Selecionar **Set**
3. Nomear: `Set - Log Erro JFC`
4. Campo: `sub_workflow_status` = `error`
5. Campo: `sub_workflow_error` = `{{ $json.error?.message ?? 'Erro desconhecido' }}`
6. Campo: `sub_workflow_time` = `{{ $now.toISO() }}`
7. Salvar

### Passo 7 — Reconectar ao fluxo existente

1. Conectar **ambos** os outputs de N4 e N5 ao proximo node existente (WhatsApp Send ou o que vier depois no fluxo original)
2. Verificar que nenhuma conexao existente foi rompida

### Passo 8 — Teste de validacao

1. Ativar o workflow (se estiver inativo)
2. Executar manualmente com payload de teste:
   ```json
   {
     "workflow": "wf-job-approved",
     "job_id": "UUID_DE_UM_JOB_REAL",
     "job_title": "Job de Teste",
     "closed_value": 10000,
     "approval_type": "interna",
     "approved_by": "teste@ellahfilmes.com"
   }
   ```
3. Verificar no execution log:
   - N1 montou o payload corretamente (ver output do node)
   - N2 executou o JOB_FECHADO_CRIACAO (ver output: grupos criados)
   - N3 detectou sucesso (branch FALSE)
   - Workflow completou sem erro
4. Verificar no WhatsApp se os 4 grupos foram criados

**Teste de fallback (Z-API fora):**
1. Temporariamente desabilitar a Z-API ou alterar a URL no JOB_FECHADO_CRIACAO para uma URL invalida (em ambiente de teste)
2. Executar o wf-job-approved novamente
3. Verificar que:
   - N2 falhou (Z-API nao respondeu)
   - N3 detectou o erro (branch TRUE)
   - N5 registrou o erro no log
   - Workflow continuou e completou (sem marcar como falho)
   - WhatsApp Send do wf-job-approved funcionou normalmente

---

## 9. Dependencias e Pre-requisitos Tecnicos

### 9.1 Dados necessarios no n8n antes de implementar

| Item | Onde buscar |
|------|------------|
| ID do workflow `JOB_FECHADO_CRIACAO` | n8n UI > URL do workflow |
| Nomes exatos dos nodes do `wf-job-approved` | n8n UI > abrir o workflow |
| Campos esperados pelo `JOB_FECHADO_CRIACAO` | n8n UI > trigger do workflow |
| URL do webhook do `JOB_FECHADO_CRIACAO` | n8n UI > node de trigger |

### 9.2 Dados que o wf-job-approved precisa buscar do banco

O workflow pode nao buscar todos os dados necessarios atualmente. Se precisar adicionar buscas:

**Buscar dados do job (se ainda nao existe):**
```
Metodo: GET
URL:    https://etvapcxesaxhsvzgaane.supabase.co/rest/v1/jobs
        ?select=id,code,job_aba,title,client_id,agency_id
        &id=eq.{{ $json.job_id }}
Headers:
  apikey: [SUPABASE_ANON_KEY ou SERVICE_ROLE_KEY]
  Authorization: Bearer [KEY]
```

**Buscar nome do cliente:**
```
Metodo: GET
URL:    https://etvapcxesaxhsvzgaane.supabase.co/rest/v1/clients
        ?select=id,name
        &id=eq.{{ $('HTTP Request - Job').item.json[0].client_id }}
Headers: [mesmos acima]
```

**Buscar nome da agencia (opcional):**
```
Metodo: GET
URL:    https://etvapcxesaxhsvzgaane.supabase.co/rest/v1/agencies
        ?select=id,name
        &id=eq.{{ $('HTTP Request - Job').item.json[0].agency_id }}
Headers: [mesmos acima]
```

**Buscar URLs das pastas do Drive (apos sync-urls):**
```
Metodo: GET
URL:    https://etvapcxesaxhsvzgaane.supabase.co/rest/v1/drive_folders
        ?select=folder_key,url
        &job_id=eq.{{ $json.job_id }}
Headers: [mesmos acima]
```

### 9.3 Variaveis de ambiente no n8n

Verificar se as seguintes variaveis ja estao configuradas (provavelmente sim, da Fase 5):

| Variavel | Uso |
|----------|-----|
| `SUPABASE_URL` | URL base da API REST do Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role key para acesso ao banco |
| `N8N_WEBHOOK_SECRET` | Secret para validar callbacks do ELLAHOS |

---

## 10. Cenarios de Erro e Comportamento Esperado

| Cenario | Comportamento esperado |
|---------|----------------------|
| Z-API fora do ar | N2 falha, N3 detecta erro, N5 loga, workflow continua. Grupos NAO criados. |
| JOB_FECHADO_CRIACAO com erro interno | Mesmo comportamento do cenario acima. |
| Drive nao criou pastas (falha anterior) | URLs ficam vazias no payload. JOB_FECHADO_CRIACAO recebe strings vazias nos campos de pasta. Grupos sao criados sem URLs. |
| job_id invalido ou job deletado | HTTP Request de busca de dados retorna vazio. Verificar se ha IF de validacao antes do N1. |
| agency_id nulo (job sem agencia) | Campo `agencia` = string vazia. JOB_FECHADO_CRIACAO deve aceitar campo vazio. |
| Timeout do Execute Workflow (>5min) | n8n cancela a execucao do sub-workflow. Continue on fail garante continuidade. |
| Workflow JOB_FECHADO_CRIACAO desativado | Execute Workflow falha imediatamente. Continue on fail garante continuidade. |

**Principio geral:** Falhas na integracao com o `JOB_FECHADO_CRIACAO` NUNCA devem impedir que o `wf-job-approved` seja marcado como concluido com sucesso. Os grupos WhatsApp sao uma automacao complementar, nao um requisito critico do fluxo de aprovacao.

---

## 11. Verificacao de Idempotencia

O `wf-job-approved` pode ser executado mais de uma vez para o mesmo job se o `integration-processor` fizer retry (max 7 tentativas com backoff). Verificar:

1. **Drive create-structure:** A Edge Function ja e idempotente (cria somente se nao existe)
2. **JOB_FECHADO_CRIACAO:** Verificar se o workflow protege contra duplicatas de grupos WhatsApp. Se nao proteger, um segundo disparo criaria grupos duplicados.

**Recomendacao:** Se o `JOB_FECHADO_CRIACAO` nao for idempotente, adicionar um node `IF` antes do `N1` que verifica se os grupos ja foram criados (ex: checar uma variavel no banco ou no payload de retorno do drive).

Alternativa mais simples: garantir no ELLAHOS que o `idempotency_key: 'wf-approved:{job_id}'` na tabela `integration_events` previna multiplos disparos (ja esta implementado no codigo `approve.ts`).

---

## 12. Documentacao de Referencia

| Documento | Localizacao |
|-----------|------------|
| Arquitetura Fase 9 (secao 5.3) | `docs/architecture/fase-9-automacoes-architecture.md` |
| Plano de execucao Fase 9.4 | `docs/architecture/fase-9-execution-plan.md` |
| Edge Function approve.ts | `supabase/functions/jobs-status/handlers/approve.ts` |
| Edge Function sync-urls.ts | `supabase/functions/drive-integration/handlers/sync-urls.ts` |
| Estrutura de pastas Drive | `supabase/functions/_shared/google-drive-client.ts` |
| Integration client (event types) | `supabase/functions/_shared/integration-client.ts` |

---

## 13. Checklist de Conclusao da Fase 9.4

- [ ] Verificado o formato de entrada do `JOB_FECHADO_CRIACAO` (campos e nomes exatos)
- [ ] Verificado se `JOB_FECHADO_CRIACAO` aceita sub-workflow call ou apenas webhook
- [ ] Anotados os nomes exatos dos nodes existentes no `wf-job-approved`
- [ ] Node N1 (Set — Montar Payload) adicionado e configurado
- [ ] Node N2 (Execute Workflow ou HTTP Request) adicionado com Continue on fail habilitado
- [ ] Node N3 (IF — Verificar Erro) adicionado
- [ ] Nodes N4 e N5 (log sucesso/erro) adicionados
- [ ] Todos os nodes reconectados ao fluxo existente sem romper conexoes
- [ ] Teste com job real executado com sucesso (4 grupos WhatsApp criados)
- [ ] Teste de fallback validado (Z-API fora nao quebra o workflow)
- [ ] Workflow salvo e ativo no n8n
