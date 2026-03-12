# Onda 2.4 — Orcamentos pre-Job (CRM como funil financeiro)

**Modulo:** CRM — Financeiro pre-Job
**Data:** 2026-03-11
**Status:** IMPLEMENTADO
**Autor:** PM (Claude Sonnet 4.6)
**Versao:** 1.0

---

## Indice

1. Visao Geral
2. Personas e Jornadas
3. User Stories
4. Fluxos Principais
5. Regras de Negocio
6. Wireframes Textuais
7. Fora de Escopo
8. Metricas de Sucesso
9. Decisoes de Produto
10. Perguntas Abertas para Onda 3
11. Apendice — Rastreabilidade de Artefatos

---

## 1. Visao Geral

### 1.1 Problema

A Ellah Filmes, como a maioria das produtoras brasileiras de publicidade, trabalha com um funil que tem dois momentos financeiros distintos: o orcamento de concorrencia (antes do job existir) e o custo real do job (depois que ganha). O ELLAHOS nao suportava o primeiro momento.

Consequencia pratica: em marco/2026 a produtora mantinha 10 orcamentos ativos (ORC-2025-0001 a ORC-2026-0004, com 87 categorias preenchidas manualmente em planilhas) numa pasta do Google Drive chamada 000_Orcamentos_em_Negociacao. Cada orcamento era um arquivo Excel isolado, sem conexao com o CRM, sem historico de versoes e sem rastreabilidade de perdas.

Isso criava tres gaps operacionais:

| Gap | Impacto | Frequencia |
|-----|---------|------------|
| Orcamento nao vinculado ao CRM | PE nao ve custo estimado no funil; CEO nao sabe valor total em negociacao | Toda oportunidade |
| Nenhuma analise de perda estruturada | Impossivel saber por que se perde (preco? diretor? prazo?) | A cada derrota |
| Conversao manual para Job | PE copia dados a mao do Drive para o ELLAHOS ao ganhar | A cada vitoria |

### 1.2 Solucao

O CRM passa a ser o **funil financeiro completo** da produtora:

- Qualquer oportunidade nos estagios proposta, negociacao ou fechamento pode ter um orcamento com versoes numeradas (ORC-YYYY-XXXX).
- Ao mover para perdido, o sistema exige feedback estruturado (categoria + motivo + concorrente).
- Ao converter para job, os itens de custo sao transferidos automaticamente para o financeiro do job.
- O modulo /crm/perdas consolida a analise historica de win/loss para decisoes estrategicas.

### 1.3 Estado da Implementacao (11/03/2026)

| Sprint | Entregavel | Status |
|--------|-----------|--------|
| Sprint 1 | Migration SQL (3 tabelas + ALTER + 2 RPCs + RLS) | CONCLUIDO |
| Sprint 2 | Edge Functions (5 handlers: list, create, update, activate, loss-analytics) | CONCLUIDO |
| Sprint 3 | Frontend: OpportunityBudgetSection, LossFeedbackDialog, ConvertToJobDialog com budget | CONCLUIDO |
| Sprint 4 | Frontend: /crm/perdas (dashboard win/loss analytics) | CONCLUIDO |

### 1.4 Numeracao ORC

O codigo ORC segue o mesmo padrao atomico do codigo de job: ORC-{ANO}-{SEQUENCIA_4_DIGITOS}, por exemplo ORC-2025-0001 e ORC-2026-0004.

- Gerado na primeira versao de orcamento de cada oportunidade.
- Nunca reutilizado, mesmo se a oportunidade for deletada.
- Visivel na listagem do pipeline e no detalhe da oportunidade.

---

## 2. Personas e Jornadas

### 2.1 Ana — Produtora Executiva (PE)

**Perfil:** 8 anos de mercado, gerencia 3 a 8 oportunidades simultaneas. Precisa de visibilidade rapida sobre o valor financeiro de cada deal sem sair do CRM.

**Antes da Onda 2.4:**
Ana abre o Drive toda manha, navega ate 000_Orcamentos_em_Negociacao, abre o Excel da oportunidade, ve os numeros, fecha. Quando ganha, copia manualmente as categorias para o financeiro do job no ELLAHOS — processo que leva 15 a 20 minutos e e propicio a erro. Quando perde, nao registra nada.

**Depois da Onda 2.4:**
Ana abre a oportunidade no CRM. A secao Orcamento mostra imediatamente a versao ativa com total e top 4 categorias. Quando ganha, clica em Converter em Job e marca Transferir categorias de custo — o financeiro do job e preenchido automaticamente em segundos. Quando perde, o sistema solicita o motivo antes de confirmar a mudanca de estagio.

**Jornada critica — criar primeiro orcamento:**
1. Oportunidade chega no estagio proposta.
2. Ana clica no botao + Novo Orcamento na aba detalhes.
3. Preenche as 16 categorias GG com os valores estimados.
4. Clica em Ativar para tornar aquela versao a oficial.
5. Valor total aparece no card do Kanban.

**Jornada critica — nova versao apos revisao de escopo:**
1. Cliente pede reducao de escopo.
2. Ana clica em Nova versao (copia da ativa).
3. Edita apenas as categorias afetadas.
4. Ativa a nova versao — versao anterior vai para historico, valor no Kanban atualiza.

### 2.2 Roberto — CEO / Socio

**Perfil:** Visao de negocio, foca em conversao e ticket medio. Acessa ELLAHOS 2 a 3 vezes por semana para verificar o pipeline.

**Antes da Onda 2.4:**
Roberto pedia relatorios manuais toda segunda-feira. "Quanto temos em negociacao agora?" era uma pergunta que demorava horas para ser respondida porque as PEs precisavam somar os Excels.

**Depois da Onda 2.4:**
Roberto ve no Dashboard CRM o valor total do pipeline em tempo real. Na tela /crm/perdas, ve que nos ultimos 90 dias 60% das perdas foram por preco — insumo direto para a proxima reuniao de estrategia comercial.

**Jornada critica — reuniao estrategica mensal:**
1. Acessa /crm/perdas.
2. Filtra por periodo: 90 dias.
3. Ve grafico de categorias de perda: preco 40%, diretor 25%, prazo 20%, outro 15%.
4. Identifica o principal concorrente que aparece nas perdas de preco.
5. Toma decisao: revisar tabela de preco para o proximo trimestre.

### 2.3 Carla — Diretora Financeira

**Perfil:** Controla o fluxo de caixa. Precisa saber quais orcamentos tem chance real de virar receita e quando.

**Antes da Onda 2.4:**
Carla recebia uma planilha mensal consolidada das PEs. Nao tinha granularidade de categorias nem historico de versoes.

**Depois da Onda 2.4:**
Carla ve no Dashboard CRM o valor total do pipeline e o valor ponderado (valor vezes probabilidade). Quando um job e ganho, o financeiro ja chega preenchido com as categorias GG pre-aprovadas no orcamento.

### 2.4 Lucas — Atendimento

**Perfil:** Interface com o cliente. Cria oportunidades, registra briefs. Nao gerencia orcamentos detalhados, mas precisa saber em que estagio financeiro esta cada deal.

**Antes da Onda 2.4:**
Lucas criava a oportunidade no CRM e depois pedia para a PE abrir o Excel correspondente. Desconexao total.

**Depois da Onda 2.4:**
Lucas cria a oportunidade. Na aba de detalhe, ve o badge ORC-YYYY-XXXX assim que a PE criar o primeiro orcamento. Pode criar versao rascunho (permissao de atendimento), mas nao pode ativar versoes.

---

## 3. User Stories

### US-ORC-01 — Ver orcamento no detalhe da oportunidade

**Como** Ana (PE), **quero** ver o orcamento ativo da oportunidade diretamente na pagina de detalhe do CRM, **para** nao precisar abrir o Drive para consultar o valor estimado.

**Criterios de Aceite:**

- [ ] CA-01: A aba de detalhe exibe a secao Orcamento para estagios proposta, negociacao, fechamento, ganho ou perdido.
- [ ] CA-02: Com versao ativa: exibe codigo ORC, numero da versao, total em R$, data de criacao, top 4 categorias por valor.
- [ ] CA-03: Sem versao: exibe botao + Novo Orcamento (apenas para roles com permissao de escrita).
- [ ] CA-04: Codigo ORC exibido no header da oportunidade quando ja tem orcamento.
- [ ] CA-05: Secao ocultada para estagios lead e qualificado.
- [ ] CA-06: Carregamento independente do restante da pagina (nao bloqueia renderizacao inicial).

**Validacao manual:**
1. Criar oportunidade no estagio proposta.
2. Verificar que secao Orcamento aparece com botao + Novo Orcamento.
3. Criar versao e ativar.
4. Verificar total e categorias corretas.
5. Verificar codigo ORC no header.

---

### US-ORC-02 — Criar e editar orcamento com categorias GG

**Como** Ana (PE), **quero** criar um orcamento com as 16 categorias padrao GG diretamente no CRM, **para** substituir os Excels manuais do Drive.

**Criterios de Aceite:**

- [ ] CA-01: Formulario exibe categorias organizadas por numero de item (01 a 16).
- [ ] CA-02: Cada categoria tem: numero, nome editavel, campo de valor em R$, observacoes (opcional).
- [ ] CA-03: Total calculado automaticamente em tempo real.
- [ ] CA-04: Categorias com valor zero exibidas em cor mais suave mas editaveis.
- [ ] CA-05: Botao Salvar rascunho persiste sem ativar.
- [ ] CA-06: Apenas roles admin, ceo, produtor_executivo, atendimento podem criar/editar versoes.
- [ ] CA-07: Versoes ativa ou historico sao somente leitura.
- [ ] CA-08: Feedback visual imediato ao salvar (toast sucesso ou erro).

**Validacao manual:**
1. Como PE, abrir oportunidade em proposta.
2. Clicar em + Novo Orcamento.
3. Preencher 5 categorias com valores.
4. Verificar total calculado automaticamente.
5. Salvar como rascunho. Verificar badge Rascunho.
6. Tentar editar como coordenador — deve ser impedido.

---

### US-ORC-03 — Ativar versao de orcamento

**Como** Ana (PE), **quero** ativar uma versao de orcamento para que ela seja considerada a oficial, **para** que o valor total apareca no pipeline e possa ser usado na conversao para job.

**Criterios de Aceite:**

- [ ] CA-01: Botao Ativar aparece apenas em versoes com status rascunho.
- [ ] CA-02: Versao so pode ser ativada se tiver ao menos 1 categoria com valor maior que zero.
- [ ] CA-03: Ao ativar, versao anterior ativa vai para status historico.
- [ ] CA-04: estimated_value da oportunidade atualizado para total da nova versao ativa.
- [ ] CA-05: Operacao atomica: nunca existem duas versoes ativas simultaneamente.
- [ ] CA-06: Apenas roles admin, ceo, produtor_executivo podem ativar.
- [ ] CA-07: Card no Kanban exibe valor atualizado apos ativacao.
- [ ] CA-08: Historico de versoes preservado e consultavel.

**Validacao manual:**
1. Criar v1 e ativar (R$100k).
2. Criar v2 e ativar (R$80k).
3. Verificar que v1 foi para historico.
4. Verificar estimated_value = R$80k.
5. Verificar valor no card do Kanban.

---

### US-ORC-04 — Criar nova versao baseada na versao ativa

**Como** Ana (PE), **quero** criar uma nova versao de orcamento copiando os itens da versao ativa, **para** revisar o escopo sem perder o historico.

**Criterios de Aceite:**

- [ ] CA-01: Botao Nova versao (copia da ativa) aparece quando ha versao ativa.
- [ ] CA-02: Nova versao contem todos os itens da versao ativa com os mesmos valores.
- [ ] CA-03: Nova versao criada com status rascunho — versao ativa permanece ativa.
- [ ] CA-04: Nova versao recebe proximo numero sequencial.
- [ ] CA-05: Mesmo codigo ORC mantido (nao gera novo codigo).
- [ ] CA-06: Editar nova versao nao afeta a versao ativa.

---

### US-ORC-05 — Feedback obrigatorio ao perder oportunidade

**Como** Roberto (CEO), **quero** que toda oportunidade movida para perdido exija um motivo estruturado, **para** construir uma base de dados de win/loss que permita decisoes estrategicas.

**Criterios de Aceite:**

- [ ] CA-01: Ao mover para perdido, sistema abre LossFeedbackDialog antes de confirmar a mudanca.
- [ ] CA-02: Dialog exibe: categoria da perda (obrigatorio), motivo detalhado (obrigatorio, min 10 chars), concorrente vencedor (opcional), valor do concorrente (opcional).
- [ ] CA-03: Categorias: Preco, Diretor/Talento, Prazo, Escopo, Relacionamento, Concorrencia, Outro.
- [ ] CA-04: Botao confirmar desabilitado ate categoria e motivo preenchidos.
- [ ] CA-05: Ao confirmar, stage = perdido e campos loss_category, loss_reason, winner_competitor, winner_value, actual_close_date persistidos atomicamente.
- [ ] CA-06: Ao cancelar, oportunidade permanece no estagio anterior.
- [ ] CA-07: DnD no Kanban intercepta drop para perdido e abre dialog em vez de atualizar diretamente.

**Validacao manual:**
1. Arrastar oportunidade de negociacao para perdido no Kanban.
2. Verificar que dialog abre antes de qualquer mudanca.
3. Tentar confirmar sem campos preenchidos — botao deve estar desabilitado.
4. Preencher categoria e motivo, confirmar.
5. Verificar oportunidade como perdida com dados salvos.
6. Verificar actual_close_date preenchido automaticamente.

---

### US-ORC-06 — Transferir orcamento ao converter para job

**Como** Ana (PE), **quero** que ao converter uma oportunidade ganha em job os itens do orcamento ativo sejam copiados para o financeiro do job, **para** nao precisar redigitar as categorias de custo.

**Criterios de Aceite:**

- [ ] CA-01: Dialog Converter em Job exibe secao Orcamento a transferir quando existe versao ativa.
- [ ] CA-02: Checkbox Transferir categorias de custo para o novo job aparece marcado por padrao.
- [ ] CA-03: Se checkbox marcado, itens com valor maior que zero criados como cost_items com item_status = orcado.
- [ ] CA-04: Campo import_source do cost_item recebe valor crm_opportunity_{id} para rastreabilidade.
- [ ] CA-05: Falha na transferencia NAO reverte criacao do job — aviso exibido ao usuario.
- [ ] CA-06: Apos conversao, usuario redirecionado para pagina do novo job.
- [ ] CA-07: Oportunidade fica com estagio ganho e job_id preenchido.

**Validacao manual:**
1. Criar oportunidade com versao ativa (3 categorias, R$150k).
2. Clicar em Converter em Job.
3. Verificar secao de orcamento no dialog.
4. Confirmar com checkbox marcado.
5. No job, verificar 3 cost_items com status orcado.
6. Verificar import_source dos cost_items.

---

### US-ORC-07 — Exportar orcamento como PDF

**Como** Ana (PE), **quero** exportar o orcamento ativo como PDF, **para** enviar ao cliente como proposta formal.

**Criterios de Aceite:**

- [ ] CA-01: Botao Exportar PDF aparece na secao de orcamento quando existe versao ativa.
- [ ] CA-02: PDF contem: nome da produtora, codigo ORC, nome da oportunidade, cliente/agencia, data, tabela de categorias, total.
- [ ] CA-03: Geracao client-side (jsPDF) — nao requer chamada ao backend.
- [ ] CA-04: Nome do arquivo: orc_code-v_numero_versao.pdf.
- [ ] CA-05: PDF gerado em menos de 3 segundos para orcamentos com ate 16 categorias.

---

### US-ORC-08 — Analisar historico de perdas

**Como** Roberto (CEO), **quero** ver um dashboard de analise de perdas com filtros por periodo e categoria, **para** identificar padroes e tomar decisoes estrategicas.

**Criterios de Aceite:**

- [ ] CA-01: Pagina /crm/perdas exibe KPIs: total perdas, valor total perdido, taxa de perda, principal concorrente.
- [ ] CA-02: Grafico de barras com distribuicao de perdas por categoria.
- [ ] CA-03: Tabela de concorrentes mais frequentes com contagem e valor total perdido.
- [ ] CA-04: Secao destaca clientes com 2 ou mais perdas (Clientes recorrentes perdidos).
- [ ] CA-05: Filtros por periodo (30/90/180/365 dias) e categoria de perda.
- [ ] CA-06: Botao Exportar CSV com lista completa de perdas.
- [ ] CA-07: Acesso restrito a roles admin, ceo, produtor_executivo.
- [ ] CA-08: Dados atualizados em tempo real ao mudar filtros (sem reload).

**Validacao manual:**
1. Acessar /crm/perdas como PE.
2. Verificar KPIs no topo.
3. Alterar filtro para 30 dias — dados devem atualizar sem reload.
4. Exportar CSV e verificar colunas e dados.
5. Tentar acessar como coordenador — deve ser redirecionado.

---

## 4. Fluxos Principais

### 4.1 Criar orcamento em oportunidade existente

    PE abre detalhe da oportunidade (estagio: proposta)
      |
      v
    Secao Orcamento exibe estado vazio: Nenhum orcamento criado
      |
      v
    PE clica em + Novo Orcamento
      |
      v
    Formulario abre com 16 linhas (categorias GG vazias)
      |
      v
    PE preenche categorias e valores
      |
      +-- [Salvar rascunho] --> Versao v1 criada com status rascunho
      |                         ORC code gerado atomicamente (1a versao)
      |                         Badge ORC aparece no header da oportunidade
      |
      +-- [Ativar] --> Valida: ao menos 1 item com valor maior que zero
                        |
                        +-- [Falha] --> Toast: Adicione ao menos um valor acima de zero
                        |
                        +-- [OK] --> RPC activate_budget_version executada
                                     estimated_value da oportunidade atualizado
                                     Kanban card atualizado
                                     Toast: Orcamento v1 ativado

**Edge cases:**
- Oportunidade muda de estagio para lead enquanto PE esta editando: backend rejeita com 422.
- Dois usuarios tentam ativar versoes diferentes simultaneamente: RPC usa transacao serializada; segundo usuario recebe erro de conflito.

### 4.2 Revisar orcamento apos mudanca de escopo

    PE acessa oportunidade com versao ativa (v1, R$200k)
      |
      v
    Cliente solicita reducao de escopo
      |
      v
    PE clica em Nova versao (copia da ativa)
      |
      v
    Sistema cria v2 como rascunho com os mesmos itens da v1
    v1 permanece ativa durante o processo
      |
      v
    PE edita valores na v2
      |
      v
    PE ativa v2
      |
      v
    v1 vai para historico
    estimated_value atualizado para total da v2
    Kanban card atualizado

**Edge case:** PE tenta criar nova versao mas ja existe rascunho nao ativado — sistema permite (pode ter multiplos rascunhos; apenas uma versao ativa por vez).

### 4.3 Mover oportunidade para perdido (via Kanban DnD)

    PE arrasta card de negociacao para coluna perdido
      |
      v
    STAGE_TRANSITIONS intercepta o drop
      |
      v
    LossFeedbackDialog abre (antes de qualquer mudanca de estado)
      |
      v
    PE preenche: categoria (obrigatorio) + motivo (obrigatorio)
                 + concorrente + valor concorrente (opcionais)
      |
      +-- [Cancelar] --> Card volta para posicao original. Nenhuma mudanca.
      |
      +-- [Confirmar] --> PATCH /crm/opportunities/:id com stage: perdido,
                          loss_category, loss_reason, winner_competitor,
                          winner_value, actual_close_date: agora
                          |
                          +-- [Sucesso] --> Card aparece em perdido
                                            Toast: Oportunidade registrada como perdida
                          |
                          +-- [Erro] --> Card volta para posicao original
                                          Toast com mensagem de erro

### 4.4 Converter oportunidade em job com transferencia de orcamento

    PE abre oportunidade (estagio: fechamento, versao ativa existente)
      |
      v
    PE clica em Converter em Job
      |
      v
    ConvertToJobDialog abre com:
    - Campos editaveis: titulo do job, valor fechado, tipo de producao
    - Dados copiados: cliente, agencia, formato, periodo, notas
    - Secao Orcamento a transferir: versao ativa, total, top 4 itens
    - Checkbox Transferir categorias de custo (marcado por padrao)
      |
      v
    PE confirma
      |
      v
    POST /crm/opportunities/:id/convert-to-job
      RPC convert_opportunity_to_job (atomica):
        Cria job com dados da oportunidade
        Atualiza oportunidade: stage=ganho, job_id=novo_job_id
      |
      +-- [transfer_budget=true] --> Busca versao ativa
                                      Cria cost_items para cada item com valor > 0
                                      |
                                      +-- [Erro] --> Job criado com aviso (nao reverte)
      |
      v
    Sucesso: redireciona para /jobs/novo_job_id

**Edge case:** Oportunidade ja foi convertida (job_id preenchido) — backend retorna 409; frontend exibe erro e link para o job existente.

### 4.5 Consultar analise de perdas

    CEO acessa /crm/perdas
      |
      v
    Pagina carrega com periodo padrao 90 dias
      |
      v
    KPIs: total perdido (count), valor total (R$), taxa de perda (%), top concorrente
      |
      v
    Graficos e tabelas de distribuicao carregam
      |
      v
    CEO altera filtro para 30 dias
      |
      v
    useQuery refetch automatico (filtro mudou)
    Todos os componentes atualizam com novos dados
      |
      v
    CEO exporta CSV para levar para reuniao

---

## 5. Regras de Negocio

### RN-01: Uma versao ativa por oportunidade

Cada oportunidade pode ter no maximo uma versao de orcamento com status ativa em qualquer momento. A operacao de ativacao e atomica (executada dentro de uma transacao PostgreSQL via RPC activate_budget_version): a versao anterior ativa e movida para historico antes da nova ser ativada.

**Rationale PM:** Simplifica o modelo mental. O orcamento da oportunidade e sempre o da versao ativa. O historico existe para auditoria e reversao manual se necessario.

### RN-02: Orcamento bloqueado apos fechamento

Oportunidades nos estagios ganho ou perdido tem o orcamento em modo somente leitura. Nenhuma versao pode ser criada, editada ou ativada nesses estagios.

**Rationale PM:** O orcamento de uma oportunidade fechada e um registro historico imutavel. Alteracoes depois do fechamento criariam inconsistencias nos relatorios de win/loss.

**Excecao:** Nao ha excecoes. Se o orcamento precisar ser revisado, a oportunidade nao deveria estar fechada.

### RN-03: Feedback obrigatorio ao perder

A transicao para perdido requer campos loss_category e loss_reason (minimo 10 caracteres). Sem esses campos, a API rejeita a requisicao com HTTP 422.

**Rationale PM:** Dados de win/loss so tem valor se forem coletados de forma consistente. Campos opcionais sao preenchidos em menos de 30% dos casos por experiencia de produto. A obrigatoriedade garante que o dashboard de analise de perdas tenha dados uteis para tomada de decisao.

### RN-04: Codigo ORC nunca e reutilizado

O codigo ORC-YYYY-XXXX e gerado na primeira versao de orcamento de uma oportunidade usando uma sequencia atomica por tenant por ano (INSERT ON CONFLICT DO UPDATE). Se a oportunidade for deletada (soft delete), o codigo nao e liberado.

**Rationale PM:** Codigos de orcamento sao referenciados em emails, planilhas e conversas com clientes. Reutilizar um codigo criaria confusao operacional grave.

### RN-05: Transferencia de orcamento nao e bloqueante

Ao converter uma oportunidade em job com transfer_budget=true, se a criacao dos cost_items falhar, o job NAO e revertido. A falha e registrada no response (campo budget_transfer) e exibida como toast de aviso.

**Rationale PM:** A conversao para job e a operacao mais critica do fluxo comercial. A transferencia de orcamento e uma conveniencia. Nao faz sentido perder um job criado por falha em uma etapa secundaria.

---

## 6. Wireframes Textuais

### 6.1 Secao de Orcamento — Estado: sem orcamento

    +-- Orcamento -----------------------------------------------+
    |                                                             |
    |  Nenhum orcamento criado para esta oportunidade             |
    |                                                             |
    |  [+ Novo Orcamento]                                         |
    |                                                             |
    +-------------------------------------------------------------+

### 6.2 Secao de Orcamento — Estado: versao ativa

    +-- Orcamento — ORC-2025-0042 ----------------------------+
    |                                                             |
    |  [badge verde: ATIVA] Versao v2                             |
    |  Criada por Ana Beatriz em 15/03/2026                       |
    |                                                             |
    |  01 Producao e Direcao .................. R$ 45.000   |
    |  02 Equipe Tecnica ...................... R$ 28.500   |
    |  03 Elenco ............................. R$ 15.000   |
    |  04 Locacao ............................ R$  8.000   |
    |  +3 categorias adicionais                                   |
    |                                                             |
    |  TOTAL ................................. R$ 96.500   |
    |                                                             |
    |  [Exportar PDF]  [Nova versao]  [+ Novo Orcamento]          |
    |                                                             |
    +-------------------------------------------------------------+

### 6.3 Editor de orcamento (versao em rascunho)

    +-- Editando v3 (rascunho) — ORC-2025-0042 ---------------+
    |                                                             |
    |  N  | Categoria              | Valor (R$) | Obs          |
    |  01 | Producao e Direcao     | [45.000   ] | [          ]  |
    |  02 | Equipe Tecnica         | [28.500   ] | [          ]  |
    |  03 | Elenco                 | [15.000   ] | [          ]  |
    |  04 | Locacao                | [ 8.000   ] | [          ]  |
    |  05 | Transportes            | [         ] | [          ]  |
    |  06 | Alimentacao            | [         ] | [          ]  |
    |  07 | Equipamentos Proprios  | [         ] | [          ]  |
    |  08 | Aluguel Equipamentos   | [         ] | [          ]  |
    |  09 | Arte e Cenografia      | [         ] | [          ]  |
    |  10 | Figurino               | [         ] | [          ]  |
    |  11 | Musica e Sonorizacao   | [         ] | [          ]  |
    |  12 | VFX e Animacao         | [         ] | [          ]  |
    |  13 | Finalizacao e Color    | [         ] | [          ]  |
    |  14 | BTS e Making Of        | [         ] | [          ]  |
    |  15 | Despesas Gerais        | [         ] | [          ]  |
    |  16 | Fee de Producao        | [         ] | [          ]  |
    |  ---|------------------------|-------------|---------------|
    |     TOTAL                    | R$ 96.500 |               |
    |                                                             |
    |  [Cancelar]  [Salvar rascunho]  [Ativar versao]             |
    |                                                             |
    +-------------------------------------------------------------+

### 6.4 LossFeedbackDialog

    +-- Registrar perda ------------------------------------------+
    |                                                             |
    |  Campanha Verao — Agencia XYZ                            |
    |                                                             |
    |  Categoria da perda *                                       |
    |  [Selecione...                                   v]         |
    |  > Preco                                                    |
    |  > Diretor / Talento                                        |
    |  > Prazo                                                    |
    |  > Escopo                                                   |
    |  > Relacionamento                                           |
    |  > Concorrencia                                             |
    |  > Outro                                                    |
    |                                                             |
    |  Motivo detalhado *                                         |
    |  +------------------------------------------------------+   |
    |  | [textarea, min 10 chars, max 1000 chars]              |   |
    |  +------------------------------------------------------+   |
    |  0 / 1000                                                   |
    |                                                             |
    |  Concorrente vencedor (opcional)                            |
    |  [___________________________]                              |
    |                                                             |
    |  Valor do concorrente — R$ (opcional)                  |
    |  [___________________________]                              |
    |                                                             |
    |  [Cancelar]                  [Confirmar perda]              |
    |                  (desabilitado ate campos preenchidos)       |
    |                                                             |
    +-------------------------------------------------------------+

### 6.5 ConvertToJobDialog — com orcamento para transferir

    +-- Converter em Job -----------------------------------------+
    |                                                             |
    |  DADOS DO JOB (voce pode editar)                            |
    |  Titulo do job *                                            |
    |  [Campanha Verao 2026 — Agencia XYZ         ]            |
    |                                                             |
    |  Valor fechado (R$)                                       |
    |  [96500                                        ]            |
    |                                                             |
    |  Tipo de producao                                           |
    |  [Publicidade TV                              v]            |
    |                                                             |
    |  ESTES DADOS SAO COPIADOS AUTOMATICAMENTE                   |
    |  +---------------------------------------------------------+ |
    |  | Cliente: Marca ABC    Agencia: Agencia XYZ               | |
    |  | Formato: 30s + 15s    Periodo: Jan-Fev/2026              | |
    |  +---------------------------------------------------------+ |
    |                                                             |
    |  ORCAMENTO A TRANSFERIR                                     |
    |  +---------------------------------------------------------+ |
    |  | Versao v2 — 7 categorias      R$ 96.500             | |
    |  | Producao e Direcao ............. R$ 45.000             | |
    |  | Equipe Tecnica ................. R$ 28.500             | |
    |  | Elenco ......................... R$ 15.000             | |
    |  | Locacao ........................ R$  8.000             | |
    |  | +3 categorias adicionais                                 | |
    |  |                                                          | |
    |  | [x] Transferir categorias de custo para o novo job       | |
    |  +---------------------------------------------------------+ |
    |                                                             |
    |  [i] A oportunidade ficara salva como Ganho. Voce sera      |
    |      redirecionado ao novo job apos a conversao.            |
    |                                                             |
    |  [Cancelar]                           [Criar Job]           |
    |                                                             |
    +-------------------------------------------------------------+

### 6.6 Dashboard /crm/perdas

    +-- Analise de Perdas ----------------------------------------+
    |                                                             |
    |  Periodo: [90 dias v]   Categoria: [Todas v]                |
    |                                                             |
    |  +--------+  +--------------+  +--------+  +----------+    |
    |  | 23     |  | R$ 4,2M    |  | 34%    |  | RivalCo  |    |
    |  | perdas |  | val. perdido |  | taxa   |  | top comp.|    |
    |  +--------+  +--------------+  +--------+  +----------+    |
    |                                                             |
    |  Distribuicao por categoria                                 |
    |  Preco        [|||||||||||||||||||] 40%                     |
    |  Diretor      [||||||||||||||]      25%                     |
    |  Prazo        [||||||||||]          20%                     |
    |  Concorrencia [|||||]               10%                     |
    |  Outro        [||]                   5%                     |
    |                                                             |
    |  Top concorrentes                                           |
    |  Rival Corp    8 perdas   R$ 1,8M                         |
    |  Producer BR   5 perdas   R$ 0,9M                         |
    |  Studio X      3 perdas   R$ 0,5M                         |
    |                                                             |
    |  [!] Clientes com multiplas perdas                          |
    |  Agencia ABC: 3 perdas em 90 dias                           |
    |                                                             |
    |  Lista de oportunidades perdidas                            |
    |  [Tabela: titulo | cliente | data | categoria | motivo]     |
    |                                                             |
    |  [Exportar CSV]                                             |
    |                                                             |
    +-------------------------------------------------------------+

---

## 7. Fora de Escopo

| # | Item | Justificativa |
|---|------|--------------|
| 1 | Aprovacao do orcamento pelo cliente via portal | Fluxo complexo com assinatura e notificacoes. Escopo Onda 3 (Portal do Cliente). |
| 2 | Multiplos orcamentos por versao (diferentes cenarios) | Modelo atual: 1 orcamento por versao com historico. Suficiente para o caso de uso. Revisavel no Onda 3. |
| 3 | Integracao automatica com Google Drive | Sincronizacao bidirecional requer Service Account e polling. Escopo Fase 6 (Integracoes). |
| 4 | Calculo de margem no orcamento (receita menos custo) | Requer modelagem de fee separado do custo bruto. Escopo Onda 3 (Financeiro avancado). |
| 5 | Notificacoes (email/WhatsApp) ao criar ou ativar orcamento | Requer integracao n8n. Escopo Onda 3 (Comunicacao automatizada). |
| 6 | Comparacao automatica entre versoes de orcamento (diff) | Funcionalidade de conveniencia. Pode ser feature incremental pos-Onda 2.4. |
| 7 | Importacao de orcamentos historicos do Drive | Migracao pontual de dados. Pode ser feita via CSV import existente em /admin/import. |
| 8 | Assinatura digital do orcamento | Depende de DocuSeal. Requer template especifico. Onda 3. |
| 9 | Orcamento em moeda estrangeira (USD, EUR) | Requer campo de moeda e taxa de cambio. Onda 4. |
| 10 | Versionamento de feedback de perda | Um registro de perda por oportunidade. Nao ha caso de uso para multiplos registros. |

---

## 8. Metricas de Sucesso

### 8.1 Adocao (primeiros 30 dias)

| Metrica | Meta | Como medir |
|---------|------|-----------|
| Percentual de oportunidades em proposta+ com orcamento | Acima de 70% | COUNT com budget / COUNT em proposta+ |
| Percentual de perdas com feedback preenchido | 100% | Garantido por RN-03 (obrigatorio na API) |
| Tempo medio para criar orcamento | Menos de 10 min | Coleta via entrevista/NPS |

### 8.2 Impacto operacional (90 dias)

| Metrica | Baseline | Meta |
|---------|----------|------|
| Orcamentos novos na pasta Drive | 10 arquivos existentes | 0 novos |
| Tempo de conversao oportunidade para job | 15 a 20 min (manual) | Menos de 2 min |
| Taxa de loss_reason preenchido | 0% (nao existia) | 100% |

### 8.3 Inteligencia estrategica (6 meses)

| Metrica | Objetivo |
|---------|---------|
| Volume de dados no dashboard de perdas | 30 ou mais perdas para analise significativa |
| Identificar top-3 categorias de perda | Insumo para revisao de estrategia comercial trimestral |
| Comparar winner_value vs estimated_value | Calibrar se orcamentos estao acima ou abaixo do mercado |

### 8.4 Queries de referencia

    -- Adocao de orcamentos por oportunidades ativas
    SELECT
      COUNT(DISTINCT o.id) FILTER (WHERE obv.id IS NOT NULL) AS with_budget,
      COUNT(DISTINCT o.id) AS total,
      ROUND(100.0 * COUNT(DISTINCT o.id) FILTER (WHERE obv.id IS NOT NULL)
        / NULLIF(COUNT(DISTINCT o.id), 0), 1) AS adoption_pct
    FROM opportunities o
    LEFT JOIN opportunity_budget_versions obv
      ON obv.opportunity_id = o.id AND obv.status = 'ativa'
    WHERE o.stage IN ('proposta', 'negociacao', 'fechamento')
      AND o.tenant_id = '{tenant_id}'
      AND o.deleted_at IS NULL;

    -- Top categorias de perda nos ultimos 90 dias
    SELECT
      loss_category,
      COUNT(*) as count,
      SUM(estimated_value) as total_value
    FROM opportunities
    WHERE stage = 'perdido'
      AND tenant_id = '{tenant_id}'
      AND actual_close_date >= NOW() - INTERVAL '90 days'
    GROUP BY loss_category
    ORDER BY count DESC;

---

## 9. Decisoes de Produto

### D-01: Feedback de perda — obrigatorio vs opcional

**Opcao A (escolhida): Obrigatorio na API**
- Dialog intercepta transicao para perdido.
- Backend valida presenca de loss_category e loss_reason.
- Retorna HTTP 422 se ausentes.

**Opcao B (descartada): Opcional com incentivo**
- Dialog aparece, mas pode ser pulado.
- Campo opcional com nudge visual.

**Justificativa:** Campos opcionais sao preenchidos em menos de 30% dos casos em ferramentas similares. O valor estrategico do dashboard de perdas depende de dados completos. O custo para o usuario e baixo: 2 campos + aproximadamente 30 segundos.

---

### D-02: Transferencia de orcamento — bloqueante vs nao-bloqueante

**Opcao A (escolhida): Nao-bloqueante**
- Job e criado mesmo se transferencia falhar.
- Falha exibida como aviso, nao erro fatal.

**Opcao B (descartada): Bloqueante com rollback**
- Job nao e criado se cost_items nao forem inseridos.
- Atomicidade total, porem alta friccao.

**Justificativa:** A conversao para job e o momento mais critico do fluxo comercial. Perder um job criado por falha em funcionalidade secundaria seria inaceitavel. A PE pode criar os cost_items manualmente se necessario.

---

### D-03: Categorias GG — fixas vs configuravel

**Opcao A (escolhida): Categorias com nomes editaveis, numeracao fixa (01-16)**
- Numeros de item sao fixos (padrao GG de mercado).
- display_name e editavel por versao.
- Consistencia nas planilhas GG enviadas para agencias.

**Opcao B (descartada): Categorias totalmente livres**
- Usuario cria quantas quiser com nomes livres.
- Mais flexivel, porem incompativel com padrao de mercado publicitario brasileiro.

**Justificativa:** O padrao GG (Grupo de Gastos) e o idioma comum entre produtoras e agencias brasileiras. Agencias esperam orcamentos no formato GG. Customizacao dos nomes mantem flexibilidade sem perder o padrao.

---

### D-04: Codigo ORC — por oportunidade vs por versao

**Opcao A (escolhida): Um ORC por oportunidade (compartilhado entre versoes)**
- ORC-2025-0001 para v1, v2 e v3 da mesma oportunidade.
- Referencia externa (emails, conversas) nao precisa ser atualizada ao criar nova versao.

**Opcao B (descartada): Um ORC por versao**
- ORC-2025-0001-v1, ORC-2025-0001-v2.
- Mais granular, porem gera confusao ao referenciar externamente.

**Justificativa:** O codigo ORC identifica a oportunidade comercial, nao o documento especifico. Quando a PE envia um email dizendo segue o ORC-2025-0042, ela quer dizer o orcamento desta campanha, independente da versao.

---

### D-05: Estagio minimo para ter orcamento — lead vs proposta

**Opcao A (escolhida): Apenas a partir de proposta**
- Leads e qualificados nao tem orcamento.
- Reduz ruido no pipeline.

**Opcao B (descartada): A partir de lead**
- Orcamento disponivel desde o inicio.
- Criaria orcamentos fantasmas para leads que nunca evoluem.

**Justificativa:** Na pratica da Ellah Filmes, orcamentos so sao elaborados quando a oportunidade avanca para proposta (cliente pediu proposta formal). Habilitar orcamento para leads adicionaria complexidade sem beneficio real.

---

## 10. Perguntas Abertas para Onda 3

### PA-01: Aprovacao do orcamento pelo cliente

**Contexto:** A PE hoje envia o PDF do orcamento por email e recebe aprovacao verbal ou por WhatsApp. Nao ha registro formal no sistema.

**Pergunta:** A Onda 3 deve implementar um fluxo de aprovacao formal? Opcoes:
- Portal do cliente com visualizacao do orcamento e botao de aprovacao?
- Assinatura digital via DocuSeal?
- Link simples com confirmacao por email?

**Impacto tecnico:** Requer tabela de aprovacoes, integracao com portal do cliente (ja existe), e possivelmente DocuSeal.

---

### PA-02: Importacao de orcamentos historicos (Drive para ELLAHOS)

**Contexto:** Existem 87 itens historicos de orcamento na pasta Drive. O wizard de importacao CSV/XLSX ja existe (/admin/import), mas nao suporta a entidade opportunity_budget_versions.

**Pergunta:** Vale adicionar uma entidade de importacao para orcamentos historicos? Ou o historico e irrelevante apos a Onda 2.4 estar ativa?

**Risco:** Sem importacao, os primeiros 6 meses de uso do dashboard de perdas nao terao contexto historico para analise estatistica.

---

### PA-03: Comparacao de delta entre versoes de orcamento

**Contexto:** Quando a PE cria v2 com escopo reduzido, a diferenca entre v1 e v2 revela quanto foi sacrificado. Hoje nao ha calculo automatico dessa diferenca.

**Pergunta:** O sistema deve calcular e exibir o delta entre versoes (quantidade e percentual por categoria)?

**Impacto:** Feature client-side sem mudancas no backend. Baixo custo de implementacao.

---

### PA-04: Calibragem de preco com winner_value

**Contexto:** Quando winner_competitor e winner_value sao preenchidos na perda, temos: nosso orcamento (estimated_value) vs orcamento do vencedor (winner_value).

**Pergunta:** O dashboard de perdas deve exibir a diferenca media entre estimated_value e winner_value para perdas por preco? Isso indicaria se a produtora esta sistematicamente acima ou abaixo do mercado.

**Risco de dado:** winner_value e opcional e pode ter vieses (cliente pode informar valor impreciso do concorrente).

---

### PA-05: Multi-moeda para projetos internacionais

**Contexto:** A Ellah Filmes ocasionalmente recebe briefings de clientes internacionais onde o orcamento e negociado em USD.

**Pergunta:** Qual e a frequencia de projetos internacionais? Justifica adicionar campo de moeda e taxa de cambio nas versoes de orcamento?

**Impacto tecnico:** Requer campos currency e exchange_rate em opportunity_budget_versions, e logica de conversao para exibir valores em BRL no dashboard.

---

### PA-06: Alerta proativo de deadline sem orcamento

**Contexto:** O campo response_deadline existe na oportunidade. Nao ha correlacao com a existencia ou ausencia de orcamento no modulo de alertas atual.

**Pergunta:** O sistema deve alertar a PE quando uma oportunidade com response_deadline em menos de 48h ainda nao tem versao ativa de orcamento?

**Impacto:** Requer nova logica no handler de alerts. Alta relevancia operacional para evitar perder prazos de entrega de proposta.

---

## 11. Apendice — Rastreabilidade de Artefatos

### 11.1 Banco de Dados

| Artefato | Tipo | Migration |
|----------|------|-----------|
| opportunity_budget_versions | Tabela nova | 20260311100000 |
| opportunity_budget_items | Tabela nova | 20260311100000 |
| orc_code_sequences | Tabela nova | 20260311100000 |
| opportunities.orc_code | Coluna nova | 20260311100000 |
| opportunities.loss_category | Coluna nova | 20260311100000 |
| opportunities.winner_competitor | Coluna nova | 20260311100000 |
| opportunities.winner_value | Coluna nova | 20260311100000 |
| opportunities.win_reason | Coluna nova | 20260311100000 |
| activate_budget_version | RPC PostgreSQL | 20260311100000 |
| upsert_orc_code_sequence | RPC PostgreSQL | 20260311100000 |

### 11.2 Edge Functions (EF crm)

| Handler | Rota | Metodo |
|---------|------|--------|
| list-versions.ts | /crm/opportunities/:id/budget/versions | GET |
| upsert-version.ts | /crm/opportunities/:id/budget/versions | POST |
| upsert-version.ts | /crm/opportunities/:id/budget/versions/:versionId | PATCH |
| activate-version.ts | /crm/opportunities/:id/budget/versions/:versionId/activate | POST |
| get-loss-analytics.ts | /crm/loss-analytics | GET |
| convert-to-job.ts | /crm/opportunities/:id/convert-to-job | POST (refatorado) |

### 11.3 Frontend

| Artefato | Tipo | Caminho |
|----------|------|---------|
| useCrmBudget.ts | Hook | frontend/src/hooks/useCrmBudget.ts |
| OpportunityBudgetSection.tsx | Componente | frontend/src/components/crm/OpportunityBudgetSection.tsx |
| LossFeedbackDialog.tsx | Componente | frontend/src/components/crm/LossFeedbackDialog.tsx |
| ConvertToJobDialog.tsx | Componente (refatorado) | frontend/src/components/crm/ConvertToJobDialog.tsx |
| /crm/perdas/page.tsx | Pagina | frontend/src/app/(dashboard)/crm/perdas/page.tsx |
| opportunity-budget-pdf.ts | Gerador PDF | frontend/src/lib/pdf/opportunity-budget-pdf.ts |

### 11.4 Decisoes de Arquitetura Relacionadas

| ADR | Titulo | Relevancia |
|-----|--------|-----------|
| ADR-030 | Audit trail trigger-based | Tabela audit_log captura mudancas em opportunities (stage, loss_category) |

---

*Spec gerada em 2026-03-11. Para questoes tecnicas, ver 08-orcamentos-pre-job-arquitetura.md.*
