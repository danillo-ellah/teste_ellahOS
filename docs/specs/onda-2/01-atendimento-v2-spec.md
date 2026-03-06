# Onda 2.1 — Atendimento v2: Escopo, Logistica e Comunicacao

**Data:** 2026-03-07
**Status:** RASCUNHO — aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Onda:** 2 — Escala do Atendimento (1 pessoa = 5+ jobs)
**Esforco estimado:** 5-7 dias
**Fontes:** 59 respostas diretas do CEO (04-organograma-operacional-ellaos.md, secao M-05 e Bloco 6) + GAP-001 da auditoria de gaps

---

## 1. Problema

### A dor real (palavras do CEO)

> "Info espalhada + alteracoes constantes + 50 msgs pra entender contexto + filtrar pra equipe nao estressar"
> — CEO, resposta 6.6 do questionario operacional

O Atendimento e o cargo mais critico de uma produtora audiovisual brasileira: e a ponte unica entre o cliente/agencia e toda a equipe interna. Hoje existe 1 pessoa fixa nessa funcao. Sem sistema, ela gerencia 1-2 jobs simultaneamente. Com o EllaOS estruturado, a meta e que 1 pessoa gerencie varios jobs em paralelo.

### O que acontece hoje

- Contexto de um job esta distribuido em: grupos de WhatsApp (5 por job), planilha GG, emails, Drive, e na cabeca do Atendimento
- Antes de responder qualquer mensagem, o Atendimento precisa varrer dezenas de mensagens para reconstruir o historico
- Pedidos de alteracao de escopo chegam por WA, sao atendidos sem registro — viram servico gratis sem que o CEO saiba
- Logistica do cliente (passagem, hotel, transfer) e gerenciada por mensagens e planilha avulsa, sem status centralizado
- Satisfacao pos-entrega nao e coletada sistematicamente — o CEO admite que esquece
- Aprovacao Interna (documento formal de abertura do job) existe como conceito mas nao como fluxo estruturado no sistema

### Estado atual no sistema

Conforme a auditoria de gaps (GAP-001, severidade CRITICO): zero. O papel "atendimento" existe no RBAC mas nao ha modulo, rota, componente ou tabela dedicada ao workflow do Atendimento.

---

## 2. Objetivo

Dar ao Atendimento uma central de comando no EllaOS: uma pagina propria para visao geral + ferramentas estruturadas dentro de cada job, para que 1 pessoa consiga gerenciar varios jobs simultaneamente sem perder contexto nem deixar extras de escopo passarem batidos.

**Metrica de sucesso principal:** O Atendimento consegue entender o estado atual de qualquer job ativo em menos de 2 minutos, sem consultar WhatsApp ou planilha.

---

## 3. Personas

### P1: Atendimento (usuario principal)
1 pessoa fixa na producao. Gerencia hoje 1-2 jobs; meta com o EllaOS e gerenciar varios em paralelo. Tarefas diarias: comunicacao com cliente, controle de escopo, logistica, acompanhar aprovacoes, ir ao set (99% dos jobs com cliente/agencia presente). Acessa o sistema frequentemente pelo celular (no set, em transito).

**Maior dor:** ter que varrer dezenas de mensagens no WA para reconstruir o contexto antes de agir.

### P2: CEO / Produtor Executivo
Centraliza tudo hoje. Precisa ser notificado quando o Atendimento identifica um pedido fora do escopo aprovado, para decidir se cobra como aditivo ou absorve. Nao quer ser interrompido por duvidas que o sistema poderia registrar. Tambem e quem assina internamente a Aprovacao Interna ao abrir um job.

### P3: Cliente / Agencia
Nao acessa o EllaOS diretamente nesta onda. E o receptor das informacoes que o Atendimento gerencia: logistica (passagens, hotel, transfer), cronograma de acoes, links de aprovacao. Canal de comunicacao com o cliente: WhatsApp e email (100% fora do sistema nesta onda).

---

## 4. User Stories (MoSCoW)

### MUST HAVE

**US-2.1.01 — Dashboard do Atendimento**
Como Atendimento, quero ter uma pagina propria que lista todos os jobs ativos com as pendencias de cada um, para nao precisar abrir job por job para saber o que esta pendente.

Criterios de aceite:
- CA-01.1: Rota /atendimento acessivel pelo menu lateral para os papeis atendimento, ceo, pe
- CA-01.2: Lista de jobs ativos do tenant com: codigo, titulo, cliente, status, data de filmagem mais proxima
- CA-01.3: Contador de pendencias por job e por categoria: extras aguardando CEO, logistica pendente, acoes do cliente atrasadas
- CA-01.4: Badge numerico de pendencias por job, destacado em amarelo quando maior que zero
- CA-01.5: Ordenacao padrao: jobs com mais pendencias no topo; ordenacao alternativa por data de filmagem
- CA-01.6: Clique no job abre o job detail diretamente na aba Atendimento
- CA-01.7: Layout responsivo — o Atendimento acessa pelo celular no set
- CA-01.8: Jobs encerrados ou cancelados ficam ocultos por padrao; toggle para mostrar historico

**US-2.1.02 — Log de comunicacoes e decisoes por job**
Como Atendimento, quero registrar decisoes e comunicacoes relevantes de um job com data e descricao, para ter um historico estruturado sem precisar varrer mensagens de WhatsApp.

Criterios de aceite:
- CA-02.1: Aba Atendimento no job detail com sub-secao Comunicacoes
- CA-02.2: Formulario para criar entrada: data (padrao hoje), tipo (decisao/alteracao/informacao/aprovacao/outro), canal (whatsapp/email/reuniao/telefone/presencial), descricao (texto livre obrigatorio)
- CA-02.3: Lista cronologica reversa (mais recentes no topo)
- CA-02.4: Cada entrada exibe: data, tipo como badge colorido, descricao, canal como icone, criado por, timestamp
- CA-02.5: Possibilidade de editar ou excluir entradas proprias com confirmacao antes de excluir
- CA-02.6: Campo de busca por texto nas entradas do job
- CA-02.7: O log e MANUAL E ESTRUTURADO — nao e chat em tempo real. CEO definiu: registro de decisao, nao chat

**US-2.1.03 — Registrar item extra de escopo com alerta ao CEO**
Como Atendimento, quero marcar uma solicitacao do cliente como extra (fora do escopo aprovado) com descricao e data, para que o CEO seja notificado e decida o que fazer.

Criterios de aceite:
- CA-03.1: Aba Atendimento no job detail com sub-secao Escopo
- CA-03.2: Botao Registrar Extra sempre visivel na sub-secao de Escopo
- CA-03.3: Formulario de extra: descricao (obrigatorio), canal de origem (enum, obrigatorio), data da solicitacao do cliente (obrigatorio)
- CA-03.4: Ao salvar, item criado com is_extra = true e extra_status = pendente_ceo
- CA-03.5: Notificacao enviada ao CEO via WhatsApp (via n8n) em menos de 1 minuto: job code + descricao do extra + instrucao para decidir no sistema
- CA-03.6: CEO ou PE pode atualizar o status: aprovado_gratuito / cobrar_aditivo / recusado — com observacao opcional
- CA-03.7: Extras com status pendente_ceo aparecem no contador de pendencias do Dashboard
- CA-03.8: Historico completo de extras por job com todos os status e decisoes registradas
- CA-03.9: Ao tomar decisao, Atendimento recebe notificacao in-app com o resultado

**US-2.1.04 — Logistica do cliente por job**
Como Atendimento, quero registrar e rastrear itens de logistica do cliente (passagem, hotel, transfer) em cada job, para ter status centralizado do que foi confirmado e o que ainda esta pendente.

Criterios de aceite:
- CA-04.1: Aba Atendimento no job detail com sub-secao Logistica do Cliente
- CA-04.2: Formulario para adicionar item: tipo (passagem_aerea/hospedagem/transfer/alimentacao/outro), descricao, data prevista, responsavel interno (quem da producao organizou), status inicial pendente, observacoes
- CA-04.3: Lista de itens com indicador visual de status: pendente em amarelo, confirmado em verde, cancelado riscado
- CA-04.4: Campo enviado_ao_cliente (booleano) para registrar quando o Atendimento repassou a informacao
- CA-04.5: Itens com status pendente e data prevista nos proximos 7 dias aparecem no contador de pendencias do Dashboard
- CA-04.6: Possibilidade de editar qualquer campo de um item existente, incluindo o status

### SHOULD HAVE

**US-2.1.05 — Aprovacao Interna por job**
Como CEO ou Produtor Executivo, quero preencher o documento de Aprovacao Interna ao abrir um job, para formalizar escopo aprovado, equipe confirmada, datas e verba antes de comecar a execucao.

Criterios de aceite:
- CA-05.1: Aba Atendimento no job detail com sub-secao Aprovacao Interna
- CA-05.2: Formulario: descricao do escopo aprovado, equipe confirmada, datas de filmagem confirmadas (booleano), verba aprovada em R$, entregaveis confirmados, observacoes
- CA-05.3: Status: rascunho (padrao ao criar) ou aprovado
- CA-05.4: Transicao para aprovado requer descricao de escopo e verba aprovada preenchidas
- CA-05.5: Documento aprovado exibe quem aprovou e quando; campos nao sao mais editaveis exceto por admin/ceo
- CA-05.6: Alerta Aprovacao Interna pendente enquanto o documento nao existir ou estiver como rascunho
- CA-05.7: 1 documento por job; este e o documento de abertura, nao e versionado
- CA-05.8: Visivel apenas para papeis ceo, pe, atendimento

**US-2.1.06 — Cronograma de acoes do cliente**
Como Atendimento, quero registrar as acoes que o cliente precisa realizar e quando, para ter visibilidade das responsabilidades do cliente em cada job e alertar sobre atrasos.

Criterios de aceite:
- CA-06.1: Aba Atendimento no job detail com sub-secao Cronograma do Cliente
- CA-06.2: Formulario: descricao (obrigatorio), data prevista (obrigatorio), responsavel do lado do cliente (nome/cargo, opcional), status pendente por padrao
- CA-06.3: Lista ordenada por data prevista (mais proximas no topo)
- CA-06.4: Acoes com data vencida e status pendente aparecem destacadas em vermelho
- CA-06.5: Contador de acoes atrasadas aparece no Dashboard como tipo de pendencia separado
- CA-06.6: Status pode ser atualizado: pendente / concluido / atrasado / cancelado

### COULD HAVE

**US-2.1.07 — Lembrete automatico de satisfacao pos-entrega**
Como CEO, quero que o sistema envie automaticamente uma mensagem de satisfacao ao cliente alguns dias apos a entrega, para que esse follow-up nunca seja esquecido.

Criterios de aceite:
- CA-07.1: Campo satisfaction_reminder_days nos settings do tenant; zero = desativado; padrao 7 dias
- CA-07.2: Quando job e encerrado e satisfaction_reminder_days maior que zero, sistema aciona n8n com delay configurado
- CA-07.3: No dia calculado, n8n envia mensagem WA ao contato principal do job com texto configuravel
- CA-07.4: Envio registrado automaticamente nas Comunicacoes do job com tipo satisfacao_automatica
- CA-07.5: CEO pode marcar manualmente satisfacao_coletada para cancelar lembrete agendado

**US-2.1.08 — Visao consolidada de extras pendentes para o CEO**
Como CEO, quero ver todos os itens marcados como extra aguardando minha decisao em todos os jobs ativos, para nao perder nenhuma solicitacao.

Criterios de aceite:
- CA-08.1: Secao Extras Aguardando Decisao no Dashboard CEO com lista de todos os itens extra_status = pendente_ceo de jobs ativos
- CA-08.2: Cada item exibe: job code, titulo, descricao do extra, data da solicitacao, ha quantos dias pendente
- CA-08.3: Acoes inline sem sair do dashboard: aprovado_gratuito / cobrar_aditivo / recusar com observacao opcional
- CA-08.4: Ao tomar decisao inline, lista atualiza e Atendimento recebe notificacao in-app

---

## 5. Fora de Escopo

Os itens abaixo nao entram nesta onda. A ausencia e intencional.

| Item | Por que nao entra | Quando entra |
|------|-------------------|--------------|
| IA monitorando grupos de WhatsApp | Horizonte 1 (6-12 meses) — M-12 do organograma | Onda 3 |
| Extrair decisoes automaticamente do WA | Depende da IA de Atendimento (H1-02) | Onda 3 |
| Envio de mensagens WA pelo sistema (interface) | CEO quer profissionalismo no WA, nao substituir o WA | Onda 3 |
| Chat em tempo real interno | CEO definiu explicitamente: log de decisao, nao chat | Nunca (nao e o pedido) |
| Portal do cliente com login | Feature separada ja existente (/portal) | Ja existe |
| Aprovacoes de versao de conteudo | Coberto pelo sistema de approval_requests (Fase 6) | Ja existe |
| Checklist de pre-producao | Escopo da Onda 2.2 | Onda 2.2 |
| Diario de set / boletim de producao | Escopo da Onda 2.3 | Onda 2.3 |
| CRM para o Atendimento | Atendimento opera em jobs ja abertos, nao em oportunidades | Nao se aplica |
| Relatorios de performance do Atendimento | Escopo do modulo de BI (Onda 3) | Onda 3 |
| Versionamento da Aprovacao Interna | E um documento de abertura unico; nao e versionado | Nunca nesta funcao |

---

## 6. Telas Propostas

### T1: /atendimento — Dashboard do Atendimento

**Localizacao no menu:** Item dedicado no sidebar, visivel para papeis atendimento, ceo, pe
**Url:** /atendimento

Componentes:
- AttendanceDashboardPage — pagina principal
- AttendanceJobCard — card de job com: codigo, titulo, cliente, status, proxima filmagem, contadores de pendencias por categoria
- AttendancePendingBadge — badge com contagem e categoria (extras / logistica / acoes cliente)
- AttendanceFilters — filtro por status do job (ativos por padrao), por cliente

Dados necessarios (Edge Function ou query consolidada):
- Jobs ativos do tenant com dados basicos
- COUNT(scope_items WHERE is_extra=true AND extra_status=pendente_ceo) por job
- COUNT(client_logistics WHERE status=pendente AND scheduled_date <= hoje+7) por job
- COUNT(client_milestones WHERE status=pendente AND due_date < hoje) por job

### T2: Aba Atendimento no Job Detail

**Localizacao:** Nova aba no job detail /jobs/[id], posicionada ao lado das outras abas existentes
**Identificador da aba:** atendimento

Sub-secoes dentro da aba (como cards separados ou accordion):

**T2-A: Aprovacao Interna**
- InternalApprovalCard — exibe status atual (rascunho/aprovado/inexistente), botao de preencher/editar
- InternalApprovalForm — dialog ou expansao inline com o formulario completo
- Indicador visual de status no header da sub-secao: rascunho em amarelo, aprovado em verde, inexistente em vermelho

**T2-B: Comunicacoes — Log de Decisoes**
- CommunicationLog — lista cronologica reversa com filtro por tipo (dropdown)
- CommunicationEntryForm — dialog de criacao (data, tipo, canal, descricao)
- CommunicationSearchBar — campo de busca por texto

**T2-C: Controle de Escopo**
- ScopeExtraAlert — banner quando ha extras com status pendente_ceo
- ScopeExtrasList — lista de extras registrados com badges de status
- Botao Registrar Extra sempre visivel
- ScopeExtraForm — dialog para novo extra (descricao, canal, data)
- ScopeExtraDecisionForm — dialog para CEO/PE registrar decisao

**T2-D: Logistica do Cliente**
- ClientLogisticsList — lista de itens com semaforo visual de status
- ClientLogisticsForm — dialog para criar/editar item
- Destaque para itens pendentes com data nos proximos 7 dias

**T2-E: Cronograma do Cliente**
- ClientMilestonesList — lista ordenada por data com alertas de atraso em vermelho
- ClientMilestoneForm — dialog para criar/editar acao
- Banner quando ha acoes atrasadas

### T3: Secao de Extras Pendentes no Dashboard CEO

**Localizacao:** Novo bloco na pagina principal (/) ou no dashboard CEO, visivel apenas para ceo/pe
**Condition de exibicao:** visivel somente quando ha pelo menos 1 item pendente_ceo

Componentes:
- CeoPendingExtrasList — tabela compacta com extras aguardando decisao de todos os jobs ativos
- ScopeExtraInlineActions — botoes de acao diretamente na lista (sem abrir job)
- Ordenacao por mais antigo primeiro (maior risco de virar servico gratis sem saber)

---


## 7. Modelo de Dados

### 7.1 Tabela: client_communications
Registro estruturado e manual de comunicacoes e decisoes por job. Nao e chat.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK | Identificador unico |
| tenant_id | uuid | FK tenants, NOT NULL | Isolamento por tenant |
| job_id | uuid | FK jobs, NOT NULL | Job relacionado |
| entry_date | date | NOT NULL, default CURRENT_DATE | Data da comunicacao |
| entry_type | text | NOT NULL, ENUM | decisao / alteracao / informacao / aprovacao / outro |
| channel | text | NOT NULL, ENUM | whatsapp / email / reuniao / telefone / presencial |
| description | text | NOT NULL | Descricao da comunicacao ou decisao |
| created_by | uuid | FK profiles, NOT NULL | Quem registrou |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: entry_type IN (decisao, alteracao, informacao, aprovacao, satisfacao_automatica, outro)
- CHECK: channel IN (whatsapp, email, reuniao, telefone, presencial, sistema)
- INDEX: (tenant_id, job_id, entry_date DESC) para listagem cronologica
- INDEX: (tenant_id, job_id) para contagens no dashboard

### 7.2 Tabela: scope_items
Itens do escopo aprovado de um job, com suporte a flag de extras solicitados apos aprovacao.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK | |
| tenant_id | uuid | FK tenants, NOT NULL | |
| job_id | uuid | FK jobs, NOT NULL | |
| description | text | NOT NULL | Descricao do item ou do extra |
| is_extra | boolean | NOT NULL, default false | true = pedido fora do escopo original |
| origin_channel | text | nullable, ENUM | Canal de origem do pedido extra |
| requested_at | date | nullable | Data em que o cliente solicitou o extra |
| extra_status | text | nullable, ENUM | Status da decisao (apenas quando is_extra = true) |
| ceo_decision_by | uuid | FK profiles, nullable | Quem tomou a decisao |
| ceo_decision_at | timestamptz | nullable | Quando a decisao foi tomada |
| ceo_notes | text | nullable | Observacao do CEO sobre a decisao |
| created_by | uuid | FK profiles, NOT NULL | |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: extra_status IN (pendente_ceo, aprovado_gratuito, cobrar_aditivo, recusado) OR extra_status IS NULL
- CHECK: origin_channel IN (whatsapp, email, reuniao, telefone, presencial) OR origin_channel IS NULL
- CHECK: quando is_extra = true entao requested_at IS NOT NULL
- INDEX: (tenant_id, job_id, is_extra, extra_status) para filtragem no dashboard
- INDEX: (tenant_id, extra_status) WHERE is_extra = true AND deleted_at IS NULL para consulta global do CEO

### 7.3 Tabela: client_logistics
Itens de logistica do cliente por job. Registrados e rastreados ate confirmacao.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK | |
| tenant_id | uuid | FK tenants, NOT NULL | |
| job_id | uuid | FK jobs, NOT NULL | |
| item_type | text | NOT NULL, ENUM | passagem_aerea / hospedagem / transfer / alimentacao / outro |
| description | text | NOT NULL | Detalhamento do item |
| scheduled_date | date | nullable | Data prevista do item |
| responsible_name | text | nullable | Nome de quem da producao organizou o item |
| status | text | NOT NULL, default pendente | pendente / confirmado / cancelado |
| sent_to_client | boolean | NOT NULL, default false | Se o Atendimento ja repassou ao cliente |
| notes | text | nullable | Observacoes adicionais |
| created_by | uuid | FK profiles, NOT NULL | |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: item_type IN (passagem_aerea, hospedagem, transfer, alimentacao, outro)
- CHECK: status IN (pendente, confirmado, cancelado)
- INDEX: (tenant_id, job_id, status, scheduled_date)

### 7.4 Tabela: job_internal_approvals
Documento formal de abertura de job. Unico por job_id.
Diferente de approval_requests (Fase 6), que sao por versao de conteudo enviado ao cliente.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK | |
| tenant_id | uuid | FK tenants, NOT NULL | |
| job_id | uuid | FK jobs, NOT NULL, UNIQUE | 1 documento por job |
| status | text | NOT NULL, default rascunho | rascunho / aprovado |
| scope_description | text | nullable | Descricao completa do escopo aprovado |
| team_description | text | nullable | Equipe confirmada para o job |
| shooting_dates_confirmed | boolean | NOT NULL, default false | Datas de filmagem confirmadas com cliente |
| approved_budget | numeric(15,2) | nullable | Verba aprovada em R$ |
| deliverables_description | text | nullable | Entregaveis confirmados |
| notes | text | nullable | Observacoes adicionais |
| approved_by | uuid | FK profiles, nullable | Quem assinou internamente (CEO ou PE) |
| approved_at | timestamptz | nullable | Quando o documento foi aprovado |
| created_by | uuid | FK profiles, NOT NULL | |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

Constraints:
- UNIQUE: (job_id) — um unico documento de abertura por job
- CHECK: status IN (rascunho, aprovado)
- Sem soft delete: o documento de abertura nao deve ser removido
- Campos ficam editaveis enquanto status = rascunho; apos aprovado, apenas admin/ceo pode editar

### 7.5 Tabela: client_milestones
Acoes que o cliente precisa realizar e quando. Cronograma de responsabilidades do lado do cliente.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK | |
| tenant_id | uuid | FK tenants, NOT NULL | |
| job_id | uuid | FK jobs, NOT NULL | |
| description | text | NOT NULL | O que o cliente precisa fazer |
| due_date | date | NOT NULL | Data prevista |
| responsible_name | text | nullable | Nome e cargo do responsavel no lado do cliente |
| status | text | NOT NULL, default pendente | pendente / concluido / atrasado / cancelado |
| notes | text | nullable | Observacoes |
| completed_at | timestamptz | nullable | Quando o cliente concluiu a acao |
| created_by | uuid | FK profiles, NOT NULL | |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |
| deleted_at | timestamptz | nullable | Soft delete |

Constraints:
- CHECK: status IN (pendente, concluido, atrasado, cancelado)
- INDEX: (tenant_id, job_id, status, due_date)
- Sugestao: pg_cron diario para marcar como atrasado itens com due_date < hoje e status = pendente

### 7.6 Alteracoes em tabelas existentes

**Tabela jobs — 2 campos novos (para US-2.1.07):**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| satisfaction_reminder_days | integer | nullable; quantos dias apos encerramento enviar lembrete; null = desativado |
| satisfaction_sent_at | timestamptz | nullable; quando o lembrete foi enviado; null = ainda nao enviado |

### 7.7 RLS Policies

Todas as 5 tabelas novas seguem o padrao do projeto:
- SELECT: tenant_id = get_tenant_id()
- INSERT: tenant_id = get_tenant_id()
- UPDATE: tenant_id = get_tenant_id()
- DELETE: bloqueado via RLS (soft delete via deleted_at, exceto job_internal_approvals)

Excecao em scope_items: UPDATE de extra_status restrito a papeis ceo e pe (validado na Edge Function).

---

## 8. Integracao com Outros Modulos

### Jobs (core)
Todas as 5 tabelas novas tem job_id como FK obrigatoria. A aba Atendimento aparece em /jobs/[id] para os papeis autorizados: atendimento, ceo, pe. Papeis criativos (diretor, editor, arte) e equipe tecnica nao veem a aba Atendimento.

### CRM / Comercial
Nao ha integracao direta nesta onda. O Atendimento entra em cena depois que o job esta aberto (post-aprovacao comercial). O CRM entrega o lead aprovado; o Atendimento cuida da execucao a partir dai.

Dependencia futura (Onda 2.5): quando a conversao CRM > Job for automatica, os dados do briefing no CRM poderao pre-popular os entregaveis da Aprovacao Interna.

### WhatsApp / n8n
Dois pontos de integracao nesta onda:

**1. Notificacao de extra para o CEO (Must Have)**
- Trigger: scope_items INSERT com is_extra = true
- Acao: Edge Function chama webhook n8n
- n8n envia WA para o numero do CEO configurado no tenant settings
- Mensagem: [Job {code}] Extra registrado: {description}. Acesse o EllaOS para decidir.
- SLA: entrega em menos de 1 minuto

**2. Lembrete de satisfacao (Could Have)**
- Trigger: jobs UPDATE onde status = encerrado e satisfaction_reminder_days IS NOT NULL
- Acao: Edge Function agenda job n8n com delay de satisfaction_reminder_days dias
- n8n envia WA ao contato principal do job com texto configuravel nos settings do tenant
- Log do envio gravado em client_communications com entry_type = satisfacao_automatica

### Portal do Cliente
Sem integracao nesta onda. A logistica e o cronograma gerenciados internamente — o Atendimento repassa ao cliente via WhatsApp, nao pelo portal. Integracao futura (Horizonte 1): cliente ve cronograma de responsabilidades pelo portal.

### Sistema de Aprovacoes (Fase 6)
Sem sobreposicao. As approval_requests (tabela existente da Fase 6) sao para aprovacoes de versao de conteudo enviadas ao cliente. O job_internal_approvals e um documento interno de abertura do job. Sao entidades distintas com propositos distintos.

---

## 9. Dependencias

| Dependencia | Status | Onde e usada |
|-------------|--------|--------------|
| Tabela jobs | Existente | FK em todas as 5 tabelas novas |
| Tabela profiles | Existente | created_by, approved_by, ceo_decision_by |
| Tabela tenants + settings | Existente | tenant_id + configuracao do lembrete de satisfacao |
| RBAC: papel atendimento | Existente (mapa pronto, execucao parcial) | Controle de acesso a /atendimento e aba Atendimento |
| n8n + Z-API | Parcial (existente para outros fluxos) | Notificacao CEO de extra + lembrete satisfacao |
| job_shooting_dates | Existente | Referencia na Aprovacao Interna (shooting_dates_confirmed) |
| approval_requests (Fase 6) | Existente | Nao duplicar — sistema paralelo e separado |

---

## 10. Criterio de Done

A Onda 2.1 e considerada CONCLUIDA quando todos os itens abaixo estiverem verificados.

### Backend

- [ ] Migration: 5 tabelas novas criadas com RLS
- [ ] Migration: 2 campos novos em jobs (satisfaction_reminder_days, satisfaction_sent_at)
- [ ] RLS ativo em todas as tabelas novas: SELECT/INSERT/UPDATE por tenant_id
- [ ] Edge Function attendance deployada com CRUD para as 5 entidades
- [ ] Edge Function attendance: endpoint de contagem de pendencias por job
- [ ] Webhook de notificacao de extra ao CEO funcional (aciona n8n em menos de 1 minuto)
- [ ] n8n workflow de lembrete de satisfacao configurado (Could Have)

### Frontend

- [ ] Rota /atendimento implementada com lista de jobs e contadores de pendencias
- [ ] Aba Atendimento no job detail com as 5 sub-secoes funcionais
- [ ] Dashboard /atendimento responsivo no mobile
- [ ] Secao Extras Pendentes no Dashboard CEO com acoes inline
- [ ] Notificacao in-app ao CEO quando extra e registrado
- [ ] Dark mode funcionando em todas as telas novas

### Qualidade

- [ ] Sem TypeScript errors em modo strict
- [ ] Sem N+1 queries nas listagens
- [ ] Telas responsivas (mobile-first)

### Teste de aceite ponta a ponta

- [ ] Atendimento entende o estado de um job em menos de 2 minutos sem abrir WhatsApp
- [ ] Atendimento registra um extra: CEO recebe WA em menos de 1 minuto
- [ ] CEO toma decisao sobre o extra: status atualiza sem reload
- [ ] Logistica criada como pendente: aparece no contador do Dashboard
- [ ] Logistica marcada como confirmada: some do contador
- [ ] Aprovacao Interna aprovada: documento nao editavel pelo Atendimento

---

## 11. Perguntas Abertas

As seguintes questoes precisam de resposta antes de iniciar a implementacao.

**PA-01: O que existe no MVP de Aprovacao Interna?**
O M-04 do organograma menciona Aprovacao Interna como documento formal ja criado em MVP. A auditoria GAP-001 diz que o modulo de Atendimento nao existe. Ha campos na tabela jobs que cobrem o documento de Aprovacao Interna, ou a tabela job_internal_approvals precisa ser criada do zero? Verificar antes de implementar para evitar duplicar dados.

**PA-02: Quem pode registrar itens de logistica?**
O organograma descreve que PE + Dir. Producao + Produtor organizam a logistica, e o Atendimento repassa ao cliente. Para o sistema: (a) apenas o Atendimento cria itens em client_logistics, ou (b) qualquer papel do job pode criar e o Atendimento gerencia o flag sent_to_client? A resposta define restricoes de papel no INSERT da tabela.

**PA-03: Intervalo do lembrete de satisfacao e por tenant ou por job?**
CEO mencionou lembrete automatico mas nao especificou se o intervalo e fixo (mesmo para todos os jobs do tenant) ou variavel por job (ex: publicidade = 7 dias, evento = 30 dias). Definir antes de implementar US-2.1.07, pois muda onde fica o campo: settings do tenant vs tabela jobs.

---

## 12. Referencias

Todos os requisitos rastreiam para ao menos uma fonte documentada abaixo.

| Fonte | Secao relevante |
|-------|------------------|
| docs/specs/strategic-vision/04-organograma-operacional-ellaos.md | M-05 (Atendimento), Bloco 6 (respostas CEO), Onda 2 (justificativa), Principios 3/7/10 |
| docs/specs/strategic-vision/03-questionario-fluxo-operacional.md | Bloco 6 (dor do atendimento, resposta 6.6) |
| docs/specs/strategic-vision/02-auditoria-gaps-2026-03.md | GAP-001 (estado atual: zero implementado) |
| docs/specs/fase-6-equipe-aprovacoes.md | approval_requests (sistema separado, nao duplicar) |

---

*Spec gerada em 2026-03-07 a partir de 59 respostas diretas do CEO. Nenhum requisito foi inventado — todos rastreiam para uma resposta documentada ou para uma decisao registrada no organograma operacional.*
