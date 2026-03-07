# Onda 2.2 - Pre-Producao: Checklist Configuravel, PPM e Docs

**Data:** 2026-03-06
**Status:** RASCUNHO - aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Onda:** 2 - Escala do Atendimento (1 pessoa = 5+ jobs)
**Esforco estimado:** 3-4 dias
**Fontes:** 59 respostas diretas do CEO (04-organograma-operacional-ellaos.md, secao M-06 e Bloco 3) + auditoria de gaps + codebase existente

---

## 1. Visao Geral

A Pre-Producao e a fase entre a aprovacao do job e a primeira diaria de filmagem. E onde mais coisa pode dar errado em silencio: checklist vive na cabeca do Diretor de Producao, documentos ficam espalhados em pastas pessoais do Drive, e ninguem tem visao centralizada do que falta para o job estar pronto.

Esta onda entrega quatro melhorias objetivas na aba PPM do job: (1) substituir o checklist hardcoded de 6 itens por um checklist dinamico configuravel por tipo de projeto, (2) gerar automaticamente o status pronto pra filmar quando 100% do checklist estiver marcado, (3) adicionar um espaco estruturado para registrar as decisoes tomadas na reuniao PPM, e (4) centralizar os links de documentos do job numa sub-secao de facil acesso.

Nenhuma tabela de equipe ou cronograma e criada - essas abas ja existem e funcionam.

---

## 2. Problema

### A dor real (palavras do CEO)

Bloco 3 do questionario operacional:
- Resposta 3.5: Docs pre-producao - cada pessoa salva onde quer (DOR)
- Resposta 3.6: Checklist pronto pra filmar - na cabeca do Dir. Producao (DOR)

### O que acontece hoje

- O checklist de pre-producao e hardcoded no sistema com 6 itens fixos para todos os tipos de job: um job de fotografia usa o mesmo checklist de um filme publicitario (equipe de 40 pessoas)
- Nao ha indicador de pronto pra filmar - o CEO ou o Diretor de Producao precisam verificar manualmente
- As decisoes tomadas na PPM sao registradas no campo Observacoes (texto livre) junto com qualquer outra anotacao
- Links de documentos (roteiro, storyboard, pasta Drive) estao em campos dispersos pelo sistema que ninguem sabe onde ficam

### Estado atual no sistema

A aba PPM existe (TabPPM.tsx) e salva dados em custom_fields.ppm (JSONB na tabela jobs). O checklist e um objeto fixo com 6 chaves booleanas: roteiro, locacoes, equipe, elenco, cronograma, orcamento. A tabela jobs ja tem campos drive_folder_url, ppm_url, script_url, pre_production_url - todos existentes mas nao exibidos de forma centralizada.

---

## 3. Personas

### P1: CEO / Produtor Executivo (usuario principal desta onda)

Hoje e a unica pessoa fixa. Cria os jobs, escala a equipe junto com o PE, garante que pre-producao esta completa antes de autorizar a diaria. Precisa saber em 30 segundos se um job esta pronto pra filmar sem ter que abrir checklist, WhatsApp e Drive separadamente.

### P2: Diretor de Producao (colaborador)

Freela senior que assume a coordenacao operacional do job. Hoje guarda o checklist de pre-producao na cabeca. Com o sistema, pode acompanhar o que esta pendente sem precisar perguntar ao CEO.

### P3: Atendimento

Participa da PPM e precisa saber quais decisoes foram tomadas para repassar ao cliente. Hoje isso fica nas mensagens do WhatsApp da reuniao.

---

## 4. User Stories (MoSCoW)

### MUST HAVE

**US-2.2.01 - Templates de checklist por tipo de job**
Como CEO, quero criar templates de checklist personalizados para cada tipo de projeto da minha producao, para que o checklist de um filme publicitario tenha itens diferentes do checklist de uma sessao de fotografia.

Criterios de aceite:
- CA-01.1: Pagina de configuracao de templates acessivel em /settings/pre-producao, restrita a papeis ceo e admin
- CA-01.2: Templates sao por tenant e por project_type; cada tenant configura os seus proprios
- CA-01.3: Formulario para criar/editar template: nome do template, tipo de projeto (select com os 10 tipos existentes), lista de itens (texto livre, obrigatorio ter pelo menos 1 item)
- CA-01.4: Itens do template sao reordenados por drag-and-drop ou setas cima/baixo
- CA-01.5: Pode existir no maximo 1 template ativo por project_type por tenant; ao criar segundo, sistema avisa e pergunta se deseja substituir
- CA-01.6: Um template pode ser marcado como padrao (project_type = null) para jobs de tipos sem template especifico
- CA-01.7: Ao desativar ou excluir um template, checklists ja existentes em jobs nao sao afetados
- CA-01.8: Sistema vem pre-carregado com templates sugeridos para os 10 tipos de projeto (nao bloqueados - tenant pode editar ou substituir)

**US-2.2.02 - Checklist dinamico na aba PPM**
Como CEO ou Diretor de Producao, quero que a aba PPM de cada job mostre um checklist baseado no template do tipo do job, para que eu possa marcar os itens relevantes para aquela producao especifica.

Criterios de aceite:
- CA-02.1: Ao abrir a aba PPM de um job que ainda nao tem checklist_items salvo, o sistema carrega o template ativo para o project_type do job
- CA-02.2: Se nao existir template para o project_type do job, usa o template padrao; se nao houver nenhum, usa os 6 itens originais como fallback
- CA-02.3: Itens do checklist sao exibidos com checkbox e label; ao marcar/desmarcar, estado e salvo via PATCH /jobs (custom_fields.ppm.checklist_items)
- CA-02.4: Barra de progresso mostra X/Total itens marcados (comportamento ja existente, agora com total dinamico)
- CA-02.5: CEO/PE pode adicionar itens extras ao checklist do job especifico sem alterar o template global; itens extras ficam marcados com badge adicionado
- CA-02.6: Itens nao podem ser removidos do checklist de um job (apenas desmarcados); o historico e preservado
- CA-02.7: Compatibilidade retroativa: jobs com o formato legado (objeto com 6 chaves booleanas) exibem os dados existentes como itens somente-leitura com banner de migracao

**US-2.2.03 - Status pronto pra filmar automatico**
Como CEO, quero que o sistema indique automaticamente quando um job esta com a pre-producao 100% concluida, para nao precisar verificar item por item antes de autorizar a diaria.

Criterios de aceite:
- CA-03.1: Quando todos os itens de checklist_items estiverem com checked = true, o campo pre_production_complete em custom_fields.ppm e marcado como true automaticamente no mesmo save
- CA-03.2: Badge verde Pronto pra filmar aparece: (a) no header da aba PPM, (b) no card do job na listagem /jobs, (c) no header do job detail
- CA-03.3: Se pelo menos 1 item estiver desmarcado, badge amarelo Pre-producao em andamento com contador de pendentes
- CA-03.4: O status so muda para pronto quando o checklist tiver pelo menos 1 item (nao pode ser pronto com checklist vazio)
- CA-03.5: O calculo e feito no frontend no momento do save - nao requer endpoint separado
- CA-03.6: Badge visivel na listagem /jobs como indicador no card, sem precisar abrir o job

**US-2.2.04 - Registro de decisoes da PPM**
Como CEO ou Atendimento, quero registrar as decisoes tomadas durante a reuniao PPM em um campo estruturado, separado das observacoes gerais, para ter um historico claro do que foi decidido.

Criterios de aceite:
- CA-04.1: Sub-secao Decisoes da PPM na aba PPM, separada do campo Observacoes existente (que e mantido)
- CA-04.2: Formulario para adicionar decisao: data (padrao data do dia), descricao (texto livre, obrigatorio), responsavel (nome, opcional)
- CA-04.3: Decisoes salvas em custom_fields.ppm.decisions (array de objetos: id, date, description, responsible, created_by_name, created_at)
- CA-04.4: Lista de decisoes exibida em ordem cronologica reversa (mais recente no topo)
- CA-04.5: Cada decisao pode ser editada ou excluida pelo mesmo usuario que criou ou por ceo/admin; exclusao pede confirmacao
- CA-04.6: Campo de decisoes disponivel independente do status da PPM (rascunho, agendado, realizado, cancelado)
- CA-04.7: Nao ha limite de decisoes por job

**US-2.2.05 - Painel de documentos do job na aba PPM**
Como CEO ou membro da equipe, quero ver todos os links de documentos relevantes do job em um lugar centralizado, para nao precisar procurar nos campos dispersos do sistema.

Criterios de aceite:
- CA-05.1: Sub-secao Documentos na aba PPM exibindo os links ja existentes na tabela jobs: drive_folder_url (Pasta Drive do job), ppm_url (Documento PPM), script_url (Roteiro), pre_production_url (Pasta Pre-Producao)
- CA-05.2: Cada link e exibido com: icone, label descritivo, botao Abrir que abre em nova aba; links nulos mostram indicador nao informado
- CA-05.3: CEO e PE podem editar qualquer link diretamente nessa sub-secao via campo de texto inline; demais papeis visualizam apenas
- CA-05.4: Ao salvar um link editado, PATCH /jobs atualiza o campo correspondente na tabela jobs (nao em custom_fields)
- CA-05.5: Sub-secao exibe tambem schedule_url (Cronograma) e contracts_folder_url (Contratos) quando preenchidos
- CA-05.6: Banner informativo quando drive_folder_url esta vazio: Pasta Drive nao configurada - sera criada automaticamente pelo G-04 quando o job for aprovado

### SHOULD HAVE

**US-2.2.06 - Sugestao de itens ao carregar checklist vazio**
Como CEO, quero que o sistema sugira itens ao abrir a aba PPM de um job sem template configurado, para nao precisar criar o checklist do zero.

Criterios de aceite:
- CA-06.1: Ao carregar a aba PPM de um job sem checklist_items e sem template para o tipo, sistema exibe os 6 itens originais como sugestao com botao Usar como ponto de partida
- CA-06.2: CEO pode aceitar a sugestao (popula o checklist) ou ignorar (inicia vazio)
- CA-06.3: Sugestao aparece apenas uma vez por job - apos aceitar ou ignorar, nao volta a aparecer

---

## 5. Regras de Negocio

**RN-01: Um template ativo por tipo por tenant**
Cada combinacao (tenant_id, project_type) so pode ter 1 template ativo. Ao criar um segundo, o anterior e automaticamente desativado.

**RN-02: Template padrao**
Se project_type = null, o template serve como fallback para qualquer tipo de job sem template especifico. Pode existir apenas 1 template padrao por tenant.

**RN-03: Isolamento dos dados de job**
Desativar ou editar um template NAO afeta os checklists ja existentes nos jobs. O checklist de um job e uma copia dos itens do template no momento em que foi carregado pela primeira vez, nao uma referencia ao template.

**RN-04: Pronto pra filmar requer pelo menos 1 item**
Um job com checklist vazio nao pode ser considerado pronto pra filmar. O badge verde so aparece quando ha pelo menos 1 item E todos estao marcados.

**RN-05: Compatibilidade retroativa obrigatoria**
Jobs com dados no formato legado (custom_fields.ppm.checklist como objeto com 6 chaves booleanas) devem ser exibidos corretamente. A migracao para o novo formato (array checklist_items) acontece automaticamente no primeiro save pelo usuario, nunca de forma forcada em batch.

**RN-06: Quem pode editar links de documentos**
Apenas papeis ceo, pe e admin podem editar os campos de URL do job (drive_folder_url, ppm_url, script_url, etc.). Demais papeis visualizam apenas.

**RN-07: Quem pode editar ou excluir decisoes da PPM**
O criador da decisao pode editar e excluir a propria. Papeis ceo e admin podem editar e excluir qualquer decisao.

**RN-08: Merge de custom_fields, nunca replace**
Ao salvar a aba PPM, o PATCH /jobs deve mesclar o objeto ppm dentro de custom_fields, preservando outras chaves. O comportamento ja esta implementado em TabPPM.tsx e deve ser mantido.

---

## 6. Fora de Escopo

| Item | Por que nao entra | Quando entra |
|------|-------------------|--------------|
| Criar ou recriar a aba Equipe | Ja existe e funciona (job_team) | Ja existe |
| Criar ou recriar o modulo Cronograma | Ja existe como Onda 1 (tab=cronograma) | Ja existe |
| Orcamentos de pre-producao | Escopo da Onda 1.1 | Onda 1.1 |
| Logistica de equipe (passagens, hotel da equipe tecnica) | Logistica de cliente coberta pela Onda 2.1; logistica de equipe nao foi pedida explicitamente | Pergunta Aberta PA-01 |
| Checklist automatico baseado em dados de outras abas | Ex: marcar equipe confirmada quando aba Equipe estiver preenchida - complexidade alta para ganho marginal | Onda 3 (IA) |
| Aprovacao do checklist por papel especifico | CEO nao pediu workflow de aprovacao do checklist, so visibilidade | Nunca (nao e o pedido) |
| Upload de arquivos (roteiro, storyboard) | CEO pediu links, nao upload direto - arquivos ficam no Drive | Nao e o pedido |
| Diario de set | Escopo da Onda 2.3 | Onda 2.3 |
| Templates compartilhados entre tenants | Multi-tenant e Onda 3 | Onda 3 |

---

## 7. Modelo de Dados

### 7.1 Tabela nova: preproduction_checklist_templates

Templates configurados por tenant para cada tipo de projeto.

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| id | uuid | PK, default gen_random_uuid() | Identificador unico |
| tenant_id | uuid | FK tenants, NOT NULL | Isolamento por tenant |
| project_type | text | nullable, ENUM | project_type do job; null = template padrao |
| name | text | NOT NULL | Nome descritivo do template |
| items | jsonb | NOT NULL, default array vazio | Array de objetos: [{id, label, position}] |
| is_active | boolean | NOT NULL, default true | Apenas templates ativos sao usados |
| created_by | uuid | FK profiles, NOT NULL | Quem criou o template |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

Constraints:
- UNIQUE parcial: (tenant_id, project_type) WHERE is_active = true
- UNIQUE parcial: (tenant_id) WHERE project_type IS NULL AND is_active = true
- CHECK: project_type IN (filme_publicitario, branded_content, videoclipe, documentario, conteudo_digital, evento_livestream, institucional, motion_graphics, fotografia, outro) OR project_type IS NULL
- INDEX: (tenant_id, project_type) para lookup rapido ao carregar a aba PPM
- RLS: SELECT/INSERT/UPDATE por tenant_id; DELETE bloqueado (usar is_active = false)

### 7.2 Alteracoes em custom_fields.ppm (JSONB na tabela jobs)

O campo custom_fields.ppm ja existe. Esta spec adiciona dois novos sub-campos no objeto salvo, sem alterar os campos existentes.

Campos existentes (mantidos sem alteracao):
status, document_url, date, location, participants, notes, checklist (formato legado)

Campos novos adicionados ao objeto ppm:

checklist_items (array de objetos):
  - id: string UUID gerado no frontend
  - label: string texto do item
  - checked: boolean
  - position: number ordem de exibicao
  - is_extra: boolean true se adicionado especificamente para este job

pre_production_complete (boolean):
  - Calculado no frontend antes de cada save
  - Regra: checklist_items.length > 0 AND todos os items tem checked = true
  - Salvo no mesmo PATCH, sem endpoint separado

decisions (array de objetos):
  - id: string UUID gerado no frontend
  - date: string formato YYYY-MM-DD
  - description: string texto da decisao
  - responsible: string nome, opcional
  - created_by_name: string email do usuario logado
  - created_at: string ISO 8601

Logica de compatibilidade retroativa:
- Se custom_fields.ppm.checklist_items existe e tem pelo menos 1 item: usa o novo formato (array)
- Se nao (formato legado com objeto checklist): exibe os 6 itens originais como somente-leitura com banner de migracao
- Ao salvar pela primeira vez apos o banner, frontend converte o formato legado para o novo array

### 7.3 Nenhum campo novo na tabela jobs

Todos os links necessarios ja existem: drive_folder_url, ppm_url, script_url, pre_production_url, schedule_url, contracts_folder_url. A sub-secao Documentos apenas exibe e permite editar campos ja existentes.

---

## 8. Telas Propostas

### T1: Aba PPM reformulada (TabPPM.tsx)

A aba PPM existente e refatorada internamente. Ordem das sub-secoes:

1. Header com badge de status da PPM (rascunho/agendado/realizado/cancelado) - ja existe
2. Badge Pronto pra filmar - NOVO: verde quando 100%, amarelo com contador quando incompleto
3. Informacoes da Reuniao (data, local, participantes) - ja existe, mantido
4. Documento PPM (campo URL) - ja existe, mantido
5. Sub-secao Documentos do Job - NOVA (US-2.2.05)
6. Checklist de Pre-Producao (dinamico) - REFATORADO (US-2.2.02/03)
7. Sub-secao Decisoes da PPM - NOVA (US-2.2.04)
8. Observacoes (campo texto livre) - ja existe, mantido
9. Botao Salvar - ja existe

Componentes novos:
- PreProductionBadge: badge calculado de pronto pra filmar
- DynamicChecklist: checklist que le itens de array (nao objeto fixo)
- DocumentsPanel: sub-secao com os links do job
- PpmDecisionsList: lista de decisoes com formulario inline
- LegacyChecklistBanner: banner de migracao do formato legado

### T2: Pagina de configuracao de templates (/settings/pre-producao)

Pagina nova em /settings/pre-producao, acessivel para ceo e admin.

Componentes:
- ChecklistTemplateList: lista de templates por tipo com botoes Editar/Desativar
- ChecklistTemplateForm: formulario de criacao/edicao com itens reordenaveis
- ChecklistTemplateItem: item individual com label e botoes de reordenacao e remocao

### T3: Indicador na listagem /jobs

A listagem de jobs recebe um indicador no card para Pronto pra filmar baseado em custom_fields.ppm.pre_production_complete. Sem nova query - o dado ja esta no JSONB retornado pela listagem.

---

## 9. Dependencias

| Dependencia | Status | Onde e usada |
|-------------|--------|--------------|
| Tabela jobs (custom_fields JSONB) | Existente | Checklist, decisoes, status pre_production_complete |
| Campos jobs: drive_folder_url, ppm_url, script_url, etc. | Existentes | Sub-secao Documentos (T1) |
| TabPPM.tsx | Existente - refatorar | Componente principal desta onda |
| RBAC: papeis ceo, pe, admin | Existente | Restricao de edicao de templates e links |
| project_type ENUM (10 valores) | Existente | Chave de lookup do template |
| Onda 2.1 (job_internal_approvals) | Onda 2.1 | Aprovacao Interna e entidade distinta do checklist de pre-producao |
| G-04 (Drive permissions) | Em revisao | drive_folder_url e preenchido automaticamente pelo G-04; esta spec apenas exibe o campo |

---

## 10. Criterio de Done

A Onda 2.2 e considerada CONCLUIDA quando todos os itens abaixo estiverem verificados.

### Backend

- [ ] Migration: tabela preproduction_checklist_templates criada com RLS
- [ ] RLS ativo: SELECT/INSERT/UPDATE por tenant_id; DELETE bloqueado (is_active = false)
- [ ] Edge Function ou handler para CRUD de templates (GET por project_type, POST, PATCH, DELETE logico)
- [ ] Seed ou migration com templates sugeridos para os 10 project_types

### Frontend

- [ ] TabPPM.tsx refatorado: checklist dinamico lendo de checklist_items (array)
- [ ] Compatibilidade retroativa: jobs com formato legado exibem banner de migracao sem erro
- [ ] Badge Pronto pra filmar visivel na aba PPM e na listagem /jobs
- [ ] Sub-secao Decisoes da PPM: adicionar, editar, excluir com confirmacao
- [ ] Sub-secao Documentos: exibe e permite editar links existentes do job
- [ ] Pagina /settings/pre-producao: CRUD de templates com reordenacao de itens
- [ ] Dark mode funcionando em todas as telas novas ou refatoradas

### Qualidade

- [ ] Nenhum TypeScript error em modo strict
- [ ] Jobs com checklist legado continuam funcionando sem erros
- [ ] Salvar checklist nao sobrescreve outros campos de custom_fields (merge, nao replace)

### Teste de aceite ponta a ponta

- [ ] CEO cria template para filme_publicitario com 10 itens; abre job desse tipo: checklist carrega com os 10 itens
- [ ] CEO marca todos os itens: badge Pronto pra filmar aparece automaticamente
- [ ] CEO desmarca 1 item: badge volta para em andamento com contador
- [ ] CEO abre job de fotografia sem template: checklist usa os 6 itens originais como fallback
- [ ] Atendimento abre PPM de job antigo (formato legado): ve banner de migracao, nao ve erro
- [ ] CEO registra 3 decisoes; Atendimento abre o mesmo job e ve as 3 decisoes em ordem correta
- [ ] CEO clica em Pasta Drive na sub-secao Documentos: abre o link em nova aba

---

## 11. Perguntas Abertas

As seguintes questoes precisam de resposta antes de iniciar a implementacao.

**PA-01: Logistica de equipe entra na pre-producao?**
O M-06 do organograma lista logistica como funcionalidade da pre-producao. A Onda 2.1 ja implementou client_logistics para passagem/hotel/transfer do cliente. Existe necessidade separada de registrar logistica da equipe (ex: passagem do freela que vem de outra cidade, hotel da equipe tecnica)? Se sim, entra nesta onda ou e adiada?

**PA-02: Quem pode marcar itens do checklist?**
Hoje apenas CEO e PE editam a aba PPM. Com o checklist sendo usado pelo Diretor de Producao para acompanhamento diario, faz sentido abrir a edicao do checklist para o papel diretor_producao tambem? Ou o CEO prefere centralizar todas as marcacoes?

**PA-03: O badge pronto pra filmar deve bloquear alguma acao?**
O CEO pediu o indicador de status. Faz sentido que o sistema so permita criar diarias (shooting dates) quando pre_production_complete = true? Ou o badge e apenas informativo e nao bloqueia nada?

**PA-04: Templates devem ter mecanismo de copia entre tenants?**
A spec assume templates por tenant isolados. Quando o segundo tenant (Colorbar) for onboarding, faz sentido um mecanismo de copiar templates entre tenants como ponto de partida, ou cada tenant configura do zero?

---

## 12. Referencias

Todos os requisitos rastreiam para ao menos uma fonte documentada abaixo.

| Fonte | Secao relevante |
|-------|-----------------|
| docs/specs/strategic-vision/04-organograma-operacional-ellaos.md | M-06 (Pre-Producao), Bloco 3 (respostas CEO 3.1 a 3.6), Onda 2 item 2.2 |
| docs/specs/strategic-vision/03-questionario-fluxo-operacional.md | Bloco 3, respostas 3.5 e 3.6 (dores de docs e checklist) |
| docs/specs/strategic-vision/02-auditoria-gaps-2026-03.md | Contexto geral do estado atual |
| frontend/src/components/job-detail/tabs/TabPPM.tsx | Estado atual: 6 itens hardcoded, formato legado do checklist |
| supabase/functions/_shared/types.ts | Campos existentes na tabela jobs (drive_folder_url, ppm_url, etc.) |
| docs/specs/onda-2/01-atendimento-v2-spec.md | Delimitacao de escopo: logistica cliente (Onda 2.1) vs pre-producao (Onda 2.2) |

---

*Spec gerada em 2026-03-06 a partir de 59 respostas diretas do CEO. Nenhum requisito foi inventado - todos rastreiam para uma resposta documentada ou para o estado atual do codebase.*
