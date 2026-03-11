# Onda 2.4 -- Orcamentos pre-Job: CRM como Funil Financeiro

**Data:** 2026-03-11
**Status:** RASCUNHO -- aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Onda:** 2.4 -- CRM Financeiro
**Esforco estimado:** 4-5 dias uteis (4 sprints)
**Depende de:** Onda 1.2 (CRM Conversao, CONCLUIDA), Fase 10 (Financeiro, CONCLUIDA)

---

## 1. Visao Geral

### 1.1 Problema

O ELLAHOS obriga criar um Job para ter qualquer recurso financeiro. Na pratica, produtoras audiovisuais trabalham com orcamentos detalhados **antes** de confirmar um projeto -- e muitos nunca viram Job. Hoje a Ellah Filmes mantem 10 orcamentos ativos na pasta 000_Orcamentos_em_Negociacao do Drive (ORC-2025-0001 a ORC-2026-0004, 87 itens), todos fora do sistema.

Consequencias concretas do gap:

- O CEO nao sabe o valor real do pipeline -- estimated_value e chute manual
- Quando perde uma concorrencia, nao ha registro estruturado do motivo: loss_reason e campo de texto livre hoje
- Ao converter oportunidade em job, nenhum custo e pre-carregado -- o PE precisa redigitar tudo no modulo financeiro
- Analise historica (ex: perdemos a Silimed 3 vezes) e impossivel sem dados estruturados

### 1.2 Solucao Proposta

Transformar o CRM em um funil financeiro completo:

1. **Orcamento detalhado na oportunidade** -- editor de GG simplificado (categorias 1-15 + 99) dentro da oportunidade, antes do job existir
2. **Codigo ORC automatico** -- sequencia ORC-YYYY-XXXX para identificar orcamentos externamente, espelhando o job_code
3. **Feedback de perda estruturado** -- captura obrigatoria de categoria + texto + concorrente + valor ao marcar perdido
4. **Conversao enriquecida** -- ao converter oportunidade para job, os itens do orcamento viram cost_items automaticamente
5. **Dashboard de perdas** -- analytics de motivos, valores e padroes para decisao estrategica

### 1.3 Personas Impactadas

| Persona | Dor atual | Beneficio |
|---------|-----------|----------|
| PE (Produtor Executivo) | Monta orcamento em planilha separada, perde ao nao ganhar o job | Orcamento vive no CRM, converte automaticamente |
| CEO | Nao entende padrao de perda de clientes | Dashboard de analise de perdas com dados estruturados |
| Financeiro | Recebe job zerado, redigita todos os custos | cost_items ja populados ao abrir o job |
| Atendimento | Registra motivo de perda em texto livre | Formulario guiado com campos estruturados |

---

## 2. User Stories

### US-ORC-01 -- Criar orcamento simplificado em oportunidade (Must Have)

Como PE, quero informar o valor estimado por categoria de custo diretamente na oportunidade, para ter um orcamento mais preciso do que um numero unico e poder comparar margens entre oportunidades.

**Criterios de Aceite:**

- CA-01.1: Nas stages lead e qualificado, a secao de orcamento exibe apenas um campo de valor total (estimated_value existente) -- sem editor de categorias
- CA-01.2: Nas stages proposta, negociacao e fechamento, aparece o editor de 16 categorias GG simplificado (item_number 1-15 + 99) carregadas da tabela cost_categories do tenant
- CA-01.3: Cada linha de categoria exibe: nome da categoria, campo de valor total (NUMERIC), campo de notas (TEXT opcional)
- CA-01.4: O sistema calcula e exibe o total somando todas as categorias preenchidas
- CA-01.5: O total calculado atualiza o campo estimated_value da oportunidade automaticamente ao salvar
- CA-01.6: Categorias com valor zero ou nulo sao salvas mas nao impactam o total
- CA-01.7: O PE pode salvar parcialmente -- nao e obrigatorio preencher todas as categorias
- CA-01.8: Ao mudar de qualificado para proposta, o sistema exibe mensagem encorajadora "Detalhe o orcamento por categoria para aumentar a precisao" (nao bloqueia a transicao)
- CA-01.9: A secao funciona em dark mode e mobile (touch 44px minimo)

### US-ORC-02 -- Versionar orcamento (Must Have)

Como PE, quero criar versoes do orcamento (v1, v2, v3) dentro de uma mesma oportunidade, para registrar a evolucao da negociacao e comparar o que mudou entre versoes sem perder o historico.

**Criterios de Aceite:**

- CA-02.1: Cada oportunidade pode ter N versoes de orcamento, numeradas sequencialmente (v1, v2...)
- CA-02.2: O botao Nova Versao copia todos os itens da versao atual para uma nova versao em status rascunho
- CA-02.3: Apenas uma versao pode estar com status ativa por vez -- ao ativar uma versao, as demais ficam como historico
- CA-02.4: A versao ativa e a que alimenta o estimated_value da oportunidade
- CA-02.5: O historico de versoes e listado com: numero, data de criacao, total, status
- CA-02.6: Versoes em historico sao somente-leitura
- CA-02.7: Ao abrir o editor pela primeira vez em uma oportunidade sem versoes, o sistema cria automaticamente uma v1 em rascunho

### US-ORC-03 -- Identificar orcamento com codigo ORC (Must Have)

Como PE, quero que cada orcamento tenha um codigo unico ORC-YYYY-XXXX, para referenciar nas comunicacoes com clientes sem expor o ID interno.

**Criterios de Aceite:**

- CA-03.1: Ao criar a primeira versao de orcamento em uma oportunidade, o sistema gera automaticamente um codigo ORC-YYYY-XXXX (ex: ORC-2026-0042) onde YYYY e o ano corrente e XXXX e a sequencia por tenant/ano com zero-fill de 4 digitos
- CA-03.2: O codigo ORC e imutavel apos gerado -- nao muda com novas versoes
- CA-03.3: O codigo ORC e exibido no header da oportunidade a partir do stage proposta
- CA-03.4: O codigo ORC e exibido no export PDF do orcamento
- CA-03.5: A sequencia e atomica por tenant/ano -- sem race conditions (mesma logica de job_code_sequences)
- CA-03.6: O codigo ORC nao e o mesmo que o codigo do job -- sao sequencias independentes

### US-ORC-04 -- Registrar feedback estruturado de perda (Must Have)

Como atendimento ou PE, quero preencher um formulario guiado ao marcar uma oportunidade como perdida, para que o CEO possa analisar padroes de perda e tomar decisoes comerciais baseadas em dados.

**Criterios de Aceite:**

- CA-04.1: Ao mover uma oportunidade para o stage perdido (via Kanban drag ou botao na pagina de detalhe), o sistema exibe obrigatoriamente um dialog de feedback antes de confirmar a mudanca
- CA-04.2: O dialog de feedback contem os seguintes campos:
  - loss_category (obrigatorio): select com opcoes Preco, Prazo, Concorrencia, Relacionamento, Escopo, Outro
  - loss_reason (obrigatorio): textarea de ate 1.000 caracteres com o contexto detalhado
  - winner_competitor (opcional): nome do concorrente que ganhou
  - winner_value (opcional): valor que o concorrente cobrou (NUMERIC)
- CA-04.3: O botao Confirmar Perda permanece desabilitado ate que loss_category e loss_reason estejam preenchidos
- CA-04.4: Ao confirmar, a oportunidade e atualizada atomicamente: stage = perdido, actual_close_date = today, todos os campos de feedback persistidos
- CA-04.5: O feedback fica visivel na timeline de atividades da oportunidade com icone de perda
- CA-04.6: O enum de loss_category e expandido para incluir concorrencia como opcao separada de relacionamento
- CA-04.7: Ao reabrir uma oportunidade perdida (via mudanca de stage), o feedback e preservado mas pode ser editado

### US-ORC-05 -- Converter oportunidade em job com cost_items automaticos (Must Have)

Como PE ou CEO, quero que ao converter uma oportunidade em job, os itens do orcamento sejam criados automaticamente como cost_items no modulo financeiro, para nao precisar redigitar todos os custos.

**Criterios de Aceite:**

- CA-05.1: O ConvertToJobDialog exibe uma secao Orcamento a transferir quando a oportunidade tem uma versao ativa de orcamento, listando o total por categoria
- CA-05.2: O PE pode optar por Transferir orcamento para o job (checkbox, marcado por padrao quando ha orcamento ativo)
- CA-05.3: Quando a opcao estiver marcada, a Edge Function convert-to-job cria automaticamente um job_budget vinculado ao job com os dados do orcamento
- CA-05.4: Cada categoria com valor maior que zero no orcamento gera um cost_item com is_category_header = true (sub_item_number = 0) no job recem-criado
- CA-05.5: Os cost_items criados automaticamente tem item_status = orcado e import_source = crm_opportunity_{opportunity_id}
- CA-05.6: O job criado exibe um banner Custos importados do orcamento CRM -- revise os valores na aba Financeiro
- CA-05.7: Se a transferencia falhar (erro de banco), o job e criado sem os custos e um aviso e exibido -- a conversao nao e revertida por falha na criacao dos cost_items
- CA-05.8: Oportunidades sem versao de orcamento ativa seguem o fluxo atual sem nenhuma mudanca

### US-ORC-06 -- Exportar PDF do orcamento pre-job (Should Have)

Como PE, quero gerar um PDF do orcamento da oportunidade para enviar ao cliente antes da existencia do job, com o cabecalho da produtora e o codigo ORC.

**Criterios de Aceite:**

- CA-06.1: O botao Exportar PDF aparece na secao de orcamento da oportunidade quando ha uma versao ativa
- CA-06.2: O PDF gerado reutiliza pdf-core.ts e budget-pdf.ts existentes, adaptados para receber dados da opportunity_budget_version em vez de job_budget
- CA-06.3: O PDF contem: codigo ORC, titulo da oportunidade, cliente/agencia, data de geracao, tabela de categorias com valores, total, validade da proposta
- CA-06.4: O PDF e gerado client-side (jsPDF) -- sem chamada ao backend
- CA-06.5: O nome do arquivo segue o padrao ORC-2026-0042_v2_NomeCliente.pdf
- CA-06.6: Versoes historicas tambem podem ser exportadas (somente-leitura)

### US-ORC-07 -- Visualizar dashboard de analise de perdas (Should Have)

Como CEO, quero uma pagina dedicada a analise de oportunidades perdidas, para entender padroes (por que perdemos, para quem, quanto), identificar clientes recorrentes e tomar decisoes sobre pricing e posicionamento.

**Criterios de Aceite:**

- CA-07.1: A pagina /crm/perdas exibe KPIs: total de oportunidades perdidas (periodo selecionavel), valor total perdido, taxa de perda (perdidas / total fechadas), concorrente mais frequente
- CA-07.2: Grafico de barras com distribuicao por loss_category
- CA-07.3: Tabela de oportunidades perdidas com colunas: titulo, cliente, data de perda, valor, categoria, concorrente vencedor, PE responsavel
- CA-07.4: Filtros: periodo (30d / 90d / 6m / 12m / personalizado), categoria de perda, PE responsavel, cliente
- CA-07.5: Destaque visual para clientes que aparecem em 2 ou mais perdas no periodo selecionado (clientes recorrentes perdidos)
- CA-07.6: Ranking dos top 5 concorrentes por frequencia de aparicao em winner_competitor
- CA-07.7: Exportacao da tabela em CSV
- CA-07.8: RBAC: acessivel para admin, ceo, produtor_executivo. Inacessivel para roles operacionais

### US-ORC-08 -- Visualizar historico de orcamentos por cliente ou agencia (Could Have)

Como PE ou CEO, quero ver no painel lateral da oportunidade o historico de orcamentos enviados para aquele cliente ou agencia, para calibrar melhor o proximo orcamento.

**Criterios de Aceite:**

- CA-08.1: O AgencyHistoryPanel existente e expandido com uma secao Orcamentos historicos quando a oportunidade tem client_id ou agency_id
- CA-08.2: A secao lista ate 5 orcamentos mais recentes (ganhos e perdidos) com: codigo ORC ou codigo do job, titulo, valor, resultado (ganho/perdido), data
- CA-08.3: Taxa de win/loss do cliente/agencia e exibida como badge no topo da secao
- CA-08.4: Link Ver todos abre listagem filtrada em /crm com o cliente/agencia selecionado

---

## 3. Fluxos Principais

### Fluxo 1 -- Criar orcamento em oportunidade

Modo simplificado (lead/qualificado): PE informa apenas estimated_value como hoje.

Modo detalhado (proposta+):

1. Sistema exibe editor de 16 categorias GG ao entrar em stage proposta
2. PE preenche valor por categoria (campos NUMERIC com notas opcionais)
3. Sistema calcula total em tempo real e exibe no rodape
4. PE clica Salvar Orcamento
5. Sistema cria opportunity_budget_version v1 (status: rascunho) e gera codigo ORC-YYYY-XXXX na primeira vez
6. estimated_value da oportunidade e atualizado com o total calculado
7. Codigo ORC aparece no header da oportunidade

### Fluxo 2 -- Versionar orcamento

1. Oportunidade tem orcamento v1 ativo
2. PE clica Nova Versao (cliente pediu revisao)
3. Sistema copia todos os itens de v1 para v2 (status: rascunho); v1 fica como historico
4. PE edita os valores de v2
5. PE clica Ativar esta versao
6. Sistema seta v2 como ativa e atualiza estimated_value com total de v2
7. Historico exibe: v1 historico (R$ X) | v2 ativa (R$ Y)

### Fluxo 3 -- Marcar oportunidade como perdida

1. PE arrasta card para coluna Perdido no Kanban OU clica botao Marcar como Perdida na pagina de detalhe
2. Sistema exibe LossFeedbackDialog -- oportunidade NAO avanca ate feedback ser preenchido
3. PE preenche campos obrigatorios: loss_category (select) e loss_reason (textarea)
4. PE preenche campos opcionais: winner_competitor (nome) e winner_value (valor)
5. PE clica Confirmar Perda
6. Sistema faz PATCH na oportunidade: stage=perdido, actual_close_date=today, todos os campos de feedback persistidos
7. Oportunidade movida para coluna Perdido, atividade criada na timeline
8. Cache invalidado: pipeline, dashboard, stats

### Fluxo 4 -- Converter oportunidade em job

1. Oportunidade em stage fechamento tem orcamento v2 ativo (ex: R$ 85.000)
2. PE clica Converter em Job -> ConvertToJobDialog
3. Dialog exibe campos editaveis existentes mais secao nova: Orcamento a transferir
   - Exibe: Versao v2 -- R$ 85.000 (8 categorias)
   - Checkbox: Criar cost_items a partir deste orcamento (marcado por padrao)
4. PE confirma -> POST /crm/opportunities/:id/convert-to-job com transferir_orcamento=true
5. Backend executa em sequencia:
   a. Cria job (logica atual)
   b. Marca oportunidade como ganho
   c. Cria job_budget vinculado ao job
   d. Para cada categoria com valor > 0: INSERT cost_item com item_number da categoria, unit_value=valor, quantity=1, item_status=orcado, import_source=crm_opportunity_{id}
   e. Registra atividade
6. Frontend: redirect para /jobs/{id} com banner Custos importados do CRM -- revise os valores na aba Financeiro

### Fluxo 5 -- Dashboard de analise de perdas

1. CEO acessa /crm/perdas
2. Pagina carrega com filtro padrao (ultimos 90 dias): KPIs, grafico por loss_category, tabela de perdas, destaque de clientes recorrentes
3. CEO ajusta filtros: periodo, categoria, PE responsavel, cliente
4. Tabela e ranking de concorrentes atualizam com base nos filtros
5. CEO clica Exportar CSV e faz download da tabela filtrada

---

## 4. Regras de Negocio

### RN-01 -- Progressao de categorias por stage

| Stage | Modo do orcamento |
|-------|-------------------|
| lead | Apenas estimated_value (campo simples) |
| qualificado | Apenas estimated_value (campo simples) |
| proposta | Editor de 16 categorias habilitado |
| negociacao | Editor de 16 categorias habilitado |
| fechamento | Editor de 16 categorias habilitado |
| ganho | Somente-leitura (orcamento congelado) |
| perdido | Somente-leitura |
| pausado | Somente-leitura |

### RN-02 -- Codigo ORC

- Formato: ORC-YYYY-XXXX onde YYYY = ano de criacao da primeira versao, XXXX = sequencia 4 digitos zero-fill por tenant/ano
- Gerado uma unica vez por oportunidade -- na criacao da primeira versao de orcamento
- Independente de job_code -- sao sequencias separadas
- Imutavel apos geracao
- Implementacao: tabela orc_code_sequences (tenant_id, year, last_index) com INSERT ON CONFLICT (mesmo padrao de job_code_sequences)
- O orc_code e copiado para o campo orc_code da tabela opportunities para consulta rapida sem join

### RN-03 -- Versionamento de orcamento

- Versoes sao imutaveis apos ativacao -- para editar, cria-se uma nova versao
- Nova versao copia todos os itens da versao ativa para uma nova em rascunho
- Apenas uma versao por oportunidade pode estar ativa -- a EF garante via transacao
- Versao rascunho pode ser editada e depois ativada ou descartada
- Versao historico e somente-leitura e nunca pode ser reativada

### RN-04 -- Feedback de perda obrigatorio

- O endpoint PATCH /crm/opportunities/:id ja valida que loss_category OU loss_reason sao obrigatorios ao marcar stage = perdido
- A Onda 2.4 torna ambos obrigatorios (AND, nao OR)
- A mudanca e backwards-compatible pois nenhuma oportunidade existente e remarcada automaticamente pelo sistema
- winner_competitor e winner_value permanecem opcionais
- O enum loss_category (preco, diretor, prazo, escopo, relacionamento, outro) e expandido para incluir concorrencia

### RN-05 -- Transferencia de orcamento para job

- Apenas a versao ativa pode ser transferida na conversao
- Categorias com valor igual a 0 ou nulo NAO geram cost_items
- Os cost_items criados sao do tipo is_category_header = true (sub_item_number = 0)
- O campo import_source nos cost_items permite identificar e excluir em massa se necessario
- A transferencia e opcional -- PE pode desmarcar o checkbox
- Falha na criacao dos cost_items NAO reverte a criacao do job

---
## 5. Wireframes Textuais

### Tela 5.1 -- Secao de orcamento na pagina de detalhe

Stage proposta ou superior -- renderizada como secao expansivel na coluna central de OpportunityFullDetail:

    +--------------------------------------------------+
    | ORCAMENTO   ORC-2026-0042   v2 (ativa)           |
    |--------------------------------------------------|
    | [Nova Versao]   [Exportar PDF]                   |
    |                                                  |
    | Categoria           Valor (R$)       Notas       |
    |  1. Producao      [  45.000  ]  [...........]   |
    |  2. Equipe Tecn.  [  18.000  ]  [...........]   |
    |  3. Elenco        [   5.500  ]  [...........]   |
    |  4. Locacoes      [   8.000  ]  [...........]   |
    |  ...                                             |
    | 99. BDI/Outros    [   2.000  ]  [...........]   |
    |--------------------------------------------------|
    | TOTAL                     R$ 82.700              |
    |                                                  |
    | [Salvar Orcamento]                               |
    |                                                  |
    | Historico de versoes:                            |
    | v1 - 05/03/2026 - R$ 78.000 - historico         |
    | v2 - 09/03/2026 - R$ 82.700 - ativa             |
    +--------------------------------------------------+

### Tela 5.2 -- LossFeedbackDialog

Exibido ao tentar mover oportunidade para stage perdido:

    +--------------------------------------------------+
    | Registrar perda                             [X]  |
    |--------------------------------------------------|
    | Por que perdemos esta oportunidade?              |
    |                                                  |
    | Motivo principal *                               |
    | [Select: Preco / Prazo / Concorrencia /         |
    |          Relacionamento / Escopo / Outro ]       |
    |                                                  |
    | Descricao detalhada *                            |
    | [textarea -- max 1.000 chars                  ]  |
    |                                                  |
    | Concorrente vencedor (opcional)                  |
    | [input                                        ]  |
    |                                                  |
    | Valor cobrado pelo concorrente (opcional)        |
    | [R$ ___________]                                 |
    |                                                  |
    | [Cancelar]           [Confirmar Perda]           |
    +--------------------------------------------------+

### Tela 5.3 -- ConvertToJobDialog (versao expandida)

Nova secao adicionada ao dialog existente:

    +--------------------------------------------------+
    | Converter em Job                            [X]  |
    |--------------------------------------------------|
    | Dados do Job (editaveis)                         |
    | Titulo *   [Campanha Silimed Verao 2026       ]  |
    | Valor      [R$ 82.700                         ]  |
    | Tipo       [Filme Publicitario             v  ]  |
    |                                                  |
    | Dados copiados (readonly)                        |
    | Cliente: Silimed | Agencia: NBS                  |
    |                                                  |
    |--------------------------------------------------|
    | Orcamento a transferir                           |
    | Versao v2 -- R$ 82.700 (6 categorias)           |
    | [x] Criar cost_items a partir deste orcamento   |
    |     Producao          R$ 45.000                 |
    |     Equipe Tecnica    R$ 18.000                 |
    |     Elenco            R$  5.500                 |
    |     + 3 outras categorias                       |
    |                                                  |
    |     A oportunidade sera marcada como ganho       |
    |          [Cancelar]    [Criar Job]               |
    +--------------------------------------------------+

### Tela 5.4 -- Dashboard de perdas (/crm/perdas)

    +----------------------------------------------------------+
    | Analise de Perdas    [90 dias]  [Todas categorias]       |
    |----------------------------------------------------------|
    | R$ 312.000 | 14 perdidas | 31% taxa perda | Produtora X  |
    |----------------------------------------------------------|
    | Grafico barras: Preco 6  Prazo 4  Concorrencia 2  ...   |
    |----------------------------------------------------------|
    | Clientes recorrentes: ATENCAO                            |
    | Silimed -- perdeu 3x no periodo (R$ 145.000 em risco)   |
    |----------------------------------------------------------|
    | TITULO              CLIENTE  DATA   VALOR  MOTIVO  PE   |
    | Camp.Verao Silimed  Silimed  05/03  82700  Preco   A    |
    | Projeto TV Globo    Globo    02/03  45000  Prazo   B    |
    |                                                          |
    | [Exportar CSV]                                           |
    +----------------------------------------------------------+

---
## 6. Dependencias Tecnicas

### 6.1 Tabelas novas (3)

**opportunity_budget_versions** -- versoes de orcamento por oportunidade:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID NOT NULL FK tenants | |
| opportunity_id | UUID NOT NULL FK opportunities ON DELETE CASCADE | |
| orc_code | TEXT | ORC-YYYY-XXXX, gerado na v1 e copiado para versoes seguintes |
| version | SMALLINT NOT NULL DEFAULT 1 | sequencial por opportunity |
| status | TEXT CHECK (rascunho, ativa, historico) | apenas uma ativa por oportunidade |
| total_value | NUMERIC(12,2) | calculado na EF ao salvar (soma dos itens) |
| notes | TEXT | observacoes livres sobre a versao |
| created_by | UUID FK profiles | |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | soft delete |

UNIQUE constraint: (opportunity_id, version, tenant_id)

**opportunity_budget_items** -- itens por versao:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID NOT NULL FK tenants | |
| version_id | UUID NOT NULL FK opportunity_budget_versions ON DELETE CASCADE | |
| item_number | SMALLINT NOT NULL CHECK (1 a 99) | espelha cost_categories.item_number |
| display_name | TEXT NOT NULL | snapshot do nome da categoria |
| value | NUMERIC(12,2) NOT NULL DEFAULT 0 | valor total da categoria |
| notes | TEXT | observacoes sobre esta linha |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |

**orc_code_sequences** -- contador atomico por tenant/ano:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID NOT NULL FK tenants | |
| year | SMALLINT NOT NULL | ano de referencia |
| last_index | INTEGER NOT NULL DEFAULT 0 | ultimo indice gerado |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |

UNIQUE constraint: (tenant_id, year)

### 6.2 Alteracoes em tabelas existentes

**opportunities** -- dois passos antes de escrever a migration:

Passo 1 (investigacao): Verificar via Supabase Dashboard se os seguintes campos existem na tabela em producao. Presentes no TypeScript e na EF mas sem migration documentada:
loss_category, winner_competitor, winner_value, is_competitive_bid, response_deadline, deliverable_format, campaign_period, competitor_count, win_reason, client_budget

Se ausentes, adicionar via migration idempotente (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).

Passo 2 (novo campo): Adicionar orc_code TEXT -- codigo ORC copiado da versao do orcamento para consulta rapida sem join.

**cost_items**: Verificar se o valor orcado ja existe no CHECK de item_status. Se nao existir, adicionar via migration.

### 6.3 Edge Functions -- alteracoes e novas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| crm/handlers/convert-to-job.ts | EDITAR | Aceitar campo transferir_orcamento boolean no body; criar job_budget e cost_items quando true |
| crm/handlers/update-opportunity.ts | EDITAR | Tornar loss_category E loss_reason ambos obrigatorios ao marcar perdido; expandir enum com concorrencia |
| crm/handlers/budget/upsert-version.ts | NOVO | POST e PATCH para criar ou editar versao de orcamento com seus itens |
| crm/handlers/budget/activate-version.ts | NOVO | POST para ativar versao via transacao |
| crm/handlers/budget/list-versions.ts | NOVO | GET para listar versoes de uma oportunidade com itens |
| crm/handlers/get-loss-analytics.ts | NOVO | GET com filtros; retorna KPIs, distribuicao e lista para o dashboard |

Rotas a adicionar no router da EF crm:
- GET /crm/opportunities/:id/budget/versions
- POST /crm/opportunities/:id/budget/versions
- PATCH /crm/opportunities/:id/budget/versions/:versionId
- POST /crm/opportunities/:id/budget/versions/:versionId/activate
- GET /crm/loss-analytics

### 6.4 Frontend -- arquivos novos e editados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| components/crm/OpportunityBudgetSection.tsx | NOVO | Editor de categorias GG; renderiza lista de itens, calcula total, botoes salvar/nova versao/exportar |
| components/crm/BudgetVersionHistory.tsx | NOVO | Lista compacta de versoes anteriores com status badge |
| components/crm/LossFeedbackDialog.tsx | NOVO | Dialog obrigatorio ao marcar perdido; 4 campos com validacao |
| components/crm/ConvertToJobDialog.tsx | EDITAR | Adicionar secao Orcamento a transferir com checkbox e preview das categorias |
| components/crm/OpportunityFullDetail.tsx | EDITAR | Integrar OpportunityBudgetSection na coluna central (visivel so em stages proposta+) |
| components/crm/CrmKanban.tsx | EDITAR | Interceptar drag para coluna perdido: abrir LossFeedbackDialog antes de confirmar mudanca |
| app/(dashboard)/crm/perdas/page.tsx | NOVO | Pagina de analytics de perdas com guard RBAC |
| components/crm/LossAnalyticsDashboard.tsx | NOVO | KPIs, grafico barras, tabela com filtros, exportacao CSV |
| hooks/useCrmBudget.ts | NOVO | Hooks para versoes de orcamento |
| lib/pdf/opportunity-budget-pdf.ts | NOVO | Gerador PDF client-side adaptado para oportunidade (reutiliza pdf-core.ts) |

### 6.5 Hooks novos (useCrmBudget.ts)

Tipagens a definir: OpportunityBudgetVersion, OpportunityBudgetItem, LossAnalyticsFilters, LossAnalyticsResult

Hooks:
- useOpportunityBudgetVersions(opportunityId) -- GET lista de versoes com itens
- useUpsertBudgetVersion(opportunityId) -- POST/PATCH criar ou editar versao de rascunho
- useActivateBudgetVersion(opportunityId) -- POST ativar versao
- useLossAnalytics(filters) -- GET dados agregados para o dashboard

---
## 7. Fora de Escopo

Esta onda NAO entrega:

1. **Sub-itens de custo na oportunidade** -- apenas cabecalhos de categoria (sub_item_number = 0). O detalhamento acontece no modulo financeiro do job apos a conversao.
2. **Envio de orcamento por email ou WhatsApp** diretamente do ELLAHOS -- o PDF e para download manual.
3. **Aprovacao digital do orcamento via DocuSeal** -- fluxo de assinatura digital e da Onda 3 (Portal do Cliente).
4. **Orcamento em multiplas moedas** -- apenas BRL nesta onda.
5. **Importacao dos orcamentos existentes do Drive** (ORC-2025-0001 a ORC-2026-0004) -- migracao de dados e atividade operacional separada.
6. **Comparacao lado-a-lado de versoes** -- o historico lista versoes, mas nao exibe diff visual entre elas.
7. **Markup automatico ou calculo de margem** na oportunidade -- apenas valor bruto por categoria.
8. **Templates de orcamento reutilizaveis** entre oportunidades -- gerenciamento de templates e onda futura.
9. **Notificacoes** ao cliente quando orcamento e atualizado.
10. **Integracao com planilhas GG existentes** -- os orcamentos das planilhas precisam ser inseridos manualmente no editor.

---

## 8. Metricas de Sucesso

### 8.1 Metricas de adocao (medir 30 dias apos deploy)

| Metrica | Meta | Como medir |
|---------|------|-----------|
| Percentual de oportunidades em proposta ou superior com orcamento detalhado | >= 70% | COUNT(opportunity_budget_versions) / COUNT(oportunidades em proposta+) |
| Percentual de perdas com feedback completo (categoria + texto) | >= 90% | COUNT(perdidas com loss_category AND loss_reason preenchidos) / total perdidas |
| Percentual de conversoes que transferem orcamento para cost_items | >= 80% | COUNT(cost_items com import_source = crm_opportunity_%) / total conversoes |

### 8.2 Metricas de negocio (medir 90 dias apos deploy)

| Metrica | Meta | Hipotese |
|---------|------|---------|
| Diferenca media entre estimated_value e closed_value | menor que 15% | Orcamento por categoria aumenta precisao da estimativa |
| Tempo de retrabalho financeiro ao criar job | reducao de 60% | cost_items automaticos eliminam redigitacao |
| CEO usa dashboard de perdas pelo menos 1x por semana | Sim | Decisoes de pricing baseadas em dados reais |

### 8.3 Qualidade tecnica

- Zero regressoes no fluxo de conversao existente (testar com oportunidades sem orcamento)
- Zero race conditions em ORC codes (testar insercoes paralelas)
- Build TypeScript sem erros

---

## 9. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Campos de loss_category etc. existem no frontend e EF mas nao no banco | Alta | Alto | Verificar via Supabase Dashboard antes de escrever qualquer migration. Adicionar campos ausentes via ADD COLUMN IF NOT EXISTS |
| PE nao adota o editor de categorias (continua com valor unico) | Media | Medio | Nao bloquear em proposta -- apenas exibir mensagem encorajadora. Feature nao e obrigatoria |
| Drag no Kanban para perdido interceptando LossFeedbackDialog causa UX confusa no mobile | Media | Baixo | Testar touch events; manter botao Marcar Perdida na pagina de detalhe como caminho alternativo garantido |
| Transferencia de cost_items cria duplicatas com itens inseridos manualmente depois | Media | Baixo | Banner informativo + campo import_source permite identificar e excluir duplicatas facilmente |
| Performance do dashboard de perdas com grande volume de oportunidades | Baixa | Medio | Filtrar server-side na EF; indice em (tenant_id, stage, actual_close_date) deve cobrir as queries |
| LossFeedbackDialog com campos obrigatorios irrita usuarios que querem mover rapidamente | Baixa | Baixo | Campos minimos: 1 select + 1 textarea curta (menos de 30 segundos de preenchimento) |
| Race condition no codigo ORC em insercoes simultaneas | Baixa | Alto | INSERT ON CONFLICT com UPDATE atomico -- mesmo padrao comprovado do job_code_sequences |

---

## 10. Perguntas Abertas

As perguntas abaixo precisam de resposta antes do inicio da implementacao:

| ID | Pergunta | Impacto se nao respondida |
|----|----------|--------------------------|
| PA-01 | Os campos loss_category, winner_competitor, winner_value, is_competitive_bid, response_deadline, deliverable_format, campaign_period, client_budget, win_reason, competitor_count existem de fato na tabela opportunities no banco de producao, ou existem apenas no frontend e na EF? | Determina o que a migration da Onda 2.4 precisa adicionar |
| PA-02 | O editor de categorias deve mostrar apenas as 16 categorias do tenant (cost_categories) ou permitir que o PE adicione linhas livres dentro da oportunidade? | Impacta o schema de opportunity_budget_items e a complexidade do frontend |
| PA-03 | O codigo ORC deve aparecer no card do Kanban ou apenas na pagina de detalhe da oportunidade? | Impacta OpportunityCard.tsx |
| PA-04 | A sequencia ORC deve reiniciar por ano (ORC-2026-0001 em janeiro de cada ano) ou ser continua por tenant (ORC-0001, ORC-0002...)? | Impacta o schema de orc_code_sequences |
| PA-05 | A tela de analise de perdas deve ser uma pagina nova no menu lateral (/crm/perdas) ou uma tab dentro do dashboard CRM existente (/crm/dashboard)? | Impacta roteamento, sidebar e RBAC guard |

---

## 11. Proposta de Sprints

| Sprint | Escopo | Entregavel |
|--------|--------|-----------|
| Sprint 1 | Investigar campos ausentes no banco + migration (3 tabelas novas + campos faltantes em opportunities + valor orcado em cost_items) + EF: 3 novos handlers (upsert-version, activate-version, list-versions) | Schema estavel, EF deployada |
| Sprint 2 | Frontend: OpportunityBudgetSection + BudgetVersionHistory + LossFeedbackDialog + integracao em OpportunityFullDetail e CrmKanban | Orcamento editavel na oportunidade + feedback de perda obrigatorio funcionando |
| Sprint 3 | EF: get-loss-analytics + edicao em convert-to-job para transferencia de cost_items | Conversao enriquecida funcionando end-to-end |
| Sprint 4 | Frontend: dashboard /crm/perdas + export PDF de orcamento + QA end-to-end + deploy | Feature completa em producao |
