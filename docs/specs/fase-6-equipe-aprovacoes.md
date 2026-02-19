# Fase 6: Gestao de Equipe + Aprovacoes -- Spec Completa

**Data:** 19/02/2026
**Status:** RASCUNHO -- aguardando validacao
**Autor:** Product Manager -- ELLAHOS
**Fase anterior:** Fase 5 (Integracoes Core) -- CONCLUIDA

---

## 1. Resumo Executivo

A Fase 6 entrega dois sistemas interligados que eliminam dois grandes gargalos operacionais.

**Problema 1 -- Alocacao cega de equipe:** Hoje nao ha visibilidade centralizada de quem esta em qual job. O PE descobre conflitos de agenda na hora errada.

**Problema 2 -- Aprovacoes informais:** Aprovacoes acontecem por WhatsApp, sem registro formal e sem historico rastreavel.

**Entregaveis da Fase 6:**
- Calendario de Alocacao: visualizacao mensal/semanal com alertas de conflito
- Sistema de Aprovacoes Formais: 5 tipos (briefing, orcamento detalhado, corte, finalizacao, entrega)
- People Detail Expandido: historico de jobs, metricas e disponibilidade
- Deteccao Inteligente de Conflitos: alertas quando mesma pessoa esta em 2+ jobs no mesmo periodo

---

## 2. Contexto e Estado Atual

### O que ja existe (nao alterar)

**Banco de dados (24 tabelas):**
- `job_team` -- alocacao implicita (sem periodo, sem deteccao de conflito)
- `people` -- cadastro de equipe interna e freelancers
- `job_shooting_dates` -- datas de filmagem por job (fonte primaria de conflito)
- `jobs` -- campos `approval_type`, `approved_by_name`, `approval_date` -- aprovacao simples

**Frontend existente:**
- `TabEquipe` no job detail -- CRUD de membros da equipe
- `PersonDetailTabs` -- aba Jobs como placeholder (sem conteudo real)
- `TabDiarias` -- CRUD de datas de filmagem

**Edge Functions existentes:**
- `jobs-team` -- CRUD de membros
- `jobs-status/approve.ts` -- aprovacao COMERCIAL do job (muda status para aprovado_selecao_diretor)

**Aprovacao atual:** Esta e a aprovacao COMERCIAL. A Fase 6 cria um sistema PARALELO para aprovacoes de conteudo.

### O que a Fase 6 cria

| Item | Descricao |
|------|----------|
| 3 tabelas novas | `allocations`, `approval_requests`, `approval_logs` |
| 2 Edge Functions | `allocations`, `approvals` |
| 3 telas novas | /team/calendar, /approvals, People Detail expandido |
| 1 pagina publica | /approve/[token] sem autenticacao |
| 12+ componentes React | Calendario, aprovacoes, conflitos |
| 27 tabelas total | 24 existentes + 3 novas |

---

## 3. Personas

**PE -- Produtor Executivo:** Aprova viabilidade, aloca equipe, garante margem e prazo. Precisa de visao consolidada de todos os jobs ativos e equipe disponivel.

**Coordenador de Producao:** Gerencia execucao operacional. Precisa saber quem esta disponivel antes de confirmar datas de filmagem.

**Diretor:** Participa de pre-producao e filmagem. Precisa saber com antecedencia quais jobs estao confirmados para planejar agenda.

**Financeiro:** Acompanha aprovacao de orcamentos. Precisa de registro formal para emissao de NF e controle de recebimento.

**CEO:** Visao estrategica. Quer saber se equipe esta sobrecarregada e quais aprovacoes estao pendentes.

**Cliente (externo):** Recebe link por WhatsApp para aprovar conteudo. NAO tem acesso ao ELLAHOS -- aprova via link publico com token de 30 dias.

---

## 4. User Stories

### 4.1 Alocacoes e Calendario

**US-601 -- Alocar membro com periodo**
Como Coordenador de Producao, quero registrar o periodo de alocacao ao adicionar um membro ao job, para que o sistema detecte conflitos automaticamente.

Criterios de aceite:
- CA-601.1: Campos `allocation_start` e `allocation_end` no formulario de adicionar/editar membro
- CA-601.2: Se datas preenchidas, sistema verifica conflito ao salvar
- CA-601.3: Conflito exibe warning amarelo -- nao bloqueia o save
- CA-601.4: Warning especifica quais jobs estao sobrepostos e em quais datas
- CA-601.5: Membro salvo com sucesso mesmo com conflito detectado

**US-602 -- Visualizar calendario de alocacoes**
Como PE, quero ver um calendario mensal com todas as alocacoes por job e pessoa, para ter visibilidade de quem esta ocupado em qual periodo.

Criterios de aceite:
- CA-602.1: Rota /team/calendar acessivel pelo menu lateral em Equipe
- CA-602.2: Vista mensal com barras horizontais por pessoa (estilo Gantt simplificado)
- CA-602.3: Cada barra tem cor do job e tooltip com nome do job e role
- CA-602.4: Alternancia entre vista mensal e semanal
- CA-602.5: Filtro por pessoa, role e status do job (ativos por padrao)
- CA-602.6: Conflitos destacados em vermelho (pessoa com 2+ barras sobrepostas)

**US-603 -- Ver disponibilidade antes de alocar**
Como Coordenador de Producao, quero ver a disponibilidade de uma pessoa ao escolhe-la para um job, para evitar conflitos antes de salvar.

Criterios de aceite:
- CA-603.1: Ao selecionar pessoa, exibe mini-calendario com alocacoes existentes
- CA-603.2: Periodo com conflito aparece marcado em vermelho
- CA-603.3: Pessoa sem alocacoes futuras exibe mensagem de disponibilidade confirmada

**US-604 -- Alerta de conflito no job detail**
Como PE, quero ver um banner de alerta na aba Equipe quando ha conflitos, para saber imediatamente ao abrir o job.

Criterios de aceite:
- CA-604.1: Banner amarelo no topo da TabEquipe quando ha 1 ou mais conflitos
- CA-604.2: Banner lista nome das pessoas em conflito e os jobs concorrentes
- CA-604.3: Banner tem link para detalhe do conflito no calendario
- CA-604.4: Banner desaparece se conflitos forem resolvidos

**US-605 -- Editar periodo de alocacao**
Como Coordenador de Producao, quero editar o periodo de alocacao de um membro ja adicionado, para corrigir datas quando o cronograma muda.

Criterios de aceite:
- CA-605.1: Botao editar na linha do membro abre formulario com dados pre-preenchidos
- CA-605.2: Ao salvar, revalida conflitos com os novos dados
- CA-605.3: Audit log registra a alteracao (quem, quando, antes e depois)

**US-606 -- Painel de conflitos ativos**
Como CEO, quero ver todos os conflitos ativos de equipe em todos os jobs, para ter visao estrategica de sobrecarga.

Criterios de aceite:
- CA-606.1: Secao de conflitos ativos no calendario de equipe
- CA-606.2: Lista conflitos com: pessoa, Job A, Job B, periodo de sobreposicao
- CA-606.3: Link direto para cada job a partir do conflito
- CA-606.4: Badge com contador de conflitos no menu lateral

### 4.2 Aprovacoes Formais

**US-610 -- Criar solicitacao de aprovacao**
Como Coordenador de Producao, quero criar uma solicitacao de aprovacao formal para um job, para substituir o fluxo informal por WhatsApp.

Criterios de aceite:
- CA-610.1: Botao Nova Aprovacao na aba Aprovacoes do job detail
- CA-610.2: Formulario com campos: tipo (5 valores), titulo, descricao, arquivo/link opcional, aprovador externo (email) ou interno (pessoa do sistema)
- CA-610.3: Ao criar, gera token UUID unico com validade de 30 dias
- CA-610.4: Status inicial: `pending`
- CA-610.5: Notificacao enviada ao aprovador (email ou WhatsApp dependendo do tipo)
- CA-610.6: Registro em `approval_logs` com acao `created`

**US-611 -- Listar aprovacoes de um job**
Como Coordenador de Producao, quero ver todas as aprovacoes de um job em uma aba dedicada, para acompanhar pendentes, aprovados e rejeitados.

Criterios de aceite:
- CA-611.1: Nova aba Aprovacoes no job detail (7a aba)
- CA-611.2: Lista com: tipo, titulo, status (badge colorido), data criacao, aprovador, data resposta
- CA-611.3: Filtro por status (todos / pendentes / aprovados / rejeitados)
- CA-611.4: Botao de reenviar link para aprovacoes pendentes
- CA-611.5: Expandir linha mostra historico de acoes (criada, reenviada, aprovada/rejeitada)

**US-612 -- Aprovar via link publico (cliente externo)**
Como Cliente externo, quero receber um link e aprovar o conteudo sem precisar de login, para que o processo seja simples e rapido.

Criterios de aceite:
- CA-612.1: Pagina publica /approve/[token] -- sem autenticacao requerida
- CA-612.2: Pagina exibe: nome do job (sem dados sensiveis), tipo de aprovacao, titulo, descricao, arquivo/link para review
- CA-612.3: Botoes Aprovar e Rejeitar
- CA-612.4: Ao rejeitar, campo de comentario obrigatorio
- CA-612.5: Apos resposta, pagina confirma e nao permite segunda resposta
- CA-612.6: Token expirado exibe mensagem de erro com instrucao para solicitar novo link
- CA-612.7: Resposta registra IP e timestamp para auditoria

**US-613 -- Aprovar internamente**
Como PE, quero aprovar uma solicitacao diretamente no ELLAHOS, para aprovacoes internas que nao precisam de link externo.

Criterios de aceite:
- CA-613.1: Botoes Aprovar e Rejeitar visiveis para aprovacoes internas com status pending
- CA-613.2: Comentario opcional para aprovacao, obrigatorio para rejeicao
- CA-613.3: Status atualiza imediatamente na lista
- CA-613.4: Notificacao enviada ao criador da solicitacao

**US-614 -- Reenviar link de aprovacao**
Como Coordenador de Producao, quero reenviar o link de aprovacao para o cliente, para quando o link nao foi recebido ou expirou.

Criterios de aceite:
- CA-614.1: Botao Reenviar Link em aprovacoes com status `pending` ou `expired`
- CA-614.2: Para aprovacoes expiradas, gera novo token com nova validade de 30 dias
- CA-614.3: Para aprovacoes pendentes, reenvia o mesmo link sem gerar novo token
- CA-614.4: Log registra o reenvio com timestamp

**US-615 -- Historico de aprovacoes**
Como Financeiro, quero ver o historico completo de uma aprovacao de orcamento, para ter registro formal antes de emitir NF.

Criterios de aceite:
- CA-615.1: Expandir aprovacao exibe linha do tempo: criada > reenviada (0 ou mais) > aprovada ou rejeitada
- CA-615.2: Cada evento mostra: acao, autor, timestamp
- CA-615.3: Para aprovacoes de cliente externo, mostra IP e timestamps de acesso ao link
- CA-615.4: Conteudo exportavel como texto simples

**US-616 -- Visao global de aprovacoes pendentes**
Como PE, quero ver uma pagina centralizada com todas as aprovacoes pendentes de todos os jobs, para nao perder nenhuma solicitacao.

Criterios de aceite:
- CA-616.1: Rota /approvals acessivel pelo menu lateral
- CA-616.2: Lista com: job, tipo, titulo, aprovador, ha quantos dias pendente
- CA-616.3: Ordenacao por mais antigas primeiro (default)
- CA-616.4: Filtro por tipo de aprovacao e por job
- CA-616.5: Click na linha abre o job na aba Aprovacoes
- CA-616.6: Aprovacoes com mais de 7 dias pendentes destacadas em vermelho

### 4.3 People Detail Expandido

**US-620 -- Ver historico de jobs de uma pessoa**
Como PE, quero ver o historico de todos os jobs que uma pessoa participou, para avaliar experiencia antes de alocar em novo projeto.

Criterios de aceite:
- CA-620.1: Aba Jobs no PersonDetail exibe lista de jobs com: codigo, titulo, role, periodo, status do job
- CA-620.2: Ordenacao por data mais recente primeiro
- CA-620.3: Filtro por status (ativos / concluidos / todos)
- CA-620.4: Click no job abre o job detail

**US-621 -- Ver disponibilidade atual de uma pessoa**
Como Coordenador de Producao, quero ver os proximos 30 dias de agenda de uma pessoa no PersonDetail, para decidir se ela esta disponivel para novo job.

Criterios de aceite:
- CA-621.1: Secao Disponibilidade na aba Jobs do PersonDetail
- CA-621.2: Mini-calendario dos proximos 30 dias com dias ocupados marcados (cor do job)
- CA-621.3: Tooltip nos dias ocupados exibe nome do job
- CA-621.4: Dias sem alocacao exibidos em verde claro

**US-622 -- Ver metricas de uma pessoa**
Como PE, quero ver metricas simples no PersonDetail, para ter visao rapida do perfil de trabalho de cada pessoa.

Criterios de aceite:
- CA-622.1: Cards de metricas: total de jobs, jobs ativos, role mais frequente
- CA-622.2: Metricas calculadas em tempo real
- CA-622.3: Apenas jobs nao deletados do mesmo tenant


---

## 5. Regras de Negocio

### 5.1 Regras de Alocacao

**RN-601 -- Conflito alerta, nao bloqueia**
O sistema NUNCA bloqueia o salvamento de uma alocacao por causa de conflito. O conflito e exibido como warning e o usuario decide se quer continuar. Decisao definitiva do CEO registrada em docs/ELLAHOS_Respostas_e_Contexto_Operacional.md.

**RN-602 -- Definicao de conflito**
Conflito existe quando a mesma pessoa (`people.id`) tem alocacoes em 2 ou mais jobs com periodos sobrepostos. Dois periodos se sopoem quando: `start_A <= end_B AND end_A >= start_B`.

**RN-603 -- Alocacao sem datas**
Membros de equipe sem `allocation_start`/`allocation_end` NAO participam da deteccao de conflito. Datas sao opcionais para compatibilidade retroativa com registros existentes em `job_team`.

**RN-604 -- Fonte primaria de conflito**
A tabela `allocations` e a fonte de verdade para periodos de alocacao. As datas em `job_shooting_dates` sao usadas apenas como referencia visual no calendario, nao entram no algoritmo de conflito.

**RN-605 -- Alocacao em jobs cancelados**
Jobs com status `cancelado` ou `pausado` NAO geram conflito. O algoritmo ignora alocacoes em jobs com esses status.

**RN-606 -- Restricao de tenant**
Conflitos so sao detectados dentro do mesmo tenant. Um freelancer que trabalha para duas producoras diferentes nao gera conflito no ELLAHOS.

### 5.2 Regras de Aprovacoes

**RN-610 -- Tipos de aprovacao validos**
Cinco tipos permitidos: `briefing`, `orcamento_detalhado`, `corte`, `finalizacao`, `entrega`. Tipo nao pode ser alterado apos criacao.

**RN-611 -- Status permitidos**
Fluxo de status: `pending` > `approved` ou `rejected`. Status `expired` e setado automaticamente quando `expires_at` < NOW() e status ainda e `pending`. Nao existe transicao de volta para `pending` -- deve criar nova solicitacao.

**RN-612 -- Token de aprovacao publica**
Token e UUID v4 gerado no servidor. Validade padrao: 30 dias a partir da criacao. Token e unico por solicitacao. Ao reenviar para aprovacao expirada, novo token e gerado e o antigo se torna invalido.

**RN-613 -- Dados exibidos na pagina publica**
A pagina /approve/[token] NAO exibe: razao social da producao, valores financeiros, nomes de outros clientes, dados de equipe interna. Exibe apenas: titulo da aprovacao, descricao, tipo, e link/arquivo para review.

**RN-614 -- Comentario na rejeicao**
Rejeicao sem comentario nao e permitida. O campo de motivo da rejeicao e obrigatorio tanto na aprovacao publica (cliente) quanto na aprovacao interna.

**RN-615 -- Separacao das aprovacoes comercial e de conteudo**
A aprovacao comercial do job (campo `approval_type` na tabela `jobs`, status `aprovado_selecao_diretor`) NAO e afetada pelo novo sistema. Os dois sistemas coexistem independentemente.

**RN-616 -- Multiplas aprovacoes por tipo**
Um job pode ter multiplas aprovacoes do mesmo tipo (ex: 3 rodadas de aprovacao de corte). Nao ha restricao de unicidade por tipo/job.

**RN-617 -- Auditoria imutavel**
Registros em `approval_logs` sao imutaveis. Nenhuma operacao de UPDATE ou DELETE e permitida nessa tabela. Apenas INSERT.

**RN-618 -- Expiracao por pg_cron**
Job pg_cron roda diariamente (00:01 BRT) e marca como `expired` todas as aprovacoes com `expires_at` < NOW() e status `pending`.


---

## 6. Tipos de Aprovacao e seus Fluxos

| Tipo | Quando usar | Quem aprova | Canal padrao |
|------|-------------|-------------|-------------|
| `briefing` | Confirmacao do briefing inicial | Cliente (externo) | Link publico via WhatsApp |
| `orcamento_detalhado` | Aprovacao de orcamento detalhado | Cliente ou PE (interno) | Link publico ou aprovacao interna |
| `corte` | Aprovacao de corte de edicao | Cliente (externo) | Link publico via WhatsApp |
| `finalizacao` | Aprovacao da versao finalizada | Cliente (externo) | Link publico via WhatsApp |
| `entrega` | Confirmacao de recebimento da entrega | Cliente (externo) | Link publico via WhatsApp |

### 6.1 Fluxo de Aprovacao Externa (Cliente)

**Passo a passo:**

1. Coordenador de producao cria solicitacao de aprovacao
2. Sistema gera token UUID com validade de 30 dias
3. Notificacao enviada ao cliente via WhatsApp por n8n
4. Cliente acessa pagina /approve/[token]
5a. Cliente aprova: status muda para approved, notificacao enviada ao coordenador
5b. Cliente rejeita: comentario obrigatorio, status muda para rejected, notificacao enviada ao coordenador
5c. Cliente nao responde ate expires_at: pg_cron marca como expired

### 6.2 Fluxo de Aprovacao Interna

**Passo a passo:**

1. Coordenador cria solicitacao com aprovador interno do sistema
2. Notificacao in-app e WhatsApp enviada ao aprovador
3. Aprovador acessa aba Aprovacoes no job detail
4a. Aprovador clica Aprovar: comentario opcional, status muda para approved, notificacao ao criador
4b. Aprovador clica Rejeitar: comentario obrigatorio, status muda para rejected, notificacao ao criador

### 6.3 Reenvio e Expiracao

**Passo a passo:**

1. Aprovacao com status expired detectada
2. Coordenador clica em Reenviar Link
3. Sistema invalida token antigo e gera novo token com nova validade de 30 dias
4. Status volta para pending
5. Notificacao reenviada ao cliente


---

## 7. Deteccao de Conflitos -- Algoritmo

### 7.1 Logica de Deteccao

A deteccao e feita via query SQL na Edge Function. Condicoes para conflito:
- Mesma `people_id` e mesmo `tenant_id`
- Job diferente do atual
- Status do job NOT IN (cancelado, pausado)
- Sobreposicao de datas: `start_A <= end_B AND end_A >= start_B`
- Registro nao deletado

### 7.2 Resposta da Edge Function

Quando conflito detectado, retorno HTTP 200 com campo `warnings` preenchido.
O campo `data` contem a alocacao salva normalmente.
Cada warning inclui: code (ALLOCATION_CONFLICT), message descritiva, e detalhes com person_name, conflicting_job_code, conflicting_job_title, overlap_start, overlap_end.

### 7.3 Exibicao no Frontend

- Warning aparece como toast amarelo com detalhes do conflito
- O dialogo de adicionar/editar membro permanece aberto para o usuario decidir
- Botao de confirmar mesmo assim: salva e fecha o dialogo
- Botao de cancelar: fecha sem salvar
- Se multiplos conflitos, todos listados no mesmo aviso


---

## 8. Schema do Banco de Dados

### 8.1 Tabela: allocations

Armazena periodos de alocacao de membros de equipe em jobs. Complementa `job_team` com informacoes de periodo.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|----------|
| id | uuid | PK, default gen_random_uuid() | Identificador unico |
| tenant_id | uuid | FK tenants, NOT NULL | Tenant do registro |
| job_id | uuid | FK jobs, NOT NULL | Job ao qual se refere |
| people_id | uuid | FK people, NOT NULL | Pessoa alocada |
| job_team_id | uuid | FK job_team, nullable | Vinculo com membro de equipe |
| allocation_start | date | NOT NULL | Inicio do periodo de alocacao |
| allocation_end | date | NOT NULL | Fim do periodo de alocacao |
| notes | text | nullable | Observacoes sobre a alocacao |
| created_by | uuid | FK profiles, NOT NULL | Quem criou o registro |
| created_at | timestamptz | NOT NULL, default now() | Data de criacao |
| updated_at | timestamptz | NOT NULL, default now() | Data de atualizacao |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: `allocation_end >= allocation_start`
- INDEX: `(tenant_id, people_id, allocation_start, allocation_end)` para performance do algoritmo de conflito
- INDEX: `(tenant_id, job_id)`

### 8.2 Tabela: approval_requests

Armazena solicitacoes de aprovacao de conteudo. Sistema paralelo e independente da aprovacao comercial.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|----------|
| id | uuid | PK, default gen_random_uuid() | Identificador unico |
| tenant_id | uuid | FK tenants, NOT NULL | Tenant do registro |
| job_id | uuid | FK jobs, NOT NULL | Job relacionado |
| approval_type | text | NOT NULL, ENUM | briefing / orcamento_detalhado / corte / finalizacao / entrega |
| title | text | NOT NULL | Titulo descritivo |
| description | text | nullable | Descricao detalhada |
| file_url | text | nullable | Link para arquivo de review |
| status | text | NOT NULL, default pending | pending / approved / rejected / expired |
| token | uuid | NOT NULL, UNIQUE | Token publico para acesso sem autenticacao |
| expires_at | timestamptz | NOT NULL | Data de expiracao do token |
| approver_type | text | NOT NULL | external (email) ou internal (people_id) |
| approver_email | text | nullable | Email do aprovador externo |
| approver_people_id | uuid | FK people, nullable | Pessoa interna aprovadora |
| approver_phone | text | nullable | Telefone para WhatsApp |
| approved_at | timestamptz | nullable | Data da resposta |
| rejection_reason | text | nullable | Motivo da rejeicao |
| approved_ip | text | nullable | IP de quem aprovou/rejeitou |
| created_by | uuid | FK profiles, NOT NULL | Quem criou a solicitacao |
| created_at | timestamptz | NOT NULL, default now() | Data de criacao |
| updated_at | timestamptz | NOT NULL, default now() | Data de atualizacao |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: `approval_type IN (briefing, orcamento_detalhado, corte, finalizacao, entrega)`
- CHECK: `status IN (pending, approved, rejected, expired)`
- CHECK: `approver_type IN (external, internal)`
- CHECK: quando approver_type = external, approver_email NOT NULL
- CHECK: quando approver_type = internal, approver_people_id NOT NULL
- INDEX: `(tenant_id, job_id, status)`
- INDEX: `(token)` WHERE deleted_at IS NULL (busca por token publico)

### 8.3 Tabela: approval_logs

Audit trail imutavel de todas as acoes em solicitacoes de aprovacao.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|----------|
| id | uuid | PK, default gen_random_uuid() | Identificador unico |
| tenant_id | uuid | FK tenants, NOT NULL | Tenant do registro |
| approval_request_id | uuid | FK approval_requests, NOT NULL | Solicitacao relacionada |
| action | text | NOT NULL | created / sent / resent / approved / rejected / expired |
| actor_type | text | NOT NULL | user (interno) ou external (cliente) |
| actor_id | uuid | FK profiles, nullable | Perfil do usuario interno que executou a acao |
| actor_ip | text | nullable | IP do ator (principalmente para cliente externo) |
| comment | text | nullable | Comentario de aprovacao ou motivo de rejeicao |
| metadata | jsonb | nullable | Dados adicionais (ex: novo token gerado, email reenviado para) |
| created_at | timestamptz | NOT NULL, default now() | Timestamp da acao |

Constraints:
- Sem coluna updated_at (imutavel)
- Sem coluna deleted_at (imutavel)
- CHECK: `action IN (created, sent, resent, approved, rejected, expired)`
- CHECK: `actor_type IN (user, external)`
- INDEX: `(tenant_id, approval_request_id, created_at)`

### 8.4 Alteracoes em Tabelas Existentes

Nenhuma alteracao em tabelas existentes e necessaria para a Fase 6.

**Tabela `job_team`:** Os campos `allocation_start` e `allocation_end` serao adicionados como colunas opcionais para manter compatibilidade com registros existentes.

| Coluna nova | Tipo | Descricao |
|------------|------|----------|
| allocation_start | date | nullable -- inicio da alocacao neste job |
| allocation_end | date | nullable -- fim da alocacao neste job |

### 8.5 RLS Policies

**allocations:**
- SELECT: `tenant_id = get_tenant_id()`
- INSERT: `tenant_id = get_tenant_id()`
- UPDATE: `tenant_id = get_tenant_id()`
- DELETE: nao permitido (soft delete via deleted_at)

**approval_requests:**
- SELECT: `tenant_id = get_tenant_id()` (para usuarios autenticados)
- SELECT publico: via funcao especial que valida token (sem RLS, usada pela Edge Function)
- INSERT: `tenant_id = get_tenant_id()`
- UPDATE: `tenant_id = get_tenant_id()`

**approval_logs:**
- SELECT: `tenant_id = get_tenant_id()`
- INSERT: `tenant_id = get_tenant_id()`
- UPDATE: nao permitido (imutavel)
- DELETE: nao permitido (imutavel)


---

## 9. Edge Functions

### 9.1 Edge Function: allocations

**Rota base:** /functions/v1/allocations

**Handlers:**

| Metodo | Acao | Descricao |
|--------|------|----------|
| GET /allocations?job_id=X | list-by-job | Lista alocacoes de um job |
| GET /allocations?people_id=X&from=Y&to=Z | list-by-person | Alocacoes de uma pessoa em periodo |
| POST /allocations | create | Cria alocacao (detecta conflito) |
| PUT /allocations/:id | update | Atualiza periodo (re-detecta conflito) |
| DELETE /allocations/:id | soft-delete | Soft delete |
| GET /allocations/conflicts?from=Y&to=Z | get-conflicts | Lista todos conflitos ativos no periodo |

**Payload de create/update:**
- job_id (obrigatorio no create)
- people_id (obrigatorio no create)
- job_team_id (opcional)
- allocation_start (obrigatorio)
- allocation_end (obrigatorio)
- notes (opcional)

**Comportamento de conflito:**
- Executa query de deteccao
- Se conflitos: retorna 200 com data + warnings (array de conflitos)
- Se sem conflitos: retorna 200 com data + warnings vazio
- NUNCA retorna 4xx por causa de conflito

### 9.2 Edge Function: approvals

**Rota base:** /functions/v1/approvals

**Handlers (autenticados):**

| Metodo | Acao | Descricao |
|--------|------|----------|
| GET /approvals?job_id=X | list-by-job | Lista aprovacoes de um job |
| GET /approvals/pending | list-pending | Lista todas pendentes do tenant |
| POST /approvals | create | Cria solicitacao de aprovacao |
| POST /approvals/:id/resend | resend | Reenvia link ou gera novo token |
| POST /approvals/:id/approve | approve-internal | Aprovacao interna |
| POST /approvals/:id/reject | reject-internal | Rejeicao interna |
| GET /approvals/:id/logs | get-logs | Historico de acoes |

**Handler publico (sem autenticacao):**

| Metodo | Acao | Descricao |
|--------|------|----------|
| GET /approvals/public/:token | get-by-token | Retorna dados da aprovacao pelo token |
| POST /approvals/public/:token/respond | respond | Envia resposta (aprova ou rejeita) |

**Payload de create:**
- job_id (obrigatorio)
- approval_type (obrigatorio, enum)
- title (obrigatorio)
- description (opcional)
- file_url (opcional)
- approver_type (obrigatorio: external ou internal)
- approver_email (obrigatorio se external)
- approver_phone (opcional, para WhatsApp)
- approver_people_id (obrigatorio se internal)

**Payload de respond (publico):**
- action (obrigatorio: approved ou rejected)
- comment (obrigatorio se rejected)

**Seguranca do endpoint publico:**
- Nao requer Authorization header
- Valida token via query direta no banco
- Verifica expires_at
- Rate limit: maximo 10 requests por token por hora
- Registra IP de cada acesso


---

## 10. Frontend -- Telas e Componentes

### 10.1 Tela: /team/calendar

**Localizacao no menu:** Equipe > Calendario

**Componentes:**
- `TeamCalendarPage` -- pagina principal
- `AllocationGantt` -- vista tipo Gantt com barras por pessoa e job
- `MonthSwitcher` -- navegacao mensal/semanal
- `ConflictList` -- painel lateral com conflitos ativos
- `CalendarFilters` -- filtros de pessoa, role e status

**Dados necessarios:**
- GET /allocations com filtro de periodo e tenant
- GET /allocations/conflicts para o painel lateral

### 10.2 Tela: /approvals

**Localizacao no menu:** Aprovacoes (item de menu dedicado)

**Componentes:**
- `ApprovalsPage` -- pagina principal
- `ApprovalsPendingList` -- lista de aprovacoes pendentes ordenadas por mais antigas
- `ApprovalStatusBadge` -- badge com cor por status
- `ApprovalsFilters` -- filtros por tipo e por job

**Dados necessarios:**
- GET /approvals/pending

### 10.3 Tela: /approve/[token] (publica)

**Localizacao:** Pagina publica sem autenticacao, rota em Next.js App Router

**Componentes:**
- `PublicApprovalPage` -- pagina publica minimalista
- `ApprovalReviewContent` -- exibe titulo, descricao, link para arquivo
- `ApprovalResponseForm` -- botoes Aprovar e Rejeitar + campo de comentario
- `ApprovalExpiredView` -- mensagem de token expirado
- `ApprovalAlreadyRespondedView` -- mensagem de aprovacao ja respondida

**Dados necessarios:**
- GET /approvals/public/[token]
- POST /approvals/public/[token]/respond

**Design:**
- Layout minimalista: logo da producora (se configurado), card centralizado
- Sem sidebar, sem header de navegacao
- Mobile-first (cliente acessa pelo celular via link do WhatsApp)
- Tema claro por padrao (clientes externos nao tem preferencia de tema configurada)

### 10.4 Modificacoes em Telas Existentes

**Job Detail -- nova aba Aprovacoes:**
- Adicionar `aprovacoes` ao array `JOB_DETAIL_TABS` em constants.ts
- Criar `TabAprovacoes` em frontend/src/components/job-detail/tabs/
- `TabAprovacoes` contem: lista de aprovacoes + botao Nova Aprovacao + dialogo de criacao

**Job Detail -- TabEquipe (modificacao):**
- Adicionar campos allocation_start e allocation_end ao `TeamMemberDialog`
- Exibir warning de conflito no toast e no banner da aba quando detectado
- Mostrar periodo de alocacao na linha de cada membro (se preenchido)

**PersonDetail -- aba Jobs (implementacao):**
- Substituir placeholder pelo conteudo real em `PersonDetailTabs`
- Cards de metricas (total jobs, jobs ativos, role mais frequente)
- Mini-calendario de disponibilidade dos proximos 30 dias
- Lista paginada de historico de jobs

### 10.5 Hooks e Queries

| Hook | Edge Function | Descricao |
|------|---------------|-----------|
| `useAllocations` | allocations | Lista alocacoes por job ou por pessoa |
| `useCreateAllocation` | allocations | Cria nova alocacao |
| `useUpdateAllocation` | allocations | Atualiza alocacao |
| `useConflicts` | allocations/conflicts | Lista conflitos ativos |
| `useApprovals` | approvals | Lista aprovacoes por job |
| `usePendingApprovals` | approvals/pending | Lista pendentes do tenant |
| `useCreateApproval` | approvals | Cria solicitacao |
| `useResendApproval` | approvals/:id/resend | Reenvio |
| `usePublicApproval` | approvals/public/:token | Para pagina publica |
| `useRespondApproval` | approvals/public/:token/respond | Resposta publica |


---

## 11. Fora de Escopo

Os seguintes itens estao EXPLICITAMENTE fora do escopo da Fase 6:

1. **Calendario de elenco:** Alocacao de atores e modelos (elenco) sera tratada em fase especifica de Casting
2. **Assinatura digital em aprovacoes:** O fluxo de assinatura digital com DocuSeal e tratado em Fase de Contratos -- a Fase 6 apenas registra aprovacao por clique
3. **Integracao com agenda externa:** Sincronizacao com Google Calendar ou Outlook fica para versao futura
4. **Aprovacao por video:** Upload de video diretamente no ELLAHOS para review -- apenas links externos (Drive, Vimeo, Frame.io) sao suportados
5. **Workflow de aprovacao em multiplos estagios:** Aprovacao sequencial A->B->C em cadeia nao esta contemplada -- cada aprovacao e independente
6. **Notificacoes push:** Push notifications nativas mobile estao fora -- apenas WhatsApp e in-app
7. **Portal do cliente com login:** Cliente nao tem acesso autenticado ao ELLAHOS -- apenas links publicos por token
8. **Relatorios de performance de equipe:** Metricas avancadas de produtividade ficam para modulo de BI
9. **Gestao de contratos com freelancers:** NDA, contrato de prestacao de servicos -- e responsabilidade do modulo de Contratos
10. **Recorrencia de alocacoes:** Alocar automaticamente mesma equipe em jobs recorrentes


---

## 12. Dependencias e Pre-requisitos

### 12.1 Pre-requisitos Tecnicos

| Dependencia | Status | Onde e usado |
|-------------|--------|-------------|
| Fase 4: tabela `people` | CONCLUIDA | Vinculo de alocacoes e aprovacoes |
| Fase 4: tabela `job_team` | CONCLUIDA | Alocacao complementa job_team |
| Fase 5: pg_cron configurado | CONCLUIDA | Expiracao automatica de aprovacoes |
| Fase 5: integration_events | CONCLUIDA | Notificacoes de aprovacao (ADR-003) |
| Fase 5: n8n workflows | CONCLUIDA | Envio de WhatsApp para aprovadores |
| Fase 5: sistema de notificacoes | CONCLUIDA | Notificacoes in-app para aprovadores internos |

### 12.2 Dependencias da Fase 6

- A tabela `allocations` deve ser criada ANTES de adicionar campos de periodo ao `job_team`
- A Edge Function `approvals` depende das tabelas `approval_requests` e `approval_logs`
- A pagina publica /approve/[token] depende da Edge Function estar deployada
- Os workflows n8n de notificacao de aprovacao devem ser configurados antes do go-live

### 12.3 Ordem de Implementacao Sugerida

1. Migrations: tabelas `allocations`, `approval_requests`, `approval_logs` + alterar `job_team`
2. Edge Function `allocations` com deteccao de conflito
3. Edge Function `approvals` (handlers autenticados)
4. Edge Function `approvals` (handlers publicos)
5. Frontend: modificar TabEquipe (campos de alocacao + warning)
6. Frontend: tela /team/calendar
7. Frontend: nova aba Aprovacoes no job detail
8. Frontend: tela /approvals (visao global)
9. Frontend: pagina publica /approve/[token]
10. Frontend: People Detail -- aba Jobs com conteudo real
11. n8n: workflows de notificacao de aprovacao
12. pg_cron: job de expiracao automatica


---

## 13. Criterio de Done da Fase 6

A Fase 6 e considerada CONCLUIDA quando:

### 13.1 Backend (Banco e Edge Functions)

- [ ] Migration 015: tabelas `allocations`, `approval_requests`, `approval_logs` criadas com RLS
- [ ] Migration 016: colunas `allocation_start` e `allocation_end` adicionadas ao `job_team`
- [ ] Edge Function `allocations` deployed e funcional (6 handlers)
- [ ] Edge Function `approvals` deployed e funcional (8 handlers autenticados + 2 publicos)
- [ ] Algoritmo de conflito testado: detecta sobreposicao, ignora cancelados/pausados, ignora sem datas
- [ ] Endpoint publico testado: valida token, bloqueia expirados, registra IP
- [ ] pg_cron job de expiracao configurado e testado

### 13.2 Frontend

- [ ] TabEquipe: campos de periodo de alocacao funcionais + warning de conflito
- [ ] /team/calendar: vista Gantt com alternancia mensal/semanal e filtros
- [ ] /team/calendar: painel de conflitos ativos com links para jobs
- [ ] Job detail: 7a aba Aprovacoes com lista e formulario de criacao
- [ ] /approvals: lista global de pendentes com filtros e ordenacao
- [ ] /approve/[token]: pagina publica mobile-first com botoes de resposta
- [ ] PersonDetail aba Jobs: metricas + mini-calendario + historico paginado

### 13.3 Qualidade

- [ ] Sem TypeScript errors em modo strict
- [ ] Sem N+1 queries nas listagens
- [ ] Responsivo mobile em todas as telas novas
- [ ] Dark mode funcionando em todas as telas novas
- [ ] Pagina publica /approve/[token] testada em dispositivo mobile real
- [ ] Testes manuais: criar aprovacao > enviar > aprovar como cliente > verificar status
- [ ] Testes manuais: alocar pessoa com conflito > confirmar warning > salvar


---

## 14. Perguntas Abertas

As seguintes questoes precisam de resposta antes de iniciar a implementacao:

**P1 -- Notificacao de aprovacao por email vs WhatsApp**
Para aprovadores externos, o canal padrao e WhatsApp. Mas nem todos os clientes tem WhatsApp. Devemos suportar envio por email como alternativa? Se sim, precisamos configurar um provedor de email transacional (Resend, SendGrid).

**P2 -- Branding na pagina publica de aprovacao**
A pagina /approve/[token] deve mostrar o logo da producora ou um logo neutro do ELLAHOS? Se for da producora, precisamos de um campo de upload de logo no cadastro do tenant.

**P3 -- Permissoes por role interno**
Quem pode criar solicitacoes de aprovacao? Qualquer usuario do tenant ou apenas roles especificos (PE, Coordenador)? E quem pode ver a aba Aprovacoes?

**P4 -- Limite de aprovacoes ativas**
Existe algum limite de aprovacoes pendentes por job ou por tenant? Ou e ilimitado?

**P5 -- Aprovacao de orcamento vs sistema financeiro**
A aprovacao de tipo `orcamento_detalhado` e puramente documental (registro de que o cliente aprovou verbalmente/por link)? Ou ao aprovar deve mudar algum status no modulo financeiro?

**P6 -- Historico de versoes em aprovacoes de corte**
Para aprovacoes de corte, o cliente vai aprovar links de video (Vimeo, Drive). Se o corte e rejeitado e um novo link e enviado, isso e uma nova solicitacao ou uma nova versao da mesma solicitacao? Ou ambas as abordagens sao validas?

**P7 -- Conflito de alocacao: notificacao automatica**
Quando um conflito e detectado e confirmado pelo usuario (escolheu salvar mesmo assim), deve ser enviada alguma notificacao automatica para o PE ou CEO? Ou o conflito fica apenas registrado no sistema sem aviso proativo?

**P8 -- Integracao do calendario com shooting dates**
As `job_shooting_dates` devem aparecer no calendario de equipe como referencia visual (ex: marcador de dia de filmagem), ou o calendario mostra apenas as alocacoes formais? Isso afeta o design do AllocationGantt.

