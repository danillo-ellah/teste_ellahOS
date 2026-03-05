# Analise do Cronograma Ellah Filmes - Google Sheets

> Documento gerado em 2026-03-04 a partir da exploracao do Google Drive (drive-catalog.json, drive-summary.md, apps-scripts-report.md, explore-log.txt)

---

## 1. Visao Geral

O **Cronograma** e uma planilha Google Sheets padronizada criada automaticamente pelo Apps Script para cada job da Ellah Filmes. Seu nome segue o padrao:

```
📊 CRONOGRAMA {NUMERO}_{NOME_JOB}
```

Exemplos reais encontrados:
- `📊 CRONOGRAMA 028_COMLURB_PRJ_Agencia3`
- `📊 CRONOGRAMA 031_SP PRA TODA OBRA_Ogilvy`
- `📊 CRONOGRAMA 039_FIM DE ANO | LINHA SIMPATIA_DEBRITO`
- `📊 CRONOGRAMA 040_ Ilha Pura _ UNUM_PURA`

### 1.1 Localizacao no Drive

Cada cronograma fica armazenado em **duas pastas** dentro da estrutura do job:

1. **Pasta principal do cronograma:**
   ```
   {ANO}/{JOB}/{JOB} - 04_CRONOGRAMA/
   ```

2. **Pasta de vendas/produtor executivo (inicio do projeto):**
   ```
   {ANO}/{JOB}/{JOB} - 10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/04_CRONOGRAMA/
   ```

A segunda localizacao e a principal — e onde o Apps Script renomeia e da permissoes. O cronograma da pasta `04_CRONOGRAMA` raiz e geralmente uma copia de referencia ou alias.

### 1.2 Criacao Automatica (Apps Script)

O Apps Script executa 3 funcoes relacionadas ao cronograma:

1. **`renomearCalendario()`** — Busca o arquivo `📊 CRONOGRAMA` na pasta `10_VENDAS/.../04_CRONOGRAMA/` e renomeia para `📊 CRONOGRAMA {novoNome}`
2. **`salvarUrlCronograma()`** — Salva a URL da pasta 04_CRONOGRAMA na coluna `URL_CRONOGRAMA` da planilha master de jobs
3. **`darPermissaoCronograma()`** — Pega emails da coluna I (equipe) e adiciona como editores da pasta 04_CRONOGRAMA

### 1.3 Quantidade Encontrada

No catalogo do Drive foram encontrados **81 itens** com "cronograma" no nome:
- **~30 planilhas Google Sheets** (📊 CRONOGRAMA ...)
- **~35 pastas** (04_CRONOGRAMA — estrutura padrao de cada job)
- **~10 arquivos avulsos** (PDFs, XLSX — cronogramas de orcamento da Telma)
- **~6 copias/versoes** (variantes _v, copias de backup)

---

## 2. Estrutura da Planilha (3 Abas)

Toda planilha de cronograma tem **exatamente 3 abas**:

| # | Aba | Funcao |
|---|-----|--------|
| 1 | **Calendario** | Visualizacao mensal tipo calendario — exibe as fases nos dias correspondentes |
| 2 | **Processo** | Lista de fases/etapas com datas de inicio/fim e calculo de dias de trabalho |
| 3 | **DE_PARA** | Mapeamento de fases para IDs numericos (lookup table para formulas) |

---

## 3. Aba "Processo" (Dados Mestres)

Esta e a aba principal onde o usuario insere as informacoes. As outras abas sao derivadas desta.

### 3.1 Colunas

| Coluna | Nome | Tipo | Descricao |
|--------|------|------|-----------|
| A | **Ordem** | Numero auto | Sequencia numerica (1, 2, 3...) — instrucao "Nao digite abaixo" |
| B | **Fase** | Dropdown | Seleciona a fase da producao (com emoji) — instrucao "Selecione abaixo" |
| C | **Complemento** | Texto livre | Detalhes da fase (ex: "Aprovacao", "Agencia - 10:30", "Diaria 01 - Equipes simultaneas") |
| D | **Primeiro Dia** | Data (DD/MM/YYYY) | Data de inicio da fase — instrucao "Duplo clique e selecione" (date picker) |
| E | **Ultimo Dia** | Data (DD/MM/YYYY) | Data de fim da fase — instrucao "Duplo clique e selecione" (date picker) |
| F | **Pular o FINAL DE SEMANA?** | Dropdown (Sim/vazio) | Se marcado, o calculo de dias de trabalho exclui sabados e domingos |
| G | **Dias de Trabalho** | Numero calculado | Numero de dias uteis entre Primeiro Dia e Ultimo Dia — instrucao "Nao digite abaixo" |

### 3.2 Formulas (encontradas no Row 1, coluna K)

```
=ARRAYFORMULA(SE(D3:D="";"";MINUS(E3:E;D3:D)+1))
```
Calcula dias de trabalho: `Ultimo Dia - Primeiro Dia + 1`

```
=ARRAYFORMULA(SE(E3:E="";"";MINUS(FIMMES(E3:E;0);E3:E)))
```
Calcula dias restantes ate o fim do mes

```
=ARRAYFORMULA(SE(D3:D="";"";MINUS(DIA(FIMMES(D3:D;0));MINUS(E3:E;D3:D))-1))
```
Formula auxiliar para calculo de posicionamento no calendario

> **Nota:** A formula `MINUS(E3:E;D3:D)+1` calcula a diferenca de dias e soma 1 (inclusivo). Quando "Pular FINAL DE SEMANA" esta marcado, provavelmente ha uma formula condicional (DIATRABALHOTOTAL/NETWORKDAYS) que nao foi capturada no dump, mas a logica e: se F = "Sim", usa DIATRABALHOTOTAL(D,E) em vez de MINUS+1.

### 3.3 Exemplos Reais de Processos

**Job 031 - SP PRA TODA OBRA (Ogilvy) — Maio 2025:**

| Ordem | Fase | Complemento | Primeiro Dia | Ultimo Dia | Pular FDS? | Dias |
|-------|------|-------------|--------------|------------|------------|------|
| 1 | ✅ Aprovacao | 10 hrs | 12/05/2025 | 12/05/2025 | | 1 |
| 2 | 🗓️ Reuniao de Briefing | 12 hrs | 12/05/2025 | 12/05/2025 | | 1 |
| 3 | 📋 Pre-Producao | | 13/05/2025 | 13/05/2025 | | 1 |
| 4 | 📅 PPM | Agencia - 13:30 | 13/05/2025 | 13/05/2025 | | 1 |
| 5 | 🧰 Producao | | 14/05/2025 | 14/05/2025 | | 1 |
| 6 | 🎬 Gravacao | | 15/05/2025 | 15/05/2025 | | 1 |
| 7 | 📋 Pre-Producao | 13 hrs | 12/05/2025 | 12/05/2025 | | 1 |
| 8 | 🖥️ Pos Producao | | | | | |

**Job 028 - COMLURB (Agencia3) — Abril/Maio 2025:**

| Ordem | Fase | Complemento | Primeiro Dia | Ultimo Dia | Pular FDS? | Dias |
|-------|------|-------------|--------------|------------|------------|------|
| 1 | ✅ Aprovacao | | 24/04/2025 | 24/04/2025 | | 1 |
| 2 | 🗓️ Reuniao de Briefing | | | | | |
| 3 | 📅 PPM | Agencia - 10:30 | 26/04/2025 | 26/04/2025 | | 1 |
| 4 | 📋 Pre-Producao | | 24/04/2025 | 25/04/2025 | | 2 |
| 5 | 🧰 Producao | | | | | |
| 6 | 🎬 Gravacao | Diaria 02 | 01/05/2025 | 01/05/2025 | | 1 |
| 7 | 🎬 Gravacao | Diaria 01 - Equipes simultaneas | 30/04/2025 | 30/04/2025 | | 1 |
| 8 | 🖥️ Pos Producao | | | | | |

**Job 038 - Senac (SENAC SP) — Novembro 2024:**

| Ordem | Fase | Complemento | Primeiro Dia | Ultimo Dia | Pular FDS? | Dias |
|-------|------|-------------|--------------|------------|------------|------|
| 1 | 💰 Orcamento | Aprovacao | 11/11/2024 | 11/11/2024 | | 1 |
| 2 | 🗓️ Reuniao de Briefing | | 12/11/2024 | 12/11/2024 | | 1 |
| 3 | 📋 Pre-Producao | | 12/11/2024 | 13/11/2024 | | 2 |

### 3.4 Observacoes Importantes

- Fases podem se sobrepor (mesmo dia para varias fases)
- Uma mesma fase pode aparecer mais de uma vez (ex: Pre-Producao aparece 2x no Job 031)
- Gravacao pode ter multiplas "diarias" como itens separados
- Fases sem data ficam em branco (planejadas mas nao agendadas)
- A ordem nao precisa ser cronologica (no Job 028, Pre-Producao ordem 4 comeca antes de PPM ordem 3)
- O complemento e usado para horarios especificos ("10 hrs", "Agencia - 13:30") e detalhes ("Diaria 01")

---

## 4. Aba "DE_PARA" (Lookup Table)

Mapeia cada fase para um ID numerico. Usado pelas formulas do Calendario para associar cores e posicoes.

### 4.1 Colunas

| Coluna | Nome no Header | Nome Real | Descricao |
|--------|----------------|-----------|-----------|
| A | Matricula | Fase (com emoji) | Nome da fase exatamente como aparece no dropdown |
| B | Nome do Professor | ID numerico | Numero sequencial da fase (1, 2, 3...) |
| C | Turno | (vazio) | Nao utilizado nos dados encontrados |

> **Nota:** Os headers "Matricula", "Nome do Professor", "Turno" sao resquicios de um template escolar reaproveitado. Na pratica funcionam como "Fase", "ID", "Cor/Grupo".

### 4.2 Lista Completa de Fases (padrao encontrado)

| ID | Emoji | Fase | Categoria |
|----|-------|------|-----------|
| 1 | 💰 | Orcamento | Comercial |
| 2 | 🗓️ | Reuniao de Briefing | Comercial |
| 3 | 📋 | Pre-Producao | Pre-Producao |
| 4 | 📅 | PPM | Pre-Producao |
| 5 | 🧰 | Producao | Producao |
| 6 | 🎬 | Gravacao | Producao |
| 7 | 🖥️ | Pos Producao | Pos-Producao |
| 8 | ✂️ | Offline | Pos-Producao |

### 4.3 Fases Adicionais (encontradas nos Calendarios mas nao na DE_PARA)

Alem das 8 fases padrao, os calendarios mostram sub-etapas que sao escritas manualmente:

| Emoji | Sub-fase | Categoria |
|-------|----------|-----------|
| ✅ | Aprovacao | Comercial |
| 🗃️ | Loggagem do Material | Pos-Producao |
| 🎞️ | Montagem | Pos-Producao |
| 🔧✂️ | Offline - Alteracao | Pos-Producao |
| ✅✂️ | Offline - Aprovacao | Pos-Producao |
| 🎨 | Color/Finalizacao/Motion | Pos-Producao |
| 💻 | Online - Apresentacao Agencia e Cliente | Pos-Producao |
| ⚒️💻 | Online - Alteracao | Pos-Producao |
| 📀 | Copias | Entrega |
| 🌧️ | Previsao de chuva | Alerta (informativo) |

### 4.4 Formula da DE_PARA

```
=ARRAYFORMULA(SEERRO("texto"&SEQUENCE(CONT.VALORES(intervalo);colunas;inicio;passo)&"texto"))
```

Esta formula gera automaticamente IDs sequenciais para cada fase listada na coluna A.

---

## 5. Aba "Calendario" (Visualizacao)

### 5.1 Layout

O calendario segue o formato mensal padrao, com uma estrutura de grid:

```
Row 0: (vazio)
Row 1: [vazio] [nome_mes] [vazio] [vazio] [vazio] [ano]
Row 2: (vazio)
Row 3: [vazio] [domingo] [segunda] [terca] [quarta] [quinta] [sexta] [sabado]
Row 4: [vazio] [dia1]    [dia2]   [dia3]  [dia4]   [dia5]   [dia6]  [dia7]     <- numeros
Row 5: [vazio] [eventos] [eventos] ...                                          <- conteudo do dia
Row 6: [vazio] [dia8]    [dia9]   ...                                           <- numeros
Row 7: [vazio] [eventos] [eventos] ...                                          <- conteudo do dia
...
```

**Estrutura:**
- Coluna A: sempre vazia (margem)
- Colunas B-H: domingo a sabado (7 dias)
- Linhas pares (4, 6, 8, 10...): numeros dos dias do mes
- Linhas impares (5, 7, 9, 11...): eventos/fases daquele dia
- Row 1: mes e ano (ex: `maio  2025`)
- Row 3: cabecalho dos dias da semana

### 5.2 Formato dos Eventos no Dia

Cada celula de eventos contem uma lista de fases formatada com bullets e emojis:

```
* ✅ Aprovacao - 10 hrs
* 🗓️ Reuniao de Briefing - 12 hrs
* 📋 Pre-Producao -  13 hrs
```

Cada item segue o padrao:
```
* {emoji} {fase} - {complemento}
```

Quando um dia tem multiplas fases, elas ficam separadas por `\n` (quebra de linha dentro da celula):

```
* 📋 Pre-Producao
* 📅 PPM - Agencia - 13:30
* 📅 PPM - Cliente - 16:30
```

### 5.3 Exemplo Real: Job 028 (COMLURB) - Maio 2025

```
                Dom      Seg         Ter         Qua                   Qui                Sex                     Sab
Semana 1:       27       28          29          30                    01                  02                      03
                Producao Producao    Producao    Gravacao D01          Gravacao D02        Loggagem+Montagem       Montagem
                         +Chuva      +Chuva      (Equipes simult.)

Semana 2:       04       05          06          07                    08                  09                      10
                Montagem Offline     Offline     Offline Aprov.        Color/Final/Motion  Online Apres.           Online Alteracao
                         Apres.Ag    Alteracao   +Color/Final/Motion                       Ag+Cliente
                         +Alteracao  +Apres.Cli

Semana 3:       11       12
                Online   Copias
                Alteracao
```

### 5.4 Exemplo Real: Job 031 (SP PRA TODA OBRA) - Maio 2025

```
                Dom      Seg         Ter         Qua         Qui         Sex                     Sab
Semana 2:       11       12          13          14          15          16                      17
                (vazio)  Aprovacao   Pre-Prod    Producao    Gravacao    Montagem                Montagem
                         +Briefing   +PPM Ag                             +Loggagem
                         +Pre-Prod   +PPM Cli
```

### 5.5 Geracao do Calendario

O calendario e **gerado automaticamente** a partir da aba Processo via formulas ARRAYFORMULA. O mecanismo:

1. A DE_PARA mapeia cada fase para um ID
2. A aba Processo tem as datas de inicio e fim de cada fase
3. Formulas na aba Calendario:
   - Determinam o mes/ano a exibir (baseado na data mais antiga do Processo)
   - Geram os numeros dos dias do mes na grade 7x5 (35 celulas)
   - Para cada dia, verificam quais fases do Processo incluem aquele dia no seu range [Primeiro Dia, Ultimo Dia]
   - Concatenam as fases encontradas com `* {emoji} {fase} - {complemento}` separadas por `\n`

---

## 6. Cores e Formatacao Visual

### 6.1 Codigo de Cores por Fase

Embora o dump do Google Sheets nao capture formatacao condicional, com base no padrao Ellah e nos emojis:

| Fase | Emoji | Cor Provavel no Sheets | Hex Estimado |
|------|-------|----------------------|--------------|
| Orcamento | 💰 | Amarelo/Dourado | #FFD700 |
| Reuniao de Briefing | 🗓️ | Azul claro | #4FC3F7 |
| Pre-Producao | 📋 | Verde | #81C784 |
| PPM | 📅 | Azul | #42A5F5 |
| Producao | 🧰 | Laranja | #FFB74D |
| Gravacao | 🎬 | Vermelho | #EF5350 |
| Pos Producao | 🖥️ | Roxo | #AB47BC |
| Offline | ✂️ | Rosa | #F48FB1 |
| Montagem | 🎞️ | Roxo claro | #CE93D8 |
| Online | 💻 | Azul escuro | #1565C0 |
| Copias | 📀 | Cinza | #90A4AE |
| Aprovacao | ✅ | Verde escuro | #2E7D32 |
| Alerta (chuva) | 🌧️ | Cinza/Amarelo | #FFF176 |

> **IMPORTANTE:** As cores exatas nao puderam ser extraidas do dump (Google Sheets API retorna valores, nao formatacao). Sera necessario abrir uma planilha real para confirmar.

### 6.2 Formatacao do Calendario

- Celulas de dia com eventos tem fundo colorido (cor da fase principal)
- Dias de fim de semana (sabado/domingo) tem fundo cinza claro
- O mes e ano ficam em fonte grande/bold
- Os numeros dos dias ficam em fonte maior que os eventos
- Os eventos ficam em fonte menor, com quebra de linha automatica (wrap)

---

## 7. Calculo de Dias de Trabalho

### 7.1 Logica Basica

```
Dias de Trabalho = Ultimo Dia - Primeiro Dia + 1
```

Quando ambas as datas sao iguais (fase de 1 dia), o resultado e 1.
Quando Ultimo Dia - Primeiro Dia = 1, o resultado e 2 dias.

### 7.2 "Pular o Final de Semana"

A coluna F ("Pular o FINAL DE SEMANA?") e um dropdown com opcoes:
- **(vazio)** — conta todos os dias (corridos)
- **Sim** — exclui sabados e domingos do calculo

Quando "Sim", a formula provavelmente usa `DIATRABALHOTOTAL()` (equivalente a `NETWORKDAYS` em ingles):

```
=SE(F3="Sim"; DIATRABALHOTOTAL(D3;E3); MINUS(E3;D3)+1)
```

Nos dados analisados, **nenhum dos registros encontrados tinha "Pular FDS" preenchido**, indicando que a maioria dos jobs de publicidade trabalha corrido (inclusive fins de semana).

### 7.3 Fases sem Data

Quando Primeiro Dia e Ultimo Dia estao vazios, Dias de Trabalho fica vazio tambem. Isso indica fases planejadas mas ainda nao agendadas (ex: Pos Producao no Job 028 ainda sem data).

---

## 8. Fluxo de Trabalho do Usuario

1. **Criacao automatica:** Apps Script copia o template `📊 CRONOGRAMA` da pasta base e renomeia
2. **Preenchimento da aba Processo:** Produtor executivo seleciona as fases no dropdown, define datas inicio/fim
3. **Geracao automatica do Calendario:** Formulas ARRAYFORMULA populam a aba Calendario
4. **Compartilhamento:** Apps Script da permissao de edicao para emails da equipe do job
5. **Consulta:** Equipe abre o link (salvo na coluna URL_CRONOGRAMA da planilha master) e ve o calendario mensal
6. **Atualizacoes:** Produtor ajusta datas na aba Processo conforme necessario; Calendario atualiza automaticamente

---

## 9. Relacao com Outras Planilhas

### 9.1 GG (Gastos Gerais) — Aba CALENDARIO

A aba CALENDARIO dentro da planilha GG (Gastos Gerais) e **DIFERENTE** do Cronograma. Ela mostra o **calendario de pagamentos**, nao as fases de producao:

```
| JOB 38 - PAGAMENTO DA PRODUCAO | | | 22/01/2026 | 31.000,00 | ... |
|                                 | | | 27/01/2026 | 25.068,04 | ... |
|                                 | | | 13/02/2026 | 37.000,00 | ... |
```

Nao confundir:
- **📊 CRONOGRAMA** = fases de producao (Pre-Producao, Gravacao, Pos...)
- **GG > CALENDARIO** = calendario de pagamentos a fornecedores

### 9.2 STATUS_JOB_ETAPA (Planilha Master)

A planilha master de jobs tem uma aba STATUS_JOB_ETAPA que faz tracking granular de checklist por fase:

| NUMERO DO JOB | FASE | ITEM CHECKLIST | RESPONSAVEL | DATA PREVISTA | DATA REALIZADA | STATUS |
|---|---|---|---|---|---|---|
| 28 | Pre-producao | Receber briefing da agencia | atendimento@ | 01/06/2025 | 01/06/2025 | OK |
| 28 | Producao | Executar filmagem conforme cronograma | danillo@ | 05/06/2025 | | Em aberto |

Esta tabela e complementar ao cronograma — o cronograma mostra as datas macro, a STATUS_JOB_ETAPA mostra o checklist detalhado.

---

## 10. Gap no ELLAHOS Atual

Conforme documentado no RELATORIO-FINAL-DRIVE-ELLAH.md (Gap G-01):

> **O ELLAHOS nao tem modulo de CRONOGRAMA/TIMELINE por job.** So tem datas de filmagem (shooting_day_orders). Falta Gantt chart com fases da producao.

Itens que precisam ser implementados:
1. **Tabela de fases do cronograma** (equivalente a aba Processo)
2. **Visualizacao tipo calendario mensal** (equivalente a aba Calendario)
3. **Lista de fases padrao com emojis** (equivalente a aba DE_PARA)
4. **Calculo de dias de trabalho** (com opcao de pular final de semana)
5. **Compartilhamento** (link publico ou por role)

---

## 11. Resumo Tecnico para Implementacao

### 11.1 Modelo de Dados Proposto

```sql
-- Fases padrao (equivalente DE_PARA)
CREATE TABLE job_schedule_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,          -- "Orcamento", "Pre-Producao", etc.
  emoji TEXT,                  -- "💰", "📋", etc.
  color TEXT,                  -- "#FFD700"
  sort_order INT NOT NULL,     -- 1, 2, 3...
  category TEXT,               -- "comercial", "pre_producao", "producao", "pos_producao", "entrega"
  is_default BOOLEAN DEFAULT true
);

-- Itens do cronograma de um job (equivalente aba Processo)
CREATE TABLE job_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phase_id UUID REFERENCES job_schedule_phases(id),
  phase_name TEXT NOT NULL,    -- nome da fase (desnormalizado para flexibilidade)
  emoji TEXT,
  complement TEXT,             -- "Agencia - 10:30", "Diaria 01"
  start_date DATE,
  end_date DATE,
  skip_weekends BOOLEAN DEFAULT false,
  working_days INT GENERATED ALWAYS AS (
    CASE
      WHEN start_date IS NULL OR end_date IS NULL THEN NULL
      WHEN skip_weekends THEN -- calcular dias uteis
        (SELECT count(*) FROM generate_series(start_date, end_date, '1 day') d
         WHERE EXTRACT(DOW FROM d) NOT IN (0, 6))
      ELSE (end_date - start_date + 1)
    END
  ) STORED,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.2 Fases Padrao (seed data)

```sql
INSERT INTO job_schedule_phases (name, emoji, color, sort_order, category) VALUES
('Orcamento',           '💰', '#FFD700', 1,  'comercial'),
('Reuniao de Briefing', '🗓️', '#4FC3F7', 2,  'comercial'),
('Pre-Producao',        '📋', '#81C784', 3,  'pre_producao'),
('PPM',                 '📅', '#42A5F5', 4,  'pre_producao'),
('Producao',            '🧰', '#FFB74D', 5,  'producao'),
('Gravacao',            '🎬', '#EF5350', 6,  'producao'),
('Pos Producao',        '🖥️', '#AB47BC', 7,  'pos_producao'),
('Offline',             '✂️', '#F48FB1', 8,  'pos_producao'),
('Montagem',            '🎞️', '#CE93D8', 9,  'pos_producao'),
('Color/Finalizacao',   '🎨', '#7E57C2', 10, 'pos_producao'),
('Online',              '💻', '#1565C0', 11, 'pos_producao'),
('Copias/Entrega',      '📀', '#90A4AE', 12, 'entrega'),
('Aprovacao',           '✅', '#2E7D32', 13, 'comercial');
```

### 11.3 Componentes Frontend Necessarios

1. **ScheduleProcessTable** — Tabela editavel (equivalente aba Processo)
   - Dropdown de fases (com emoji + nome)
   - Date pickers para Primeiro/Ultimo dia
   - Toggle "Pular FDS"
   - Calculo automatico de dias de trabalho
   - Drag-and-drop para reordenar

2. **ScheduleCalendar** — Visualizacao mensal
   - Grid 7 colunas (Dom-Sab)
   - Celulas com lista de fases daquele dia
   - Cor de fundo por fase
   - Navegacao mes anterior/proximo
   - Suporte a multiplos meses (quando job cruza meses)

3. **ScheduleGantt** (melhoria sobre o Sheets)
   - Barras horizontais por fase
   - Timeline visual
   - Dependencias entre fases (novo — o Sheets nao tem)
