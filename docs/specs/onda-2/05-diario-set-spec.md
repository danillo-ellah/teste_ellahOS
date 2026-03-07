# Onda 2.3 - Diario de Set + Boletim de Producao

**Data:** 2026-03-07
**Status:** RASCUNHO - aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Onda:** 2 - Escala do Atendimento (1 pessoa = 5+ jobs)
**Esforco estimado:** 2-3 dias
**Fontes:** 59 respostas diretas do CEO (04-organograma-operacional-ellaos.md, secao M-07 e Bloco 4) + auditoria do codebase existente (EF production-diary, TabProductionDiary.tsx, migrations)

---

## Nota sobre estado atual (ler antes de implementar)

Esta feature foi PARCIALMENTE implementada na Fase 3. O schema de banco, a Edge Function e o componente de frontend basico ja existem. A Onda 2.3 e uma extensao e correcao, nao uma feature do zero.

| Artefato | Status |
|----------|--------|
| Tabela production_diary_entries | EXISTE (migration 20260303030000) |
| Tabela production_diary_photos | EXISTE (migration 20260303030000) |
| Edge Function production-diary | EXISTE com handlers create, update, delete, list, get, photos |
| Componente TabProductionDiary.tsx | EXISTE com CRUD basico funcional |
| Tab value="diario" no JobDetailTabs | EXISTE registrada |

**Gap pre-existente critico:** existe desalinhamento entre os nomes das colunas no banco (migration original) e os nomes usados pela EF e pelo frontend. A EF usa weather_condition mas o banco tem weather, a EF usa planned_scenes mas o banco tem scenes_planned, etc. A migration desta onda corrige esse desalinhamento via RENAME COLUMN antes de adicionar novos campos.

---

## 1. Visao Geral

O Diario de Set e o registro formal do que aconteceu em cada dia de filmagem: cenas filmadas, horarios reais, ocorrencias, presenca da equipe. O Boletim de Producao e a secao de status formal: como correu o dia, se esta no cronograma, quais sao os proximos passos.

Hoje a producao audiovisual registra o dia de filmagem em anotacoes no papel, grupos de WhatsApp ou na cabeca do Diretor de Producao. O CEO descobre como foi o dia por mensagem de texto. Nao ha historico estruturado, nao ha indicador de status, nao ha registro de quem esteve presente.

**A dor real (palavras do CEO):**
- Resposta 4.2 do questionario: Diario de set - Nao tem, gostaria de ter
- M-07 do organograma: Boletim de producao / diario de set - CEO quer\! Nao existe. Registro formal do que aconteceu na diaria

**O formulario basico ja existe** (TabProductionDiary.tsx). O que falta e: a secao do Boletim de Producao (status do dia, presenca da equipe, equipamentos, proximos passos), o vinculo com as datas de filmagem cadastradas no job, e o indicador visual de dias preenchidos vs pendentes.

---

## 2. Problema

### O que acontece hoje

- O Diretor de Producao registra o dia no caderno ou manda WhatsApp para o CEO
- Nao ha historico estruturado do que foi filmado em cada dia
- O CEO nao sabe o status do job (adiantado/no cronograma/atrasado) sem perguntar
- Nao ha registro de quem esteve presente no set em cada dia
- O sistema tem um formulario basico de diario (ja implementado), mas falta a secao de Boletim

### O que existe hoje no sistema (TabProductionDiary.tsx)

Campos existentes: data (manual), dia numero, clima (sol/nublado/chuva/noturna), call_time, wrap_time, cenas planejadas (texto livre), cenas filmadas (texto livre), total de takes, problemas, destaques, observacoes, fotos por URL.

O que nao existe: vinculo com shooting_dates cadastradas, locacao especifica do dia, horario de inicio das filmagens, horario do almoco, status do dia (adiantado/atrasado), presenca da equipe, lista de equipamentos, resumo executivo, proximos passos, assinatura do Diretor de Producao.

---

## 3. Personas e Permissoes

### P1: Diretor de Producao (usuario principal)
Freela senior que coordena o set. Principal responsavel por preencher o diario ao fim de cada dia de filmagem. Acessa pelo celular na maioria das vezes, no set ou logo apos a diaria. Hoje registra no papel ou envia mensagem de texto.

**Problema atual:** o papel diretor_producao foi adicionado ao enum em 20260306200000, mas a EF nao o inclui em ALLOWED_ROLES. O DP nao consegue criar diarios hoje.

### P2: CEO / Produtor Executivo
Centraliza tudo. Precisa saber ao fim do dia: o job esta no cronograma? Houve problemas? O que acontece amanha? Hoje sabe pelo WhatsApp. Com o Boletim, ve em 30 segundos sem interromper a equipe.

### P3: CCO
Acompanha o set criativamente. Precisa saber quais cenas foram filmadas e quais ficaram pendentes para alinhar com o diretor e com a pos-producao.

### P4: Coordenador de Producao
Apoia o DP. Pode preencher o diario quando o DP nao puder.

### Tabela de permissoes

| Acao | ceo | produtor_executivo | cco | diretor_producao | coordenador_producao | atendimento | outros |
|------|----|----|----|----|----|----|----|
| Criar diario | Sim | Sim | Sim | Sim | Sim | Nao | Nao |
| Editar proprio | Sim | Sim | Sim | Sim | Sim | Nao | Nao |
| Editar qualquer | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Excluir (soft) | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Visualizar | Sim | Sim | Sim | Sim | Sim | Sim | Sim (equipe do job) |
| Adicionar foto | Sim | Sim | Sim | Sim | Sim | Nao | Nao |

**Nota:** a EF atual tem ALLOWED_ROLES = [admin, ceo, produtor_executivo, coordenador_producao]. Esta onda adiciona diretor_producao e cco.

---
## 4. User Stories

### MUST HAVE

**US-2.3.01 - Vincular diario as datas de filmagem cadastradas**
Como DP, quero selecionar a data a partir das datas cadastradas no job.

Criterios de aceite:
- CA-01.1: Select com datas em job_shooting_dates do job
- CA-01.2: Ao selecionar uma data, locacao e preenchida automaticamente
- CA-01.3: Opcao Outra data ao final do Select para datas nao cadastradas
- CA-01.4: Datas com diario ja preenchido exibem icone check verde no Select
- CA-01.5: shooting_date_id e salvo junto com o registro
- CA-01.6: Se job nao tem shooting_dates, exibe input manual como fallback
- CA-01.7: Tentativa de criar segundo diario para mesma data retorna erro 409

**US-2.3.02 - Campos basicos do diario (extensao)**
Como DP, quero preencher horarios precisos e locacao especifica, para ter registro completo.

Criterios de aceite:
- CA-02.1: Campo Locacao do dia (texto livre, pre-preenchido via shooting_date selecionada)
- CA-02.2: Campos de horario: call_time (ja existe), filming_start_time (Inicio das filmagens - novo), lunch_time (Almoco - novo), wrap_time (ja existe). Todos HH:MM
- CA-02.3: Condicao climatica: sol, nublado, chuva, noturna, indoor. O valor indoor e novo
- CA-02.4: Campos de texto mantidos: cenas planejadas, problemas, destaques, observacoes
- CA-02.5: Ao salvar com sucesso, toast: Dia X registrado - DD/MM/AAAA

**US-2.3.03 - Lista estruturada de cenas e takes**
Como DP, quero registrar cada cena filmada com numero, status e takes de forma estruturada.

Criterios de aceite:
- CA-03.1: Sub-secao Cenas Filmadas no formulario com botao Adicionar Cena
- CA-03.2: Cada cena tem: numero/codigo (texto obrigatorio), descricao curta (opcional), takes realizados (numero), take aprovado (numero, opcional), status (ok / incompleta / nao_gravada)
- CA-03.3: Cenas exibidas com chips coloridos: ok em verde, incompleta em amarelo, nao_gravada em vermelho
- CA-03.4: Botao remover por cena com confirmacao inline
- CA-03.5: Campo cenas planejadas (texto) mantido separado como referencia da Ordem do Dia
- CA-03.6: Campo total_takes atualizado automaticamente com soma dos takes quando scenes_list tem items; editavel manualmente se vazio
- CA-03.7: Dados salvos em scenes_list (JSONB): array de objetos com scene_number, description, takes, ok_take, status

**US-2.3.04 - Presenca da equipe no dia**
Como DP, quero marcar quem da equipe esteve no set, para ter registro de presenca sem planilha.

Criterios de aceite:
- CA-04.1: Sub-secao Presenca da Equipe no formulario
- CA-04.2: Lista pre-carregada com membros da job_team com hiring_status = confirmado, exibindo nome e papel
- CA-04.3: Cada membro tem: checkbox presente/ausente (padrao: presente), horario de chegada (HH:MM, opcional), observacao (texto, opcional)
- CA-04.4: Contagem no header: X/Y presentes (ex: 12/15 presentes)
- CA-04.5: Presenca salva em attendance_list (JSONB): array com person_id, person_name, role, present, arrival_time, notes
- CA-04.6: Possibilidade de adicionar participante extra sem person_id (nome livre)
- CA-04.7: Lista exibe todos os membros confirmados independente do periodo de alocacao

**US-2.3.05 - Boletim de Producao**
Como CEO, quero ver ao final de cada dia de filmagem um boletim com status, resumo e proximos passos, para acompanhar o andamento do job sem perguntar por WhatsApp.

Criterios de aceite:
- CA-05.1: Sub-secao Boletim no formulario com campos: status do dia (no_cronograma / adiantado / atrasado), resumo executivo (Textarea, max 2000 chars), proximos passos (Textarea)
- CA-05.2: Campo Lista de Equipamentos: lista dinamica, cada item tem nome e quantidade. Salvo em equipment_list (JSONB): array com name, quantity, notes
- CA-05.3: Campo Assinatura do DP: Input texto (nome completo). Nao e assinatura digital
- CA-05.4: Badge de status no card: verde para no_cronograma, azul para adiantado, vermelho para atrasado
- CA-05.5: Indicador Boletim pendente no card quando executive_summary e null ou vazio
- CA-05.6: Campos do Boletim sao opcionais: criar diario sem preencher o Boletim e valido

**US-2.3.06 - Fotos do set (alinhamento de schema)**
Como DP, quero continuar adicionando fotos ao diario por URL como ja existe hoje.

Criterios de aceite:
- CA-06.1: Funcionalidade de fotos existente em TabProductionDiary.tsx mantida sem alteracao de comportamento
- CA-06.2: Migration desta onda alinha colunas em production_diary_photos: diary_entry_id -> entry_id, file_url -> url, ADD thumbnail_url, taken_at, uploaded_by
- CA-06.3: photo_type CHECK em portugues: referencia, bts, continuidade, problema (a migration dropa e recria o CHECK)
- CA-06.4: Dados existentes no banco continuam validos apos o RENAME (RENAME COLUMN preserva dados)

### SHOULD HAVE

**US-2.3.07 - Indicador de diario na tab de Diarias**
Como CEO, quero ver na listagem de datas de filmagem quais dias tem diario preenchido e quais estao pendentes.

Criterios de aceite:
- CA-07.1: Na tab Diarias (TabDiarias.tsx), cada shooting_date exibe indicador circular: verde se ha diario, cinza se pendente
- CA-07.2: Clique no indicador verde navega para tab diario com a entrada em destaque
- CA-07.3: Clique no indicador cinza abre formulario pre-preenchido com data e locacao do dia
- CA-07.4: Contador no header da tab: X de Y dias com diario registrado
- CA-07.5: Query adicional carrega IDs de shooting_dates com diario; sem N+1

**US-2.3.08 - Resumo de cenas no card do diario**
Como CEO, quero ver no card de cada dia quantas cenas foram filmadas vs planejadas.

Criterios de aceite:
- CA-08.1: Card exibe Cenas: X filmadas (ok) / Y total quando scenes_list tem items
- CA-08.2: Badge de atencao quando ha cenas com status incompleta ou nao_gravada
- CA-08.3: Se scenes_list vazio, exibe texto dos campos de texto de cenas como antes

### COULD HAVE (Sprint 2 - fora do MVP)

**US-2.3.09 - Exportar boletim em PDF**
Como CEO, quero exportar o Boletim de Producao em PDF para enviar ao cliente ou arquivar.

Criterios de aceite (a definir no Sprint 2):
- PDF inclui logo, nome do job, data, dia numero, status, resumo executivo, cenas, presenca, equipamentos, proximos passos, assinatura
- Implementado como Edge Function separada production-diary/pdf
- Link de download disponivel no card apos boletim preenchido

---
## 5. Modelo de Dados

### 5.1 Gap pre-existente: RENAME COLUMN (pre-requisito da migration)

A migration original (20260303030000) criou colunas com nomes diferentes dos usados pela EF e frontend. A migration desta onda corrige via RENAME COLUMN antes de adicionar novos campos.

**Desalinhamentos em production_diary_entries:**

| Coluna no banco (hoje) | Nome na EF/frontend | Acao |
|------------------------|---------------------|------|
| weather | weather_condition | RENAME COLUMN |
| scenes_planned | planned_scenes | RENAME COLUMN |
| scenes_completed | filmed_scenes | RENAME COLUMN |
| takes_count | total_takes | RENAME COLUMN |
| notes | observations | RENAME COLUMN |
| problems | issues | RENAME COLUMN |

**Desalinhamentos em production_diary_photos:**

| Coluna no banco (hoje) | Nome na EF/frontend | Acao |
|------------------------|---------------------|------|
| diary_entry_id | entry_id | RENAME COLUMN |
| file_url | url | RENAME COLUMN |
| (nao existe) | thumbnail_url | ADD COLUMN TEXT |
| (nao existe) | taken_at | ADD COLUMN TIMESTAMPTZ |
| (nao existe) | uploaded_by | ADD COLUMN UUID FK profiles |

O campo photo_type no banco tem CHECK IN (reference, bts, continuity, problem) em ingles. A EF usa valores em portugues (referencia, bts, continuidade, problema). A migration dropa e recria o CHECK com os valores em portugues.

### 5.2 Campos novos em production_diary_entries (ADD COLUMN)

| Coluna | Tipo | Restricoes | Descricao |
|--------|------|------------|-----------|
| shooting_date_id | uuid | nullable, FK job_shooting_dates ON DELETE SET NULL | Vinculo explicito com a data de filmagem cadastrada |
| location | text | nullable | Locacao do dia (pre-preenchida via shooting_date, editavel) |
| filming_start_time | text | nullable | Horario de inicio das filmagens (HH:MM) |
| lunch_time | text | nullable | Horario do almoco (HH:MM) |
| scenes_list | jsonb | NOT NULL, default array vazio | Lista estruturada de cenas filmadas |
| day_status | text | nullable, CHECK | Status do dia: no_cronograma, adiantado, atrasado |
| executive_summary | text | nullable, max 2000 | Resumo executivo do dia (Boletim) |
| attendance_list | jsonb | NOT NULL, default array vazio | Lista de presenca da equipe |
| equipment_list | jsonb | NOT NULL, default array vazio | Lista de equipamentos utilizados |
| next_steps | text | nullable | Proximos passos para o dia seguinte |
| director_signature | text | nullable | Nome do DP que assinou o boletim (campo texto) |
| updated_by | uuid | nullable, FK profiles ON DELETE SET NULL | Ultimo usuario que editou |

Constraints novas:
- weather_condition: ADD CHECK IN (sol, nublado, chuva, noturna, indoor) apos o rename
- day_status: ADD CHECK IN (no_cronograma, adiantado, atrasado) OR NULL

### 5.3 Schemas JSONB

**scenes_list** - uma entrada por cena filmada:

Campos de cada item: scene_number (texto, obrigatorio), description (texto, opcional), takes (inteiro), ok_take (inteiro, opcional), status (ok / incompleta / nao_gravada)

**attendance_list** - uma entrada por membro da equipe:

Campos de cada item: person_id (uuid, nullable para extras), person_name (texto), role (texto), present (boolean), arrival_time (texto HH:MM, opcional), notes (texto, opcional)

**equipment_list** - lista livre de equipamentos:

Campos de cada item: name (texto, obrigatorio), quantity (inteiro, opcional), notes (texto, opcional)

### 5.4 Nenhuma tabela nova

Todo o conteudo novo e armazenado em colunas adicionadas a production_diary_entries existente. O Boletim de Producao faz parte do mesmo registro do Diario de Set.

---
## 6. Regras de Negocio

**RN-01: Um diario por dia por job**
A constraint UNIQUE (job_id, shooting_date, tenant_id) permanece. A EF retorna 409 com mensagem clara ao tentar duplicar.

**RN-02: Dia numero auto-calculado**
Se day_number nao for fornecido, a EF calcula como COUNT(entries existentes do job) + 1. O usuario pode sobrescrever manualmente.

**RN-03: Shooting_date_id e opcional**
Jobs sem shooting_dates cadastradas ou diarios criados antes desta feature podem ter shooting_date_id = NULL. A unicidade usa shooting_date (DATE), nao shooting_date_id.

**RN-04: Boletim e opcional**
Criar um diario sem preencher o Boletim e valido. O sistema exibe badge Boletim pendente visualmente, mas nao bloqueia o save.

**RN-05: Soft delete obrigatorio**
A EF de delete deve setar deleted_at, nunca DELETE fisico em production_diary_entries. Fotos podem ser deletadas fisicamente (tabela sem soft delete).

**RN-06: Edicao de outros diarios e restrita**
Qualquer papel autorizado edita seu proprio diario. Para editar diario de outro usuario do mesmo tenant, e necessario ser ceo ou produtor_executivo. Validacao feita na EF.

**RN-07: Horarios como TEXT HH:MM**
Todos os campos de horario (call_time, wrap_time, filming_start_time, lunch_time e horarios na attendance_list) sao TEXT no formato HH:MM, seguindo o padrao da tabela shooting_day_orders. Evita problemas de timezone.

**RN-08: RENAME COLUMN preserva dados**
O RENAME COLUMN do PostgreSQL apenas renomeia a coluna sem mover dados. Registros existentes continuam validos. Ordem obrigatoria de deploy: migration primeiro, EF depois, frontend por ultimo.

**RN-09: Papel diretor_producao em ALLOWED_ROLES**
O papel diretor_producao foi adicionado ao enum em 20260306200000. Deve ser incluido em ALLOWED_ROLES nos handlers create, update e photos da EF. Sem esta correcao, o principal usuario desta feature nao consegue criar diarios.

---
## 7. Telas Propostas

### T1: TabProductionDiary.tsx - extensao do componente existente

O componente ja existe com CRUD basico. Esta onda adiciona novas sub-secoes ao dialog de criacao/edicao.

**T1-A: Campo de data refatorado**
- Antes: Input type=date manual
- Depois: Select com datas de job_shooting_dates + opcao Outra data
- Pre-preenchimento de location ao selecionar a data

**T1-B: Novos campos de horario e locacao**
- filming_start_time (Inicio das filmagens)
- lunch_time (Almoco)
- location (Locacao do dia)
- indoor adicionado ao Select de clima

**T1-C: Sub-secao Cenas Filmadas (nova)**
- Lista dinamica com botao Adicionar Cena
- Chips coloridos por status de cada cena
- Campo cenas planejadas mantido como referencia da OD

**T1-D: Sub-secao Presenca da Equipe (nova)**
- Pre-carrega job_team com hiring_status = confirmado
- Checkbox por membro + horario chegada opcional
- Contagem X/Y presentes no header

**T1-E: Sub-secao Boletim de Producao (nova)**
- Status do dia (Select: no_cronograma / adiantado / atrasado)
- Resumo executivo (Textarea)
- Proximos passos (Textarea)
- Equipamentos (lista dinamica: nome + quantidade)
- Assinatura do DP (Input texto)

**T1-F: Card de listagem atualizado**
- Badge de status do dia no header do card
- Indicador Boletim pendente quando executive_summary nulo
- Contagem de cenas: X filmadas (quando scenes_list preenchida)
- Contagem de presentes: X/Y (quando attendance_list preenchida)

### T2: TabDiarias.tsx - indicadores por shooting_date (Should Have)

**T2-A: Indicador por data**
- Icone circulo verde (check) se ha diario para a data
- Icone circulo cinza se pendente
- Clique no verde: navega para tab diario
- Clique no cinza: abre formulario pre-preenchido

**T2-B: Contador no header**
- X de Y dias com diario registrado

---
## 8. Fora de Escopo

| Item | Por que nao entra | Quando entra |
|------|-------------------|--------------|
| Upload direto de fotos (Storage) | URL e suficiente; upload adiciona complexidade de armazenamento | Sprint 2 (Onda 3) |
| Exportar boletim em PDF | Sprint 2 desta onda; mais complexo tecnicamente | US-2.3.09 Sprint 2 |
| Assinatura digital do boletim (DocuSeal) | Overkill para uso interno; campo texto e suficiente agora | Nao e o pedido |
| Notificacoes WA ao fim do dia | Depende de n8n; fora do escopo desta onda | Onda 3 (IA Producao) |
| Integracao com Ordem do Dia (shooting_day_orders) | OD e pre-set; Diario e pos-set; coexistem sem vinculo direto nesta onda | Onda 3 se necessario |
| Aprovacao formal do boletim | CEO nao pediu workflow de aprovacao | Nao e o pedido |
| Calculo de custo de horas extras no boletim | Coberto por time_entries e TabOvertime | Ja existe separado |
| Tracker de material bruto (cartoes SD, SSDs) | Feature separada de logger; fora do escopo | Onda 3 |
| Historico de versoes do diario | Diario e registro de fato, nao documento versionavel | Nao e o pedido |
| Diario para jobs de fotografia (sem cenas) | Mesmo formulario funciona; cenas sao opcionais | Ja coberto como opcao |

---

## 9. Dependencias

| Dependencia | Status | Onde e usada |
|-------------|--------|--------------|
| production_diary_entries | EXISTE - precisa de RENAME (6 colunas) + ADD (12 colunas) | Tabela principal desta onda |
| production_diary_photos | EXISTE - precisa de RENAME (2 colunas) + ADD (3 colunas) + fix CHECK | Fotos vinculadas ao diario |
| Edge Function production-diary | EXISTE - precisa ser extendida (campos novos + ALLOWED_ROLES) | CRUD dos diarios |
| TabProductionDiary.tsx | EXISTE - precisa de extensao do formulario | Formulario e listagem |
| job_shooting_dates | EXISTE (campos: id, job_id, shooting_date, location) | Select de datas no formulario |
| job_team | EXISTE (campos: id, person_name, role, hiring_status) | Pre-carregamento da presenca |
| Papel diretor_producao no enum | EXISTE (migration 20260306200000) | Adicionar a ALLOWED_ROLES da EF |
| TabDiarias.tsx | EXISTE - pequena alteracao para indicadores | Indicadores de status por data |
| JobDetailTabs.tsx | EXISTE - nenhuma alteracao necessaria | Tab diario ja registrada |
| Onda 2.2 (PPM/Pre-producao) | CONCLUIDA | Nao ha dependencia direta |

---
## 10. Criterio de Done

A Onda 2.3 e CONCLUIDA quando todos os itens abaixo estiverem verificados.

### Backend (migration)

- [ ] RENAME COLUMN em production_diary_entries: weather->weather_condition, scenes_planned->planned_scenes, scenes_completed->filmed_scenes, takes_count->total_takes, notes->observations, problems->issues
- [ ] RENAME COLUMN em production_diary_photos: diary_entry_id->entry_id, file_url->url
- [ ] ADD COLUMN em production_diary_photos: thumbnail_url (TEXT), taken_at (TIMESTAMPTZ), uploaded_by (UUID FK profiles)
- [ ] ADD COLUMN em production_diary_entries: shooting_date_id, location, filming_start_time, lunch_time, scenes_list, day_status, executive_summary, attendance_list, equipment_list, next_steps, director_signature, updated_by
- [ ] DROP + ADD CHECK em photo_type (ingles -> portugues)
- [ ] ADD CHECK em weather_condition IN (sol, nublado, chuva, noturna, indoor)
- [ ] ADD CHECK em day_status IN (no_cronograma, adiantado, atrasado)
- [ ] Migration idempotente: verifica existencia de colunas antes de RENAME via pg_attribute

### Backend (Edge Function)

- [ ] ALLOWED_ROLES nos handlers create, update, photos: incluir diretor_producao e cco
- [ ] Schema Zod em create.ts: aceitar todos os campos novos
- [ ] Schema Zod em update.ts: aceitar todos os campos novos
- [ ] Handler list.ts: retornar todos os campos novos no SELECT
- [ ] Validacao: shooting_date_id valido (FK do mesmo job e tenant) quando fornecido

### Frontend

- [ ] TabProductionDiary.tsx: campo de data refatorado para Select de shooting_dates + opcao manual
- [ ] TabProductionDiary.tsx: campos filming_start_time, lunch_time, location adicionados ao formulario
- [ ] TabProductionDiary.tsx: indoor adicionado ao Select de clima
- [ ] TabProductionDiary.tsx: sub-secao Cenas Filmadas com lista dinamica por cena
- [ ] TabProductionDiary.tsx: sub-secao Presenca da Equipe com checklist da job_team
- [ ] TabProductionDiary.tsx: sub-secao Boletim de Producao com todos os campos
- [ ] TabProductionDiary.tsx: card de listagem com badge de status e indicador de boletim
- [ ] TabDiarias.tsx: indicador visual (verde/cinza) por shooting_date com links funcionais
- [ ] Tipos TypeScript DiaryEntry atualizados com todos os campos novos

### Qualidade

- [ ] Zero TypeScript errors em modo strict
- [ ] RENAME COLUMN nao perde dados existentes (validar com SELECT antes e depois)
- [ ] Formulario utilizavel no mobile (DP usa celular no set)
- [ ] Dark mode funcionando em todos os novos elementos
- [ ] Erro 409 com mensagem clara ao tentar duplicar diario de mesma data

### Testes ponta a ponta

- [ ] DP abre formulario de job com shooting_dates cadastradas: ve Select com datas; seleciona uma; location e preenchido automaticamente
- [ ] DP adiciona 3 cenas (2 ok, 1 incompleta): chips aparecem com cores corretas; total_takes calculado automaticamente
- [ ] DP abre sub-secao de presenca: ve membros confirmados; marca 2 ausentes; contador mostra 13/15
- [ ] DP preenche boletim com status adiantado: CEO ve badge azul no card
- [ ] CEO abre tab Diarias: ve indicadores verdes nas datas com diario e cinzas nas pendentes
- [ ] Clique em indicador cinza: formulario abre pre-preenchido com data e locacao do dia
- [ ] Tentativa de criar segundo diario para mesma data: erro 409 com mensagem clara

---
## 11. Metricas de Sucesso

- Pelo menos 1 diario preenchido por dia de filmagem nos jobs ativos, medido 30 dias apos deploy (meta: 100% das diarias; hoje: 0%)
- Taxa de preenchimento do Boletim >= 70% dos diarios criados (campo executive_summary preenchido)
- CEO consegue entender o status de um dia de filmagem em menos de 1 minuto via Boletim, sem WhatsApp
- DP consegue preencher o diario completo (incluindo Boletim) em menos de 10 minutos ao fim do dia
- Reducao qualitativa de perguntas de status no WhatsApp do job (avaliada pelo CEO 30 dias apos deploy)

---

## 12. Perguntas Abertas

As seguintes questoes precisam de resposta antes de iniciar a implementacao.

**PA-01: indoor substitui noturna ou se soma?**
A EF atual tem enum sol / nublado / chuva / noturna. O prompt original pede sol / nublado / chuva / indoor. Filmagens noturnas e filmagens em estudio (indoor) sao situacoes diferentes. Sugestao: manter os 4 valores e adicionar indoor como quinto. Confirmar com o CEO antes de implementar o CHECK constraint.

**PA-02: Filtro da lista de presenca por periodo de alocacao?**
Membros da job_team tem allocation_start e allocation_end. Ao abrir o formulario de um dia especifico, deve-se filtrar a lista de presenca mostrando apenas membros alocados naquela data? Ou mostrar todos os confirmados independente do periodo? Definir antes de implementar CA-04.2.

**PA-03: O boletim deve registrar aprovacoes de conteudo no set?**
No fluxo real, o cliente aprova takes no set via Atendimento. Ha interesse em registrar no diario quais cenas foram aprovadas pelo cliente? Se sim, isso se integra com a Onda 2.1 (Atendimento) ou fica no Diario?

**PA-04: Ordem de deploy - validar com TL**
A migration de RENAME COLUMN e idempotente mas irreversivel sem rollback manual. Confirmar se ha dados reais em producao nas tabelas antes de executar. Se houver dados, validar que a EF atual esta retornando erros (colunas nao encontradas) e que o deploy desta onda corrige o problema.

---

## 13. Referencias

Todos os requisitos rastreiam para ao menos uma fonte documentada abaixo.

| Fonte | Secao relevante |
|-------|-----------------|
| docs/specs/strategic-vision/04-organograma-operacional-ellaos.md | M-07 (Producao/Set), Bloco 4 (respostas CEO 4.1-4.5), Onda 2 item 2.3 |
| supabase/migrations/20260303030000_add_production_diary.sql | Estado atual das tabelas production_diary_entries e production_diary_photos |
| supabase/functions/production-diary/handlers/create.ts | ALLOWED_ROLES atuais, schema Zod, campos usados pela EF |
| supabase/functions/production-diary/handlers/photos.ts | Campos de fotos na EF, desalinhamento com o banco |
| supabase/functions/production-diary/handlers/list.ts | Query atual com join de fotos |
| frontend/src/components/job-detail/tabs/TabProductionDiary.tsx | Estado atual do frontend: tipos, formulario, queries |
| frontend/src/components/job-detail/JobDetailTabs.tsx | Tab diario registrada como value=diario |
| supabase/migrations/20260306200000_add_new_team_roles_and_update_drive_permissions.sql | Papel diretor_producao adicionado ao enum (precisa entrar em ALLOWED_ROLES) |
| supabase/migrations/20260305000001_create_shooting_day_orders.sql | Padrao de horarios como TEXT HH:MM na tabela shooting_day_orders |

---

*Spec gerada em 2026-03-07. Todos os requisitos rastreiam para respostas diretas do CEO ou para o estado real do codebase auditado. Nenhum requisito foi inventado.*
