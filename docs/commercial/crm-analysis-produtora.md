# Analise do CRM de Vendas — Olhar da Produtora

> Documento escrito como se eu fosse a Marcia, PE com 52 anos, 25 anos de mercado,
> que gerencia o comercial de uma produtora media em SP. Tudo que segue e o que
> ela pensaria ao abrir esse sistema pela primeira vez.

**Data:** 2026-03-03
**Versao:** 1.0
**Autor:** Consultor de Produto ELLAHOS
**Foco:** Modulo CRM/Pipeline Comercial — avaliacao, gaps e roadmap

---

## Indice

1. [Avaliacao geral — os 7 testes](#1-avaliacao-geral)
2. [Tela por tela — o que a Marcia ve](#2-tela-por-tela)
3. [O que falta pra funcionar no dia-a-dia](#3-o-que-falta)
4. [Features especificas para produtoras](#4-features-especificas)
5. [Roadmap priorizado](#5-roadmap)
6. [Mockups de telas sugeridas](#6-mockups)

---

## 1. Avaliacao geral

### Nota geral: 5/10

O modulo CRM tem uma **base tecnica solida** — o schema do banco esta bem estruturado, o backend cobre os endpoints essenciais, o frontend tem Kanban bonito. Mas ele foi construido com cabeca de dev, nao de PE. E uma ferramenta generica de pipeline que poderia ser de qualquer empresa de qualquer setor. Nao tem NADA que grite "isso aqui e pra produtora de filme".

### Teste 1: 5 segundos

**Resultado: REPROVADO**

A Marcia abre a pagina e ve: "Pipeline Comercial" com subtitle "Gerencie oportunidades e acompanhe o funil de vendas". Primeira reacao:

> "Pipeline? Funil de vendas? Eu nao sou startup. Eu sou produtora. Cade minhas concorrencias? Cade meus orcamentos pendentes?"

O Kanban com 5 colunas (Lead, Qualificado, Proposta, Negociacao, Fechamento) parece um Trello generico. A terminologia e de CRM de SaaS, nao de produtora audiovisual.

**Problemas:**
- "Lead" nao e um termo que PE usa. O certo seria "Briefing Recebido" ou "Consulta".
- "Qualificado" nao significa nada pra ela. Seria "Em Analise" ou "Vamos Orcamentar".
- "Proposta" OK, isso ela entende — mas deveria ser "Orcamento Enviado".
- "Negociacao" OK.
- "Fechamento" deveria ser "Aprovacao do Cliente" (porque quem aprova nao e a agencia, e o cliente final).
- Os botoes no header sao pequenos demais (size="sm" com icones de 3.5px). Mulher de 52 anos com oculos de leitura nao vai achar isso facil.

### Teste 2: Mae

**Resultado: PARCIALMENTE APROVADO**

O formulario de criacao (OpportunityDialog) tem labels claros, campos com placeholder de exemplo ("Ex: Campanha Produto X - Cliente Y"), e validacao basica. Mas:

> "Por que eu tenho que preencher 'Probabilidade'? Probabilidade de que? Eu sei la quanto porcento de chance eu tenho de fechar esse job. Isso quem sabe e o Neymar."

- O campo "Probabilidade (%)" e abstrato demais. PE nao pensa em porcentagem.
- "Stage" aparece como dropdown no formulario — PE nao sabe o que e stage. Deveria ser "Etapa" ou "Status".
- "Origem" tem opcoes como "cold_outreach" — jargao de growth hacker, nao de produtora.
- NAO tem campo pra agencia e cliente no formulario visivel. Esses campos existem no schema mas nao aparecem no formulario OpportunityDialog.tsx. **Isso e um BUG critico** — a PE precisa dizer qual agencia mandou o briefing.

### Teste 3: WhatsApp

**Resultado: REPROVADO**

Para registrar que recebeu um briefing novo, a Marcia precisa:
1. Abrir o sistema (ja perdeu 1 minuto se tava no celular no set)
2. Achar o CRM na sidebar ("Pipeline" — ela ia procurar "Comercial" ou "Vendas")
3. Clicar "Nova Oportunidade"
4. Preencher titulo, stage, valor estimado, probabilidade, origem, tipo de producao, notas
5. Clicar "Criar Oportunidade"

Sao no minimo **7 campos** para algo que ela faria no WhatsApp assim: "Pessoal, chegou briefing da AlmapBBDO pra Havaianas, filme 30s, estimativa 400k".

**O que deveria ter:**
- Cadastro rapido com 2-3 campos (titulo + agencia + tipo). O resto preenche depois.
- Integracao WhatsApp: copiar mensagem do briefing e o sistema extrair os dados.
- Bot que pergunta: "Recebi uma mensagem no grupo. Quer criar uma oportunidade?"

### Teste 4: Planilha

**Resultado: REPROVADO**

Na planilha da Marcia, ela tem:

| Data | Agencia | Cliente | Descricao | Valor | Status | PE responsavel | Data retorno | Observacoes |
|------|---------|---------|-----------|-------|--------|----------------|--------------|-------------|

O CRM do ELLAHOS nao mostra:
- **Data que chegou o briefing** — nao tem visivel no card do Kanban
- **Quem e o PE responsavel** — tem assigned_profile mas aparece discretissimo (avatar de 20x20px com uma letra)
- **Quando tem que dar retorno** — expected_close_date existe mas nao e "data de retorno/deadline"
- **Se e concorrencia ou job direto** — nao tem campo pra isso
- **Quantas produtoras estao concorrendo** — nao tem

Alem disso, a planilha permite ver TUDO de uma vez em formato tabela. O Kanban mostra cards pequenos que precisam de scroll horizontal. **Se ela tem 15 oportunidades abertas, vai ter que ficar scrollando pra direita pra ver todas as colunas.** Isso e pior que planilha.

> "No meu Google Sheets eu vejo 30 linhas de uma vez. Aqui eu preciso scrollar pra todo lado pra ver 10."

### Teste 5: "E dai?"

**Resultado: PARCIALMENTE APROVADO**

O que tem de bom:
- **Stats do pipeline** (valor total, ponderado, taxa de conversao) — isso e util pro CEO
- **Converter em job** — quando fecha, vira job automaticamente. Isso sim economiza tempo
- **Historico de atividades** — ter log de tudo que aconteceu e util

O que falta:
- **Follow-up automatico** — o sistema deveria avisar "Voce mandou orcamento pra AlmapBBDO ha 5 dias e nao teve retorno. Quer mandar follow-up?"
- **Alertas de deadline** — "3 orcamentos vencem essa semana"
- **Dashboard do CEO** — o CEO nao vai abrir um Kanban. Ele quer abrir o sistema e ver: "R$ 2.3M em pipeline, 8 propostas pendentes, 3 jobs pra fechar esse mes"

### Teste 6: Acessibilidade

**Resultado: PROBLEMAS SIGNIFICATIVOS**

- Cards do Kanban (OpportunityCard) usam fonte de **11px** pra informacoes importantes (cliente, data, assignee). Inaceitavel pra usuario de 50+ anos.
- O badge de probabilidade usa fonte de **11px**
- O botao "+" em cada coluna do Kanban tem **24x24px** (h-6 w-6). Abaixo do minimo de 44x44px pra touch.
- O header "Stats bar" usa **11px** pra subtextos
- Na timeline de atividades, fonte de **11px** pra nome e data
- Cores: o Kanban usa border-l-4 com cores diferentes, o que ajuda. Mas os cards sao muito "finos" visualmente — muita informacao pequena comprimida.

### Teste 7: Venda

**Resultado: PARCIALMENTE APROVADO**

- O Kanban e **visualmente bonito** — funciona bem em slide de pitch
- As stats do pipeline sao vendaveis: "Veja quanto voce tem em pipeline"
- Converter oportunidade em job e um "wow factor" real

Mas:
- Falta um dashboard comercial matador (graficos, tendencias, comparativos)
- Falta integracao WhatsApp (esse seria O diferencial competitivo)
- Falta historico de relacionamento com agencia (killer feature pra produtora)

---

## 2. Tela por tela

### 2.1. Pagina principal do CRM (`/crm`)

**Arquivo:** `frontend/src/app/(dashboard)/crm/page.tsx`

**O que a Marcia ve:**
```
[Target icon] Pipeline Comercial
Gerencie oportunidades e acompanhe o funil de vendas

[Atualizar] [Metricas] [+ Nova Oportunidade]

[Pipeline: R$xxx] [Ponderado: R$xxx] [Conversao: xx%] [Ticket Medio: R$xxx] [Ativas: x] [Ganhas: x]

[Pipeline ativo] [Incluir ganhos/perdidos]    Badge: "x oportunidades"

[ Lead | Qualificado | Proposta | Negociacao | Fechamento ]   <-- Kanban horizontal
```

**Problemas especificos:**

1. **Titulo "Pipeline Comercial"** — trocar por "Comercial" ou "Vendas". PE nao fala "pipeline".

2. **Subtitulo "Gerencie oportunidades..."** — trocar por algo como "Propostas e negociacoes em andamento". "Oportunidades" e jargao de CRM.

3. **Stats bar com 6 cards** — informacao demais pra tela principal. A PE quer ver 3 numeros no maximo:
   - Quanto tem de orcamento pendente (R$ total)
   - Quantas propostas precisam de retorno essa semana
   - Taxa de fechamento (se ela souber o que e)

4. **O stats bar mostra "Ponderado: R$ xx por probabilidade"** — ninguem numa produtora sabe o que e valor ponderado por probabilidade. Remover ou esconder em "ver mais".

5. **Filtro "Pipeline ativo / Incluir ganhos/perdidos"** — OK, faz sentido. Mas deveria ter mais filtros: por PE responsavel, por agencia, por mes.

6. **Kanban horizontal** — as colunas tem largura fixa de 288px (w-72). Em tela de 1366px (notebook corporativo comum), cabem 4 colunas. Mas sao 5 ativas. Ou seja: sempre tem scroll horizontal. Isso e **ruim**.

### 2.2. Card da oportunidade (OpportunityCard)

**Arquivo:** `frontend/src/components/crm/OpportunityCard.tsx`

**O que cada card mostra:**
```
+----------------------------+
| Campanha Produto X         >|
| [Building] AlmapBBDO        |
| R$ 400K                     |
| [Calendar] 15 mar  atrasado |
|           [badge: 70%]      |
| [M] Marcia Silva             |
+----------------------------+
```

**Problemas:**

1. **Titulo truncado em 2 linhas (line-clamp-2)** — titulos de job de produtora sao longos. "Filme Comercial 30s Brahma Duplo Malte — Digital + TV — via AlmapBBDO". Vai cortar. Precisa permitir 3 linhas ou tooltip no hover.

2. **Mostra cliente OU agencia, nao os dois** — no codigo: `const entityName = clientName ?? agencyName`. Deveria mostrar AMBOS. Na produtora, a agencia que mandou o briefing e o cliente final sao informacoes diferentes e igualmente importantes.

3. **Badge de probabilidade** — ja falei, PE nao usa. Trocar por um indicador mais intuitivo: "quente/morno/frio" com cores (vermelho/amarelo/verde).

4. **"atrasado"** — aparece quando expected_close_date passou. Bom! Mas a palavra "atrasado" e generica. Deveria ser "retorno pendente" ou "venceu em 15/mar".

5. **Avatar do responsavel** — circulo de 20x20px com uma letra. Muito pequeno. E se a tela e do CEO, ele quer ver QUEM e o responsavel sem ter que adivinhar pela inicial.

### 2.3. Dialog de criacao (OpportunityDialog)

**Arquivo:** `frontend/src/components/crm/OpportunityDialog.tsx`

**Campos do formulario:**
- Titulo * (texto livre)
- Stage (dropdown: Lead, Qualificado, etc.)
- Probabilidade (%) (numero)
- Valor Estimado R$ (numero)
- Fechamento Previsto (date picker)
- Origem (dropdown: Indicacao, Site, Redes sociais, Evento, Cold outreach, Cliente recorrente, Outro)
- Tipo de Producao (texto livre: Ex: Comercial, Filme, Serie)
- Motivo da Perda (condicional, so aparece quando stage = perdido)
- Notas (textarea)

**Problemas CRITICOS:**

1. **NAO TEM CAMPO PRA AGENCIA** — a PE precisa dizer qual agencia mandou o briefing. O backend suporta (client_id, agency_id, contact_id), mas o formulario nao expoe esses campos. Isso e um **bug funcional grave**. Sem isso, o CRM e inutil.

2. **NAO TEM CAMPO PRA CLIENTE FINAL** — mesma coisa. O cara que paga a conta precisa estar la.

3. **NAO TEM CAMPO PRA CONTATO** — quem da agencia mandou? O campo contact_id existe no backend mas nao aparece no frontend.

4. **NAO TEM CAMPO PRA DIRETOR** — em concorrencia, a produtora propoe 2-3 diretores. Isso e informacao comercial critica.

5. **"Cold outreach"** nos source options — PE de 52 anos vai ler isso e fechar o sistema. Trocar por "Prospecao ativa" ou "Contato direto".

6. **Tipo de producao e texto livre** — deveria ser dropdown com as opcoes do mercado: Filme Publicitario, Branded Content, Foto, Still, Evento, Live, Videoclipe, Conteudo Digital, Institucional.

7. **Nao tem campo de deadline/prazo de resposta** — "A agencia precisa da resposta ate quando?" Isso e a informacao mais importante do comercial.

### 2.4. Dialog de detalhe (OpportunityDetailDialog)

**Arquivo:** `frontend/src/components/crm/OpportunityDetailDialog.tsx`

**O que mostra:**
```
Campanha Produto X                    [Editar]
[Badge: Proposta] 70% probabilidade  via indicacao

[Valor: R$400K] [Fechamento: 15/03] [Cliente: XX]
[Agencia: YY]   [Tipo: Comercial]   [Resp: Marcia]

[Job vinculado: Job 036]  (quando convertido)

"Notas do briefing aqui..."

[Mover para Negociacao]  [Converter em Job]
[Motivo da perda...] [Perdido]

--- Propostas ---
[+ Adicionar]
v2 - Proposta revisada  R$ 380K  [Enviada]  [link]
v1 - Proposta inicial   R$ 400K  [Rejeitada]

--- Atividades ---
[Anotacao v] [Registrar atividade...] [+]
📝 Stage alterado: Lead → Proposta        Marcia · 12 mar 14:30
📞 Ligou pra Fernanda da agencia          Marcia · 10 mar 09:15
```

**O que esta BOM:**
- A secao de propostas com versionamento e muito boa. Isso reflete a realidade (orcamento v1, v2, v3).
- O historico de atividades com timeline e util.
- O botao "Converter em Job" e um fluxo natural.
- Mostrar o job vinculado com link direto e excelente.

**Problemas:**

1. **Tudo dentro de um Dialog (modal)** — isso limita o espaco. O detalhe de uma oportunidade deveria ser uma **pagina inteira**, nao um modal. A PE quer ver propostas, historico, dados do cliente, tudo de uma vez sem scroll infinito dentro de uma caixinha.

2. **Marcar como perdido esta junto com acoes positivas** — o campo "Motivo da perda" fica visivel ao lado de "Mover para Negociacao". Isso e confuso. Deveria estar escondido em um menu "Mais acoes" ou em uma area separada "Encerrar oportunidade".

3. **Historico de atividades limitado a 48px de altura** (max-h-48) — isso da umas 3-4 linhas. Se tem 20 atividades, precisa scrollar dentro do scroll do modal. Pessimo.

4. **Nao mostra dados da agencia/contato** — nome do contato, telefone, email. A PE precisa ligar pra agencia direto daqui. Deveria ter um clique pra abrir WhatsApp com o contato.

5. **Propostas nao tem link pra gerar/editar orcamento** — na vida real, a proposta e um orcamento em PDF gerado pelo sistema. O CRM deveria integrar com o modulo financeiro pra gerar a carta orcamento.

6. **Nao mostra historico de jobs anteriores com essa agencia** — "A AlmapBBDO ja fez 12 jobs com a gente nos ultimos 2 anos, ticket medio de R$ 350K". Isso e OURO pro comercial.

### 2.5. Dialog de metricas (CrmStatsDialog)

**Arquivo:** `frontend/src/components/crm/CrmStatsDialog.tsx`

**Problemas:**

1. **E um modal** — metricas comerciais deveriam ser um dashboard dedicado, nao um popup.

2. **Terminologia** — "Pipeline Total", "Pipeline Ponderado", "Taxa de Conversao" — tudo linguagem de CRM generico.

3. **Falta comparativo temporal** — "Esse mes vs. mes passado", "Esse ano vs. ano passado".

4. **Falta ranking de agencias** — "Top 5 agencias por volume" seria a informacao mais pedida pelo CEO.

5. **Falta projecao** — "Se fechar tudo que esta em negociacao, o faturamento do trimestre sera R$ X".

---

## 3. O que falta pra funcionar no dia-a-dia

### 3.1. Campos essenciais que nao existem

| Campo | Por que e critico | Onde colocar |
|-------|-------------------|--------------|
| **Agencia** (no formulario) | Quem mandou o briefing. Sem isso nao existe comercial. | OpportunityDialog — dropdown com busca |
| **Cliente final** (no formulario) | Quem paga. Sempre vinculado a agencia. | OpportunityDialog — dropdown com busca |
| **Contato da agencia** | Nome + telefone + email de quem mandou o briefing. Pra ligar de volta. | OpportunityDialog — dropdown por agencia |
| **Deadline de resposta** | "A agencia precisa do orcamento ate dia X". NAO e "expected_close_date". | Novo campo: response_deadline (DATE) |
| **E concorrencia?** | Sim/Nao. Muda completamente a estrategia. | Boolean: is_competitive_bid |
| **Quantas produtoras na concorrencia** | "Somos 3 ou 8?" Muda a probabilidade real. | Int: competitor_count |
| **Diretores propostos** | Em concorrencia, quais diretores a produtora vai propor. | Relacao N:N com people (directores) |
| **Formato/duracao** | "30s + 15s + bumper" — essencial pro orcamento. | Text: deliverable_format |
| **Periodo de veiculacao** | "Campanha janeiro a marco" — informa urgencia. | Text: campaign_period |
| **Budget do cliente** | "A agencia disse que o teto e R$ 300K" (vs. nosso orcamento de R$ 400K). | Numeric: client_budget |

### 3.2. Automacoes que fariam a PE largar a planilha

1. **Follow-up automatico**
   - Sistema detecta: "Orcamento enviado ha 3 dias sem resposta"
   - Envia notificacao no sistema + WhatsApp pro PE: "Ligar pra Fernanda da AlmapBBDO sobre orcamento Havaianas"
   - PE clica "Feito" ou "Adiar 2 dias"
   - Se nao fizer nada em +2 dias, alerta o CEO

2. **Deadline approaching**
   - 3 dias antes do deadline de resposta: alerta amarelo
   - Dia do deadline: alerta vermelho
   - Passou do deadline: card fica vermelho no Kanban

3. **Win/loss analysis automatica**
   - Quando marca como "perdido", perguntar: perdeu pra quem? (campo competidor vencedor)
   - Gerar relatorio mensal: "Perdemos 4 de 7 concorrencias. 3 por preco, 1 por diretor."
   - Isso e dado estrategico que NENHUMA produtora tem hoje

4. **Criacao a partir de email/WhatsApp**
   - Recebeu email com briefing? Forward pra crm@ellahos.app e cria oportunidade automatica
   - Recebeu WhatsApp? Bot extrai dados basicos e cria draft de oportunidade pra PE confirmar

5. **Orcamento integrado**
   - Ao criar proposta no CRM, abrir o gerador de carta orcamento (que ja existe na Fase 11)
   - Ao enviar proposta, mover automaticamente pra stage "Orcamento Enviado"
   - Ao receber resposta, mover pra "Negociacao" ou "Perdido"

### 3.3. Integracao com WhatsApp

Esse e O diferencial. Nenhum CRM do mercado faz isso bem pro audiovisual.

**Fluxo ideal:**

```
WhatsApp da PE                         ELLAHOS
-----------------                      -------
"Oi Marcia, temos um briefing          Bot detecta palavras-chave:
 da Ambev, filme 30s, preciso           "briefing", "orcamento",
 orcamento ate sexta"                   "filme", "concorrencia"
                                        ↓
                                       Notificacao no ELLAHOS:
                                       "Nova oportunidade detectada"
                                       [Cliente: Ambev]
                                       [Formato: Filme 30s]
                                       [Deadline: sexta]
                                       [Agencia: remetente]
                                        ↓
                                       PE confirma com 1 clique
                                       → Oportunidade criada
```

**MVP da integracao WhatsApp:**
- NAO precisa de bot automatico na primeira versao
- Basta: no detalhe da oportunidade, ter botao "Abrir WhatsApp com [contato]"
- Link direto: `https://wa.me/5511999999999?text=Oi%20Fernanda...`
- Ja ajuda MUITO. PE nao precisa procurar o contato no celular.

### 3.4. O fluxo correto do briefing ao job

O CRM atual tem stages genericos. O fluxo REAL de uma produtora e:

```
1. CONSULTA RECEBIDA      → Agencia mandou briefing (email/WhatsApp/telefone)
2. EM ANALISE              → PE esta lendo o briefing, verificando disponibilidade
3. ORCAMENTO EM ELABORACAO → PE esta montando o orcamento com equipe
4. ORCAMENTO ENVIADO       → Mandou o PDF pro contato da agencia
5. EM NEGOCIACAO           → Agencia pediu ajustes, ta negociando valor/prazo
6. APROVACAO CLIENTE       → Agencia diz "aprovamos", mas falta assinatura/PO
7. JOB FECHADO             → Contrato assinado, vira Job no sistema
X. PERDIDO                 → Nao fechou (registrar motivo)
X. PAUSADO                 → Agencia disse "parou, volta depois"
```

Compare com o que o sistema tem hoje:
- Lead (generico demais)
- Qualificado (nao existe esse conceito na produtora)
- Proposta (OK)
- Negociacao (OK)
- Fechamento (OK)
- Ganho/Perdido (OK)

**Falta o stage "Pausado"** — muito comum. A agencia fala "parou o briefing, volta mes que vem". Nao e perdido, nao e ganho. E pausado. Hoje o PE nao tem como registrar isso.

---

## 4. Features especificas para produtoras

### 4.1. Historico de relacionamento com agencia

**DOR:** "A Fernanda da Publicis ligou pedindo orcamento. Quantos jobs a gente ja fez com a Publicis? Qual foi o ultimo? Quanto tempo faz?"

**Feature:**
No detalhe da oportunidade (e no detalhe da agencia), mostrar:

```
+--------------------------------------------------+
| HISTORICO — Publicis Comunicacao                  |
|                                                    |
| 12 jobs nos ultimos 3 anos                        |
| Ticket medio: R$ 285.000                          |
| Ultimo job: Campanha Natura Verao (nov/2025)      |
| Taxa de fechamento com essa agencia: 62%          |
|                                                    |
| Ultimos 5 jobs:                                    |
| ● Natura Verao — R$ 320K — Concluido (nov/2025)  |
| ● Brahma Copa — R$ 450K — Concluido (jul/2025)    |
| ● Ambev Kids — R$ 180K — Concluido (mar/2025)     |
| ● Natura Inverno — R$ 290K — Concluido (mai/2024) |
| ● Brahma Natal — R$ 520K — Concluido (dez/2024)  |
+--------------------------------------------------+
```

**Valor:** PE liga pra agencia ja sabendo todo o historico. Impressiona o cliente. Ninguem mais faz isso.

### 4.2. Tracking de concorrencia

**DOR:** "Estamos em 5 concorrencias esse mes. Perdi 3 das ultimas 4. Sera que meu preco ta alto?"

**Feature:** Campos no formulario de oportunidade:

```
--- Concorrencia ---
[x] E concorrencia?
Numero de produtoras: [3 ▼]
Concorrentes conhecidos: [Paranoid, O2 Filmes]  (tags)
Diretores que estamos propondo: [Heitor Dhalia, Kiko Lomba]  (tags)
Budget informado pela agencia: R$ [300.000]

--- Resultado (quando fecha) ---
Concorrente vencedor: [Paranoid]
Motivo da derrota: [Preco - propusemos R$ 380K, Paranoid fez por R$ 290K]
```

**Dashboard de concorrencias:**
```
+-------------------------------------------+
| CONCORRENCIAS — Ultimos 6 meses           |
|                                            |
| Participamos de: 23                        |
| Ganhamos: 14 (61%)                         |
| Perdemos por preco: 5 (56% das derrotas)  |
| Perdemos por diretor: 2 (22%)             |
| Perdemos por prazo: 1 (11%)               |
| Desistimos: 1 (11%)                       |
|                                            |
| Principais concorrentes:                   |
| Paranoid: disputamos 8x, perdemos 3x     |
| O2 Filmes: disputamos 5x, perdemos 2x    |
+-------------------------------------------+
```

**Valor:** Dado estrategico que NENHUMA produtora tem. Permite ajustar pricing e estrategia.

### 4.3. Dashboard do CEO ("Abriu e entendeu")

**DOR:** "O Carlos (CEO) abre o sistema e pergunta: 'Como estao as vendas?' Eu nao tenho como responder em menos de 5 minutos."

**Feature:** Dashboard dedicado (`/crm/dashboard`) que mostra:

```
+------------------------------------------------------------------+
| BOM DIA, CARLOS                          marco 2026               |
|                                                                    |
| [=== R$ 2.3M em negociacao ===]  [=== 14 propostas ativas ===]   |
|                                                                    |
| PRECISAM DE ATENCAO (3)                                           |
| ! Campanha Ambev — deadline amanha — Marcia                       |
| ! Orcamento Nike — sem retorno ha 7 dias — Patricia               |
| ! Concorrencia Natura — resposta hoje — Marcia                     |
|                                                                    |
| ESSE MES                          vs. mes passado                  |
| Orcamentos enviados: 8            (+2)                             |
| Jobs fechados: 3                  (=)                              |
| Faturamento previsto: R$ 850K     (+12%)                           |
| Taxa de fechamento: 43%           (-5%)                            |
|                                                                    |
| TOP AGENCIAS (2026)                                                |
| 1. AlmapBBDO    — 5 jobs — R$ 1.8M                                |
| 2. Publicis     — 3 jobs — R$ 920K                                 |
| 3. DPZ          — 3 jobs — R$ 780K                                 |
|                                                                    |
| POR PE                                                             |
| Marcia: 6 ativas, R$ 1.1M | Patricia: 4 ativas, R$ 800K          |
+------------------------------------------------------------------+
```

**Valor:** CEO abre, entende em 5 segundos, fecha. Vende o sistema sozinho.

### 4.4. Vista de lista (alternativa ao Kanban)

**DOR:** "Eu quero ver tudo em lista como minha planilha. Esse negocio de arrastar cartaozinho nao e pra mim."

**Feature:** Toggle "Kanban | Lista" no topo da pagina.

```
Vista de Lista:
+--------+------------------+-----------+----------+--------+-------+----------+---------+
| Data   | Titulo           | Agencia   | Cliente  | Valor  | Etapa | PE       | Retorno |
+--------+------------------+-----------+----------+--------+-------+----------+---------+
| 01/mar | Campanha Ambev   | AlmapBBDO | Ambev    | R$400K | Orc   | Marcia   | 05/mar  |
| 28/fev | Filme Nike       | Publicis  | Nike     | R$680K | Neg   | Patricia | 03/mar  |
| 27/fev | Digital Natura   | DPZ       | Natura   | R$120K | Lead  | Marcia   |    —    |
+--------+------------------+-----------+----------+--------+-------+----------+---------+
```

Com filtros:
- Por PE responsavel
- Por agencia
- Por etapa
- Por periodo
- Por tipo de producao
- Ordenacao por qualquer coluna

**Valor:** PE que nao gosta de Kanban tem alternativa. CEO que quer exportar pro Excel tem de onde copiar.

### 4.5. Alertas e follow-ups automaticos

**DOR:** "Esqueci de ligar pra agencia ontem. Perdi o job."

**Feature:** Sistema de lembretes integrado:

```
Quando criar oportunidade:
→ Definir "Retorno ate: [data]"
→ Sistema agenda lembrete automatico 2 dias antes
→ Se nao tiver atividade (nota, ligacao, email) nos ultimos 3 dias: alerta amarelo
→ Se passou do retorno sem atividade: alerta vermelho + notificacao CEO

Na sidebar do CRM, badge com numero de items urgentes:
[Pipeline (3!)] ← 3 alertas pendentes

Na pagina principal, secao de alertas no topo:
⚠ 3 oportunidades precisam de atencao
! Campanha Ambev — retorno vence amanha
! Filme Nike — 7 dias sem atividade
! Digital Natura — sem responsavel definido
```

---

## 5. Roadmap priorizado

### AGORA (1-2 dias) — Correcoes criticas no que existe

| # | O que | Esforco | Impacto |
|---|-------|---------|---------|
| 1 | **Adicionar campos Agencia e Cliente no OpportunityDialog** — ja existem no backend, so falta o frontend (combobox com busca) | 2h | CRITICO — sem isso o CRM e inutil |
| 2 | **Renomear stages** — "Lead" → "Consulta", "Qualificado" → "Em Analise", etc. | 1h | ALTO — terminologia correta pro publico |
| 3 | **Adicionar campo de deadline/retorno** — campo response_deadline no backend + input date no formulario | 1.5h | ALTO — e a informacao mais importante |
| 4 | **Renomear "Cold outreach"** → "Prospecao ativa", SOURCE_OPTIONS em portugues | 30min | MEDIO |
| 5 | **Aumentar fontes e areas de clique** — cards com minimo 13px, botoes com minimo 36x36px | 1h | ALTO |
| 6 | **Mostrar agencia E cliente no card** (nao OU) | 30min | MEDIO |
| 7 | **Tipo de producao como dropdown** (nao texto livre) | 30min | MEDIO |

### 1 SEMANA — Features que tornam o CRM realmente util

| # | O que | Esforco | Impacto |
|---|-------|---------|---------|
| 8 | **Vista de lista** alternativa ao Kanban (tabela com sort/filter) | 4h | ALTO — PE acostumada com planilha |
| 9 | **Pagina de detalhe full-page** (substituir o modal por `/crm/[id]`) | 4h | ALTO — mais espaco, melhor UX |
| 10 | **Alertas de follow-up** — badge na sidebar + secao de alertas no topo do CRM | 4h | ALTO — evita perder job |
| 11 | **Campos de concorrencia** — is_competitive, competitor_count no schema + formulario | 2h | ALTO — dado estrategico |
| 12 | **Historico da agencia** — no detalhe da oportunidade, mostrar jobs anteriores da agencia | 3h | ALTO — impressiona o cliente |
| 13 | **Botao "WhatsApp"** no detalhe — link wa.me com contato pre-preenchido | 1h | MEDIO — quick win |
| 14 | **Stage "Pausado"** — novo stage com logica de reativacao | 1h | MEDIO — reflete realidade |
| 15 | **Integracao proposta → carta orcamento** — ao criar proposta, linkar com o budget-letter | 3h | ALTO — conecta CRM com financeiro |

### 1 MES — Features matadoras que vendem o sistema

| # | O que | Esforco | Impacto |
|---|-------|---------|---------|
| 16 | **Dashboard do CEO** — pagina dedicada com KPIs, alertas, top agencias, por PE | 8h | MATADOR — vende o sistema |
| 17 | **Win/loss analysis** — formulario de derrota detalhado + dashboard de analise | 6h | ALTO — dado que ninguem tem |
| 18 | **Integracao WhatsApp** — botao de envio de mensagem template + log da conversa | 8h | MATADOR — diferencial competitivo |
| 19 | **Notificacoes push/email** — follow-up automatico via sistema + email | 6h | ALTO — PE nao esquece mais |
| 20 | **Relatorio mensal automatico** — PDF com performance comercial do mes, enviado por email | 4h | ALTO — CEO adora |
| 21 | **Kanban com drag-and-drop** — arrastar card entre colunas pra mudar stage | 4h | MEDIO — expectativa de mercado |
| 22 | **Criacao por email** — forward de briefing → oportunidade automatica (via n8n) | 6h | ALTO — reduz friccao |
| 23 | **Ranking de diretores** — quais diretores ganham mais concorrencias | 4h | MEDIO — dado estrategico |

---

## 6. Mockups de telas sugeridas

### 6.1. Formulario de criacao corrigido

```
+=============================================+
|  Nova Oportunidade                     [X]  |
+=============================================+
|                                              |
|  Titulo *                                    |
|  [Ex: Campanha Verao 2026 — Ambev       ]   |
|                                              |
|  ---- Quem mandou ----                       |
|                                              |
|  Agencia *              Contato              |
|  [🔍 AlmapBBDO     ▼]  [🔍 Fernanda   ▼]  |
|                                              |
|  Cliente final                               |
|  [🔍 Ambev S.A.    ▼]                       |
|                                              |
|  ---- Sobre o projeto ----                   |
|                                              |
|  Tipo de producao        Formato             |
|  [Filme publicitario ▼]  [30s + 15s digital ]|
|                                              |
|  Valor estimado (R$)     Budget da agencia   |
|  [400.000              ]  [300.000         ]  |
|                                              |
|  ---- Prazo ----                              |
|                                              |
|  Retorno ate *           Previsao fechar     |
|  [📅 05/03/2026      ]  [📅 20/03/2026   ]  |
|                                              |
|  ---- Concorrencia ----                       |
|                                              |
|  [x] E concorrencia                          |
|  Quantas produtoras? [3 ▼]                   |
|                                              |
|  ---- Outros ----                             |
|                                              |
|  Origem                  PE responsavel      |
|  [Indicacao          ▼]  [🔍 Marcia     ▼]  |
|                                              |
|  Notas                                        |
|  [Briefing recebido por email. Ambev quer   ]|
|  [campanha para verao com foco em digital.  ]|
|                                              |
|  [Cancelar]              [Criar Oportunidade] |
+=============================================+
```

**Diferencas do formulario atual:**
- Agencia, Cliente e Contato como combobox com busca
- Tipo de producao como dropdown (nao texto livre)
- Campo "Formato" novo (texto livre, ex: "30s + 15s + bumper")
- Campo "Budget da agencia" separado do "Valor estimado"
- Campo "Retorno ate" (deadline de resposta) obrigatorio
- Checkbox de concorrencia com campo de quantidade
- PE responsavel com busca
- Sem campo de "Probabilidade" (calcular automaticamente)
- Sem campo de "Stage" (sempre comeca como "Consulta Recebida")
- Secoes com separador visual pra organizar

### 6.2. Card do Kanban corrigido

```
+-----------------------------------+
| Campanha Verao Ambev              |
| AlmapBBDO → Ambev                |
| Filme publicitario | 30s          |
|                                    |
| R$ 400K          retorno: 05/mar  |
|                   ⚠ amanha!       |
|                                    |
| 🟢 Quente      Marcia Silva      |
| ⚔ Concorrencia (3 produtoras)    |
+-----------------------------------+
```

**Diferencas:**
- Mostra agencia E cliente (com seta →)
- Mostra tipo + formato
- Mostra deadline de retorno (nao "expected_close_date")
- Alerta visual quando deadline esta proximo
- Indicador quente/morno/frio em vez de "70%"
- Flag de concorrencia visivel

### 6.3. Pagina de detalhe full-page (`/crm/[id]`)

```
+================================================================+
| ← Voltar ao Pipeline                                            |
|                                                                  |
| Campanha Verao 2026 — Ambev                    [Editar] [...]   |
| [Badge: Orcamento Enviado]  [Badge: 🔥 Quente]  [⚔ Concorrencia] |
|                                                                  |
+=============+=====================+==============================+
| INFO        |  PROPOSTAS          |  AGENCIA                     |
+-------------+---------------------+------------------------------+
| Agencia:    |  v2 — Proposta rev. |  AlmapBBDO                   |
| AlmapBBDO   |  R$ 380K [Enviada]  |  12 jobs conosco (3 anos)    |
|             |  📎 PDF             |  Ticket medio: R$ 285K       |
| Cliente:    |  ---                |  Ultimo: Natura Verao (nov25) |
| Ambev S.A.  |  v1 — Proposta ini. |  Taxa fechamento: 62%        |
|             |  R$ 400K [Rejeitada]|                               |
| Contato:    |                      |  Contato: Fernanda Lima      |
| Fernanda L. |  [+ Nova proposta]  |  📱 11 99999-1234            |
| 📱 WhatsApp |                      |  📧 fernanda@almap.com.br   |
|             |                      |  [Abrir WhatsApp]            |
| Tipo:       |                      |                               |
| Filme pub.  |                      +------------------------------+
| 30s + 15s   |                      |  CONCORRENCIA                |
|             |                      |  3 produtoras                |
| Valor:      |                      |  Concorrentes: Paranoid, O2  |
| R$ 380K     |                      |  Diretores: Dhalia, Lomba   |
|             |                      |  Budget agencia: R$ 300K     |
| Retorno:    |                      |                               |
| 05/mar ⚠   |                      +------------------------------+
|             |                      |                               |
| PE:         |                      |  ACOES                       |
| Marcia S.   |                      |  [Mover → Negociacao]        |
|             |                      |  [Converter em Job ✓]        |
| Origem:     |                      |  [Pausar]                    |
| Indicacao   |                      |  [Perdemos ✗]                |
+-------------+---------------------+------------------------------+
|                                                                  |
|  TIMELINE DE ATIVIDADES                            [+ Registrar] |
| ─────────────────────────────────────────────────────────────────|
|  05/mar  📧 Enviou proposta v2 revisada — Marcia                |
|  03/mar  📞 Ligou pra Fernanda, pediram revisao de valor —      |
|              Marcia                                              |
|  01/mar  📧 Enviou proposta v1 — Marcia                         |
|  28/fev  📝 Briefing recebido via email — Marcia                |
| ─────────────────────────────────────────────────────────────────|
+================================================================+
```

### 6.4. Dashboard do CEO (`/crm/dashboard`)

```
+================================================================+
| COMERCIAL — Dashboard                              marco 2026   |
+================================================================+
|                                                                  |
|  +------------------+  +------------------+  +------------------+
|  | PIPELINE ATIVO   |  | ESSE MES         |  | ATENCAO!         |
|  | R$ 2.3M          |  | 3 fechados       |  | 3 items urgentes |
|  | 14 oportunidades |  | R$ 850K          |  | [ver detalhes]   |
|  +------------------+  +------------------+  +------------------+
|                                                                  |
|  +-------------------------------+  +---------------------------+
|  | FUNIL (grafico de barras)      |  | TOP AGENCIAS (2026)       |
|  |                                |  |                           |
|  | Consultas:    ████████ 8       |  | 1. AlmapBBDO  R$ 1.8M   |
|  | Em analise:   █████ 5          |  | 2. Publicis   R$ 920K   |
|  | Orc enviado:  ████ 4           |  | 3. DPZ        R$ 780K   |
|  | Negociacao:   ███ 3            |  | 4. Africa     R$ 540K   |
|  | Aprovacao:    █ 1              |  | 5. WMcCann    R$ 320K   |
|  |                                |  |                           |
|  +-------------------------------+  +---------------------------+
|                                                                  |
|  +-------------------------------+  +---------------------------+
|  | POR PE RESPONSAVEL            |  | CONCORRENCIAS (6 meses)   |
|  |                                |  |                           |
|  | Marcia:   6 ativas  R$ 1.1M   |  | Participamos: 23          |
|  | Patricia: 4 ativas  R$ 800K   |  | Ganhamos: 14 (61%)        |
|  | Carlos:   2 ativas  R$ 400K   |  | Motivo #1 derrota: preco  |
|  |                                |  |                           |
|  +-------------------------------+  +---------------------------+
|                                                                  |
|  ULTIMOS FECHAMENTOS                                             |
|  ✓ Campanha Ambev — R$ 400K — Marcia — 28/fev                   |
|  ✓ Filme Nike — R$ 680K — Patricia — 25/fev                     |
|  ✓ Digital Natura — R$ 120K — Marcia — 20/fev                   |
|  ✗ Branded Unilever — R$ 350K — Marcia — PERDIDO (preco)        |
+================================================================+
```

---

## Resumo executivo

### O que o CRM do ELLAHOS e HOJE:
Um CRM generico com Kanban bonito, mas que poderia ser de qualquer empresa. Nao tem a cara do mercado audiovisual, usa terminologia de startup, e falta campos basicos como Agencia e Cliente no formulario.

### O que precisa ser pra funcionar:
Um sistema de gestao comercial feito PRA PRODUTORA. Com a linguagem certa, os campos certos, e automacoes que resolvem as dores reais: esquecer follow-up, nao ter visao consolidada, nao saber historico com agencia, perder concorrencia sem saber por que.

### O diferencial matador:
Tres coisas que nenhum concorrente tem e que vendem o sistema sozinhas:
1. **Historico de relacionamento com agencia** — "Fizemos 12 jobs com essa agencia, ticket medio R$ 285K"
2. **Tracking de concorrencia** — "Perdemos 4 de 7 por preco. Hora de ajustar."
3. **Dashboard CEO** — abre, ve 3 numeros, fecha. Vendido.

### Investimento necessario:
- **2 dias**: correcoes criticas (agencia/cliente no form, terminologia, deadline)
- **1 semana**: vista de lista, pagina full-page, alertas, historico agencia
- **1 mes**: dashboard CEO, win/loss, WhatsApp, notificacoes

### ROI esperado:
- PE economiza 30-60 min/dia em controle manual
- CEO tem visao comercial sem perguntar pra ninguem
- Produtora para de perder job por esquecimento
- Dado estrategico de concorrencia gera vantagem competitiva
- Sistema se vende na demo quando mostra o dashboard do CEO
