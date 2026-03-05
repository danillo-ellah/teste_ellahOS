# UI Design Spec — Cronograma / Gantt Chart

> Componente de cronograma visual para jobs de producao audiovisual.
> Exportavel como PDF para envio ao cliente.
> Design System: docs/design/design-system.md v1.0
> Ultima revisao: 04/03/2026 — incorpora feedback do usuario (logo duplo, inspiracao nos Sheets reais, tom criativo)

---

## CHANGELOG

| Data       | Revisao                                                            |
|------------|--------------------------------------------------------------------|
| 04/03/2026 | v2 — Logo duplo no PDF, fases com emojis dos Sheets reais, campo Complemento, tom criativo, secao de perguntas abertas |
| 03/03/2026 | v1 — Design inicial                                                |

---

## 1. Visao Geral

O Cronograma e uma aba do Job Detail que exibe a linha do tempo das fases de producao
em formato Gantt. O objetivo principal e ser visualmente atraente o suficiente para
substituir a planilha Google Sheets atual **e ser enviado diretamente ao cliente como PDF**.

### Dois modos de uso
1. **Modo visualizacao (padrao):** Gantt horizontal interativo, dark mode nativo
2. **Modo exportacao PDF:** Layout A4 landscape, branding completo (logo produtora + logo cliente)

### Referencia: o cronograma atual no Google Sheets
O usuario opera com planilhas de cronograma estruturadas em duas abas:

**Aba "Processo"** — tabela de dados:
```
| Ordem | Fase              | Complemento | Primeiro Dia | Ultimo Dia | Pular FDS? | Dias de Trabalho |
|-------|-------------------|-------------|-------------|------------|------------|-----------------|
| 1     | 💰 Orcamento      | Aprovacao   | 11/11/2024  | 11/11/2024 |            | 1               |
| 2     | 🗓️ Reuniao Briefing|            | 12/11/2024  | 12/11/2024 |            | 1               |
| 3     | 📋 Pre-Producao   |             | 12/11/2024  | 13/11/2024 |            | 2               |
```

**Aba "Calendario"** — visualizacao Gantt colorida (similar ao que estamos construindo)

**O que o ELLAHOS precisa superar:**
- Manter os emojis das fases (sao a identidade visual do cronograma, todo mundo reconhece)
- Manter o campo "Complemento" (detalhes extras por fase: "Aprovacao 10hrs", "Agencia - 10:30")
- Manter "Pular FDS?" por fase individual
- Ser mais bonito e profissional que o Sheets
- Exportar PDF com cara de documento de verdade, nao de planilha

---

## 2. Paleta de Cores por Fase

Cada fase tem cor propria derivada do design system, mapeada semanticamente.
Os emojis sao identicos aos usados nos Sheets — e proposital, facilita a transicao.

```
FASE                      EMOJI   COR HEX      TOKEN TAILWIND       JUSTIFICATIVA
-------------------------------------------------------------------------------------
Orcamento / Aprovacao     💰      #F59E0B      amber-500            Financeiro, negociacao
Reuniao de Briefing       🗓️      #8B5CF6      violet-500           Agenda, inicio
Pre-Producao              📋      #3B82F6      blue-500             Planejamento, organizacao
PPM                       📅      #06B6D4      cyan-500             Alinhamento tecnico
Filmagem / Gravacao       🎬      #EF4444      red-500              Ao vivo, urgente, producao
Pos-Producao              ✂️      #A855F7      purple-500           Edicao, corte
Color / Finalizacao       🎨      #F472B6      pink-400 (brand rose) Identidade Ellah
Audio / Trilha            🎵      #14B8A6      teal-500             Som, musica
Aprovacao Interna         ✅      #22C55E      green-500            Validado internamente
Aprovacao Cliente         🤝      #10B981      emerald-500          Validado pelo cliente
Entrega Final             🏁      #64748B      slate-500            Linha de chegada
```

Variantes dark mode: escala -400 de cada cor (mais brilhante sobre fundo escuro).

> Nota: o usuario pode customizar o emoji e o nome de qualquer fase.
> As cores acima sao sugeridas pelo tipo de fase, mas podem ser trocadas.

---

## 3. Wireframe ASCII — Vista Gantt (Desktop)

```
+==============================================================================+
|  📊 Cronograma                       [+ Fase]  [Editar]  [Exportar PDF v]   |
+==============================================================================+
|                                                                               |
|  LINHA DO TEMPO                                                               |
|  ── Jan 2026 ─────────────────── Fev 2026 ──────────────────── Mar 2026 ──  |
|  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐     |
|  │05 │06 │07 │08 │09 │12 │13 │14 │15 │16 │19 │20 │21 │22 │23 │26 │27 │...  |
|  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘     |
|  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  |
|                                                                               |
|  💰 Orcamento         ╔═══════════════╗                                      |
|     Aprovacao        ║  5 dias uteis  ║                                      |
|                       ╚═══════════════╝                                      |
|                                                                               |
|  🗓️ Reuniao Briefing             ╔════════╗                                  |
|     12hrs na agencia             ║ 1 dia  ║                                  |
|                                  ╚════════╝                                  |
|                                                                               |
|  📋 Pre-Producao                       ╔════════════════════════════════╗    |
|                                        ║         12 dias uteis          ║    |
|                                        ╚════════════════════════════════╝    |
|                                                                               |
|  📅 PPM                                                       ╔═══╗          |
|     Agencia 10:30                                             ║ 2d ║          |
|                                                               ╚═══╝          |
|                                                                               |
|  🎬 Filmagem                                                    ╔═══════╗    |
|                                                                 ║ 5 dias ║   |
|       ▲ HOJE                                                    ╚═══════╝   |
|  ─────┼──────────────────────────────────────────────────────────────────── |
|       │ (linha vertical rose-500 dashed — "Hoje")                            |
|                                                                               |
|  ✂️ Pos-Producao                                                         ..  |
|  🎨 Color / Final.                                                       ..  |
|  🏁 Entrega                                                              ..  |
|                                                                               |
|  ────────────────────────────────────────────────────────────────────────    |
|  Total: 38 dias uteis  |  Inicio: 05 jan  |  Entrega prevista: 28 fev        |
+==============================================================================+
```

### Detalhe visual das barras Gantt

```
Barra padrao:
  background:   {fase-color}/15  (opacity 15%, efeito suave)
  border-left:  3px solid {fase-color}
  border:       1px solid {fase-color}/30
  border-radius: rounded-lg (8px)
  height:       h-12 (48px) — ligeiramente mais alta que antes para acomodar complemento
  padding:      px-3 py-1

  Layout interno (flex column):
    linha 1: emoji + NOME DA FASE  (body-sm font-semibold)
    linha 2: texto do complemento  (caption text-muted) — se existir

Barra hover:
  background:   {fase-color}/25
  shadow:       sm
  cursor:       pointer

Barra "fase atual" (hoje esta dentro):
  background:   {fase-color}/25
  border-left:  4px solid {fase-color}  (mais grossa)
  ring:         2px ring-{fase-color}/40

Linha "Hoje":
  border-left: 2px dashed rose-500
  label: "Hoje" caption 11px rose-500 acima
  z-index: acima das barras
```

---

## 4. Wireframe ASCII — Vista Gantt (Mobile)

No mobile, o Gantt vira lista vertical de cards por fase.

```
+================================+
|  📊 Cronograma         [+ ✏️] |
+================================+
|                                |
|  38 dias uteis no total        |
|  05 jan → 28 fev 2026          |
|                                |
|  ████████████░░░░░░░░░ 60%    |
|  (progresso geral do job)      |
|                                |
|  ┌──────────────────────────┐  |
|  │ 💰 Orcamento / Aprovacao │  |
|  │    Aprovacao             │  |  (complemento em caption)
|  │    05 jan - 09 jan       │  |
|  │    5 dias uteis          │  |
|  │  ████████████████████    │  |
|  │  CONCLUIDO               │  |
|  └──────────────────────────┘  |
|                                |
|  ┌──────────────────────────┐  |
|  │ 🗓️ Reuniao de Briefing   │  |
|  │    12hrs na agencia      │  |
|  │    12 jan · 1 dia util   │  |
|  │  ████████████████████    │  |
|  │  CONCLUIDO               │  |
|  └──────────────────────────┘  |
|                                |
|  ┌──────────────────────────┐  |
|  │ 📋 Pre-Producao  ● HOJE  │  |
|  │    15 jan - 30 jan       │  |
|  │    12 dias uteis         │  |
|  │  ████████░░░░░░░░░░░░░░  │  |
|  │  EM ANDAMENTO — 65%      │  |
|  └──────────────────────────┘  |
|         ... mais fases ...     |
+================================+
```

### Especificacao do card de fase (mobile)

```
border-left: 4px solid {fase-color}
background:  surface (white/dark-card)
padding:     p-4
radius:      rounded-lg
shadow:      shadow-sm

Header:
  Row 1: flex justify-between
    Left:  emoji + nome  (body-sm font-semibold)
    Right: badge status  (caption, rounded-full, cor semantica)
  Row 2: complemento     (caption text-muted) — se existir

Datas: text-secondary caption (ex: "15 jan - 30 jan")
Dias uteis: text-muted caption
Progress bar:
  Track: bg-neutral-100 dark:bg-neutral-800, h-1.5, rounded-full
  Fill:  bg-{fase-color}, largura = % do tempo passado dentro da fase
```

---

## 5. Wireframe ASCII — Editor de Fases

Modal/Dialog ao clicar em "Editar". Desktop: Dialog max-w-4xl. Mobile: Sheet bottom-up.

```
+==============================================================================+
|  Editar Cronograma                                                   [X]     |
+==============================================================================+
|                                                                               |
|  +-----------------------------------------------------------------------+  |
|  | #  | FASE              | COMPLEMENTO   | INICIO     | FIM       | FDS | DEL |
|  |──────────────────────────────────────────────────────────────────────|  |
|  | ⠿ 1 | 💰 Orcamento     | Aprovacao     | 05/01/2026 | 09/01/2026 | ☑  | 🗑  |
|  | ⠿ 2 | 🗓️ Briefing      | 12hrs agencia | 12/01/2026 | 12/01/2026 | ☑  | 🗑  |
|  | ⠿ 3 | 📋 Pre-Producao  |               | 15/01/2026 | 30/01/2026 | ☑  | 🗑  |
|  | ⠿ 4 | 📅 PPM           | Agencia 10:30 | 02/02/2026 | 03/02/2026 | ☑  | 🗑  |
|  | ⠿ 5 | 🎬 Filmagem      |               | 05/02/2026 | 11/02/2026 | ☑  | 🗑  |
|  | ⠿ 6 | ✂️ Pos-Producao  |               | 12/02/2026 | 20/02/2026 | ☑  | 🗑  |
|  | ⠿ 7 | 🎨 Color / Final.|               | 24/02/2026 | 26/02/2026 | ☐  | 🗑  |
|  | ⠿ 8 | 🏁 Entrega       |               | 28/02/2026 | 28/02/2026 | ☑  | 🗑  |
|  +-----------------------------------------------------------------------+  |
|  [+ Adicionar Fase]                                                           |
|                                                                               |
|  💡 Dias uteis calculados automaticamente (skip fins de semana = ativado)    |
|                                                                               |
|  Total: 38 dias uteis  |  Inicio: 05 jan 2026  |  Entrega: 28 fev 2026      |
|                                                                               |
|  ──────────────────────────────────────────────────────────────────────      |
|                                             [Cancelar]  [Salvar Cronograma]  |
+==============================================================================+
```

### Linha de fase expandida (click para editar inline)

```
+--------------------------------------------------------------------------+
| ⠿ 1  💰 Orcamento     Aprovacao   05/01  09/01  5d  ☑  🗑              |
+--------------------------------------------------------------------------+
|                                                                          |
|   Nome:         [Orcamento / Aprovacao           ]   Emoji: [💰 v]     |
|   Complemento:  [Aprovacao                       ]                      |
|   Inicio:       [05/01/2026  🗓️]   Fim: [09/01/2026  🗓️]               |
|   Pular FDS:    [x] Sim — fins de semana nao contam                     |
|   Dias uteis:   5 dias  (calculado automaticamente)                     |
|   Cor:          [■ amber-500] [mudar]                                    |
|                                                                          |
+--------------------------------------------------------------------------+
```

---

## 6. Layout PDF Revisado — A4 Landscape com Logo Duplo

Esta e a secao mais importante do feedback do usuario.

### Conceito visual

O PDF deve ter **personalidade de documento audiovisual profissional**, nao de planilha.
Inspiracao: call sheets de producoes internacionais + identidade da Ellah Filmes.

**Logo duplo:** produtora (esquerda) + cliente (direita) + titulo do job no centro.
Isso comunica "parceria" e fica muito mais profissional do que um logo so.

### Wireframe ASCII — PDF A4 Landscape (297mm x 210mm)

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                        ║
║  ┌─────────┐                                              ┌─────────┐                 ║
║  │  LOGO   │   ELLAH FILMES       CRONOGRAMA              │  LOGO   │                 ║
║  │PRODUTORA│   Producao Audiovisual  DE PRODUCAO          │CLIENTE  │                 ║
║  └─────────┘   ─────────────────────────────────          └─────────┘                 ║
║                                                                                        ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║
║  (faixa de cor brand — fina, 3px, usando brandColor do tenant)                         ║
║                                                                                        ║
║  Projeto: CAMPANHA CARRINHO CAFE — PROPEG / SEC. COMUNICACAO                           ║
║  Codigo: ELL-2026-001    Cliente: Propeg    Agencia: Propeg    Emitido: 04 mar 2026    ║
║                                                                                        ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║                                                                                        ║
║  JAN 2026                              FEV 2026                         MAR 2026       ║
║  05  06  07  08  09  12  13  14  15  16  19  20  21  22  23  26  27  02  03  05  ...  ║
║  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   ║
║  💰 Orcamento · Aprovacao     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                       ║
║  🗓️ Reuniao Briefing · 12hrs               ▓▓▓▓▓▓▓▓▓                                  ║
║  📋 Pre-Producao                                    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║
║  📅 PPM · Agencia 10:30                                                   ▓▓▓▓▓        ║
║  🎬 Filmagem                                                                   ▓▓▓▓▓  ║
║  ✂️ Pos-Producao                                                                   ..  ║
║  🎨 Color / Finalizacao                                                            ..  ║
║  🏁 Entrega Final                                                                  ..  ║
║                                                                                        ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║                                                                                        ║
║  ┌────────────────────────┬─────────────────┬────────────────┬────────────────────┐   ║
║  │ FASE                   │ INICIO          │ FIM            │ DIAS UTEIS         │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 💰 Orcamento           │ 05 jan 2026     │ 09 jan 2026    │ 5 dias             │   ║
║  │    Aprovacao           │                 │                │                    │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 🗓️ Reuniao de Briefing │ 12 jan 2026     │ 12 jan 2026    │ 1 dia              │   ║
║  │    12hrs na agencia    │                 │                │                    │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 📋 Pre-Producao        │ 15 jan 2026     │ 30 jan 2026    │ 12 dias            │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 📅 PPM                 │ 02 fev 2026     │ 03 fev 2026    │ 2 dias             │   ║
║  │    Agencia - 10:30     │                 │                │                    │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 🎬 Filmagem            │ 05 fev 2026     │ 11 fev 2026    │ 5 dias             │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ ✂️ Pos-Producao        │ 12 fev 2026     │ 20 fev 2026    │ 7 dias             │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 🎨 Color / Final.      │ 24 fev 2026     │ 26 fev 2026    │ 3 dias             │   ║
║  ├────────────────────────┼─────────────────┼────────────────┼────────────────────┤   ║
║  │ 🏁 Entrega             │ 28 fev 2026     │ 28 fev 2026    │ 1 dia              │   ║
║  ├════════════════════════╪═════════════════╪════════════════╪════════════════════╤   ║
║  │ TOTAL                  │                 │                │ 38 dias uteis      │   ║
║  └────────────────────────┴─────────────────┴────────────────┴────────────────────┘   ║
║                                                                                        ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  Gerado por ELLAHOS • ellahos.com.br                              04 de marco de 2026  ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

### Especificacao detalhada do cabecalho PDF (logo duplo)

```
HEADER (height: 88px total, padding: 24px top/bottom, 32px left/right)

Layout: 3 colunas — [logo produtora] [centro] [logo cliente]

COLUNA ESQUERDA (width: 200px, align: flex-start):
  Logo da produtora (tenant):
    - Source: tenantLogo (URL do logo carregado no /settings/company)
    - Tamanho: max-h-14 (56px), max-w-[160px], object-contain
    - Fallback se sem logo: nome da produtora em font-semibold text-lg + icone Film
    - Posicao: align-items: center

COLUNA CENTRAL (flex-1, align: center):
  Linha 1: titulo do job em uppercase
    font-size: 15px, font-weight: 700, letter-spacing: 0.08em
    color: neutral-800 (escuro no PDF branco)
    max 2 linhas, text-center
  Linha 2: "CRONOGRAMA DE PRODUCAO"
    font-size: 10px, uppercase, letter-spacing: 0.15em
    color: brandColor do tenant (fallback: #E11D48 rose-600)
  Linha 3: fina linha decorativa (1px, brandColor, width: 120px, margin: auto)

COLUNA DIREITA (width: 200px, align: flex-end):
  Logo do cliente:
    - Source: clientLogo (URL do logo — ver secao de dados abaixo)
    - Tamanho: max-h-14 (56px), max-w-[160px], object-contain
    - Fallback se sem logo:
        badge retangular com iniciais do cliente
        bg: neutral-100, text: neutral-700, font-semibold
        + nome do cliente em body-sm abaixo
    - Posicao: align-items: center, text-align: right

FAIXA DE COR (entre header e subheader):
  height: 3px
  background: linear-gradient(90deg, brandColor 0%, brandColor/50 100%)
  — efeito cinematografico: fade de intenso para suave
```

### Onde buscar o logo do cliente

O logo do cliente vem de `clients.logo_url` (tabela clients do banco).
Se o job tem agencia, mostrar logo da agencia no lugar (ou em adicao).

```typescript
// Logica de prioridade para logo direito:
// 1. job.client.logo_url (cliente direto)
// 2. job.agency.logo_url (agencia, se existir)
// 3. Fallback: iniciais + nome

interface CronogramaPdfProps {
  job: {
    title: string
    code: string
    client: { name: string; logo_url?: string }
    agency?: { name: string; logo_url?: string }
  }
  tenant: {
    company_name: string
    logo_url?: string
    brand_color?: string
  }
  phases: CronogramaPhase[]
}
```

---

## 7. Especificacao Visual Completa do PDF

### Secoes (de cima para baixo, dentro de 210mm altura)

```
1. Header com logo duplo (height: 88px)
   - Descrito acima em detalhe

2. Faixa de cor brand (height: 3px)

3. Subheader — metadados do job (height: 36px)
   Layout: flex row, space-between, gap-x-8
   - "Projeto:" bold + nome do job (caption, neutral-700)
   - "Codigo:" + job_code (caption, neutral-500)
   - "Agencia/Cliente:" + nome (caption, neutral-700)
   - "Emitido em:" + data (caption, neutral-500)

4. Separador (1px, neutral-200)

5. Gantt visual (height: ~220px)
   Background: neutral-50 (fundo levemente cinza — diferencia da pagina branca)
   Padding: 12px
   Radius: 4px

   Eixo X (cabecalho de datas):
     - Linha de meses: uppercase, 9px, letter-spacing, neutral-400
     - Linha de dias: 10px, neutral-500, espacamento proporcional
     - Separador entre meses: border-right 1px dashed neutral-200

   Barras (cada fase):
     - Height: 28px por linha (compacto para caber no PDF)
     - Label: "emoji + nome · complemento" em 10px font-medium
     - Label fica A ESQUERDA das barras (coluna fixa de 160px)
     - Barra: border-left 3px {color}, background {color}22 (hex opacity ~13%)
     - Radius: 3px
     - Complemento: aparece como "· texto" em italic neutral-500 na mesma linha do label

   Linha "Hoje" (se aplicavel):
     - 1px dashed, rose-400
     - Label "HOJE" em 8px rose-400 no topo

6. Tabela resumo de fases (height: restante disponivel)
   Ver wireframe acima
   - Fonte: 10px
   - Header: bg-neutral-100, uppercase, 9px, letter-spacing, neutral-600
   - Linhas: alternando white/neutral-50
   - Border-left colorida (3px) por fase
   - Complemento na segunda linha da celula "FASE", em italic neutral-500
   - Linha TOTAL: border-top-2 neutral-300, font-bold

7. Footer (height: 28px)
   - Esquerda: "Gerado por ELLAHOS • ellahos.com.br"
   - Direita: data formatada por extenso "04 de marco de 2026"
   - Cor: neutral-400, 10px
```

---

## 8. Componentes e Estrutura de Arquivos

```
src/
  components/
    cronograma/
      GanttChart.tsx           — Componente principal (wrapper)
      GanttTimeline.tsx        — Cabecalho com datas (eixo X)
      GanttRow.tsx             — Uma linha de fase (barra + label + complemento)
      GanttTodayLine.tsx       — Linha vertical "Hoje"
      GanttTooltip.tsx         — Popover no hover da barra
      PhaseCard.tsx            — Card de fase (vista mobile)
      PhaseProgressBar.tsx     — Mini barra de progresso
      CronogramaEditor.tsx     — Tabela editavel de fases
      PhaseEditorRow.tsx       — Linha de uma fase no editor (com campo complemento)
      CronogramaPdfLayout.tsx  — Layout PDF com logo duplo (renderizado fora do viewport)
      PdfHeader.tsx            — Cabecalho PDF com 3 colunas (novo, isolado para manutencao)
      CronogramaSummaryTable.tsx — Tabela resumo (usada no PDF)
      ExportPdfButton.tsx      — Botao com logica de captura + jsPDF

  hooks/
    use-cronograma.ts          — CRUD de fases via EF, calculo de dias uteis
    use-cronograma-pdf.ts      — Logica de export (html-to-image + jsPDF)

  types/
    cronograma.ts              — Tipos TypeScript

  lib/
    cronograma-utils.ts        — workingDays(), isWeekend(), dateRange(), etc.
```

---

## 9. Tipos TypeScript Atualizados

```typescript
// src/types/cronograma.ts

interface CronogramaPhase {
  id: string
  name: string
  emoji: string
  complement?: string         // NOVO — campo "Complemento" do Sheets original
  startDate: string           // ISO date "2026-01-05"
  endDate: string             // ISO date "2026-01-09"
  skipWeekends: boolean
  workingDays: number         // calculado
  color: string               // hex do design system
  order: number
  status?: 'pending' | 'in_progress' | 'done'  // calculado com base em hoje
}

interface CronogramaPdfData {
  phases: CronogramaPhase[]
  job: {
    title: string
    code: string
    client: {
      name: string
      logo_url?: string
    }
    agency?: {
      name: string
      logo_url?: string
    }
  }
  tenant: {
    company_name: string
    logo_url?: string
    brand_color?: string      // hex, ex: "#E11D48"
  }
  exportedAt: string          // ISO datetime
}

interface GanttChartProps {
  phases: CronogramaPhase[]
  jobTitle: string
  jobCode: string
  clientName: string
  clientLogo?: string         // URL do logo do cliente (para PDF)
  agencyName?: string
  agencyLogo?: string         // URL do logo da agencia (para PDF)
  tenantLogo?: string         // URL do logo da produtora (para PDF)
  brandColor?: string         // Cor da produtora (hex, para PDF)
  readOnly?: boolean
  onPhasesChange?: (phases: CronogramaPhase[]) => void
}
```

---

## 10. Estados do Componente GanttChart

```
LOADING
  Skeleton da timeline (h-8 shimmer) + 8 linhas skeleton (h-12)
  Largura variavel simulando barras de diferentes tamanhos

EMPTY
  Icone: CalendarRange (48px, text-muted)
  Titulo: "Cronograma ainda nao configurado"
  Descricao: "Adicione as fases e visualize o Gantt do job."
  CTA: [+ Adicionar Fase] (primary button)
  Subtext: "Ou use o template padrao para comecar rapido" (link abaixo do CTA)

ERROR
  Icone: AlertTriangle (amber-500)
  Mensagem: "Nao foi possivel carregar o cronograma."
  CTA: [Tentar novamente] (outline button)

POPULATED (default)
  Gantt renderizado conforme wireframe

EDITING (modal aberto)
  Dialog sobreposto
  Gantt por baixo em opacity-40 com pointer-events: none
```

---

## 11. Comportamento Interativo

### Hover na barra Gantt (desktop)

```
Trigger: mouseenter na barra
Delay: 200ms
Componente: GanttTooltip (Radix Tooltip customizado)

Conteudo:
  ┌──────────────────────────────┐
  │  💰 Orcamento / Aprovacao    │
  │  ─────────────────────────   │
  │  05 jan → 09 jan 2026        │
  │  5 dias uteis (pula FDS)     │
  │  Complemento: "Aprovacao"    │
  │                              │
  │  Status: CONCLUIDO  ✓        │
  └──────────────────────────────┘

  bg: neutral-900
  text: white
  radius: rounded-lg
  padding: p-3
  shadow: shadow-lg
```

### Reordenacao de fases (editor)

```
Lib: @dnd-kit/core + @dnd-kit/sortable
Handle: GripVertical icon (w-4 h-4, text-muted) a esquerda
Drag: linha com opacity-50 + shadow-lg
Drop target: borda dashed rose-300
Animacao: transition-transform 150ms ease-out
```

---

## 12. Calculo de Dias Uteis

```typescript
// src/lib/cronograma-utils.ts

export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  skipWeekends: boolean
): number {
  if (!skipWeekends) {
    return differenceInDays(endDate, startDate) + 1
  }
  let count = 0
  let current = startDate
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current = addDays(current, 1)
  }
  return count
}

export function formatWorkingDays(days: number): string {
  return days === 1 ? '1 dia' : `${days} dias`
}
```

Dependencia: `date-fns` (ja presente).

---

## 13. Logica de Export PDF (Atualizada)

```
Fluxo:
  1. Usuario clica "Exportar PDF"
  2. Sistema busca logo do cliente via clients.logo_url (se disponivel)
  3. Sistema busca logo do tenant via tenant settings
  4. Renderizar CronogramaPdfLayout em div oculto (visibility:hidden, fora do viewport)
     width: 1122px (A4 landscape a 96dpi)
  5. Pre-carregar imagens dos logos (new Image(), onload) antes de capturar
     IMPORTANTE: logos devem estar com crossOrigin="anonymous" para html-to-image funcionar
  6. html-to-image.toPng(element, { pixelRatio: 2, cacheBust: true })
  7. jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  8. pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210)
  9. pdf.save(`cronograma-${jobCode}-${today}.pdf`)

Loading state:
  Botao vira [Gerando... spinner] (1-4s estimado, logos externos podem adicionar tempo)

Erro:
  Toast error: "Nao foi possivel gerar o PDF. Tente novamente."

Fallback de logo no PDF:
  Se logo_url retornar erro de CORS ou 404:
    - Usar canvas para gerar um placeholder com as iniciais
    - Nao bloquear a geracao do PDF
```

### Notas tecnicas para o logo duplo

```
CORS — logos em dominios externos (CDN do cliente, por exemplo):
  Opcao A: fazer proxy via Edge Function do Supabase (recomendado para logos externos)
  Opcao B: instruir usuario a hospedar logo no Supabase Storage (mesmo dominio)
  Opcao C: fallback gracioso com iniciais se CORS falhar

Formato aceito para logos:
  PNG (preferido), JPG, SVG (converter para PNG via canvas antes do html-to-image)
  Max-size recomendado para upload: 500KB
```

---

## 14. Responsividade

### Desktop (lg+ / 1024px+)
- Gantt horizontal completo com scroll horizontal se necessario
- Tooltip no hover das barras
- Editor como Dialog (max-w-4xl)
- Acoes visiveis no header: [+ Fase] [Editar] [Exportar PDF]

### Tablet (md / 768-1023px)
- Gantt com overflow-x-auto (scroll com swipe)
- Labels de fase: emoji + nome abreviado (max 20 chars) + complemento omitido
- Editor: Dialog max-w-2xl
- Acoes: icones apenas ([+] [pencil] [download])

### Mobile (< 768px)
- Gantt vira lista de cards (PhaseCard)
- Sem scroll horizontal
- Barra de progresso geral no topo
- Editor: Sheet bottom-up (shadcn Sheet, side="bottom")
- Exportar PDF: disponivel mas com toast informativo "PDF melhor gerado no desktop"
- DatePicker: Sheet bottom-up (nao Popover)

---

## 15. Dark Mode

```
Background geral:
  light: bg-white
  dark:  bg-zinc-950

Container da timeline:
  light: bg-neutral-50 border-neutral-200
  dark:  bg-neutral-900 border-neutral-800

Barras de fase:
  light: bg-{color}/15, border-{color}/30, borda-esq {color}-600
  dark:  bg-{color}/20, border-{color}/40, borda-esq {color}-400

Labels de data:
  light: text-neutral-500
  dark:  text-neutral-400

Linha "Hoje":
  light: border-rose-500 dashed
  dark:  border-rose-400 dashed

Tooltip: sempre fundo dark (neutral-900 text-white)

PDF: SEMPRE fundo branco (para impressao/envio ao cliente)
```

---

## 16. Acessibilidade

```
Gantt:
  role="region" aria-label="Cronograma de fases do job"
  Cada linha: role="row" aria-label="{emoji} {nome}: {inicio} ate {fim}, {dias} dias uteis"
  Barra: role="button" tabIndex=0 onKeyDown Enter/Space para editar
  Linha hoje: aria-label="Hoje, {data formatada}"

Editor:
  Dialog: aria-labelledby={titleId}
  Drag handle: aria-label="Reordenar fase {nome}"
  DatePicker: aria-label="Data de inicio de {nome}"
  Toggle FDS: role="switch" aria-checked={value}
  Remover: aria-label="Remover fase {nome}"

Contraste verificado (texto sobre fundo colorido/10):
  amber-600 sobre amber-50:   ~8:1  PASS AAA
  violet-600 sobre violet-50: ~7.5:1 PASS AAA
  red-600 sobre red-50:       ~7.2:1 PASS AAA
  blue-600 sobre blue-50:     ~7.8:1 PASS AAA
  todos demais: > 4.5:1 PASS AA
```

---

## 17. Fases Padrao (Template)

Mapeadas diretamente das fases que o usuario usa no Google Sheets.
Emojis identicos ao Sheets para facilitar a transicao sem atrito.

```typescript
const DEFAULT_PHASES: Omit<CronogramaPhase, 'id' | 'startDate' | 'endDate' | 'workingDays' | 'status'>[] = [
  { name: 'Orcamento / Aprovacao', emoji: '💰', complement: 'Aprovacao',  color: '#F59E0B', skipWeekends: true,  order: 1 },
  { name: 'Reuniao de Briefing',   emoji: '🗓️', complement: '',           color: '#8B5CF6', skipWeekends: true,  order: 2 },
  { name: 'Pre-Producao',          emoji: '📋', complement: '',           color: '#3B82F6', skipWeekends: true,  order: 3 },
  { name: 'PPM',                   emoji: '📅', complement: '',           color: '#06B6D4', skipWeekends: true,  order: 4 },
  { name: 'Filmagem',              emoji: '🎬', complement: '',           color: '#EF4444', skipWeekends: true,  order: 5 },
  { name: 'Pos-Producao',          emoji: '✂️', complement: '',           color: '#A855F7', skipWeekends: true,  order: 6 },
  { name: 'Color / Finalizacao',   emoji: '🎨', complement: '',           color: '#F472B6', skipWeekends: false, order: 7 },
  { name: 'Entrega Final',         emoji: '🏁', complement: '',           color: '#64748B', skipWeekends: true,  order: 8 },
]
```

Datas sugeridas a partir de `job.approved_at` com espacamentos razoaveis.

---

## 18. Integracao com o Job Detail

```
Tab ID:    "cronograma"
Tab Label: "Cronograma"
Tab Icon:  CalendarRange (Lucide)
Grupo:     Gestao
Posicao:   [PPM] [Cronograma] [Aprovacao]
```

Schema da tabela (nova migration):

```sql
-- job_schedules
id         uuid primary key default gen_random_uuid()
job_id     uuid references jobs(id) on delete cascade
tenant_id  uuid references tenants(id)
phases     jsonb   -- array de CronogramaPhase (com campo complement)
created_at timestamptz default now()
updated_at timestamptz default now()

-- RLS: tenant isolation padrao
```

Edge Function: `job-schedules` com handlers GET e PUT por job_id.

---

## 19. Tokens de Design Aplicados

```
Espacamento:
  Gap entre linhas Gantt: gap-2 (8px)
  Padding do container: p-6 (24px) desktop / p-4 (16px) mobile
  Padding interno das barras: px-3 py-1
  Altura das barras: h-12 (48px) — acomodar complemento

Tipografia:
  Nome da fase: body-sm (14px) font-semibold
  Complemento na barra: caption (12px) text-muted italic
  Cabecalho de mes: overline (11px) uppercase tracking-wide
  Dias no eixo X: caption (12px) text-muted
  Footer total: body-sm font-medium

Bordas:
  Barras: rounded-lg (8px), border-left 3px, border 1px/30 opacity
  Container: border border-neutral-200 dark:border-neutral-800

Sombras:
  Container: shadow-sm (light only)
  Hover barras: shadow-sm -> shadow-md transition 200ms
  Tooltip: shadow-lg
```

---

## 20. Notas para Implementacao

1. **html-to-image e jsPDF** ja sao dependencias instaladas (Claquete ANCINE). Reusar.

2. **@dnd-kit** — verificar se ja instalado. Se nao:
   `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

3. **date-fns** — ja presente.

4. **Scroll sincronizado do Gantt:** cabecalho (eixo X) e as linhas fazem scroll juntos.
   Usar um container unico com overflow-x-auto e grid interno com colunas fixas.

5. **Performance do PDF:** CronogramaPdfLayout via `ReactDOM.createPortal` em div
   fora do viewport. Usar `visibility: hidden` (nao `display: none`) para que
   html-to-image consiga medir dimensoes.

6. **Cores no PDF:** usar hex inline (nao Tailwind classes). Ex:
   `style={{ backgroundColor: `${phase.color}22` }}` (22 hex = ~13% opacity)

7. **Logo duplo — pre-load obrigatorio:** antes de capturar o PDF, pre-carregar ambas
   as imagens de logo com `new Image()` + `onload`. Evita logos em branco no PDF.

8. **Brand color da tenant:** cabecalho PDF usa `brandColor`. Fallback: `#E11D48`.

9. **Campo `complement`** precisa ser incluido na migration de `job_schedules.phases`
   (campo jsonb aceita automaticamente, mas documentar no schema).

---

## 21. PERGUNTAS PARA O USUARIO

Decisoes que nao sao do designer — precisam de resposta do dono do produto.

---

**P1 — Logo do cliente: onde vem?**
Atualmente a tabela `clients` nao tem coluna `logo_url` confirmada.
O usuario vai fazer upload do logo do cliente no ELLAHOS (aba do cliente no CRM)?
Ou vai subir o logo so na hora de exportar o cronograma?

Opcoes:
- A) Campo `logo_url` na tabela `clients` (upload no cadastro do cliente)
- B) Campo no job especificamente ("logo para o cronograma")
- C) So mostra o logo do cliente se ele ja estiver cadastrado no CRM; senao, so o nome

---

**P2 — Complemento e obrigatorio ou opcional?**
No Sheets o campo "Complemento" e de preenchimento livre.
Algumas fases tem (ex: "Aprovacao", "Agencia - 10:30"), outras ficam vazias.
No ELLAHOS vai funcionar igual — opcional por fase?
Ou quer tornar obrigatorio em alguma fase especifica (ex: PPM sempre pede o local/horario)?

---

**P3 — Sub-fases dentro de uma fase principal?**
Por exemplo: dentro de "Pre-Producao" ter sub-itens como:
- Casting (3 dias)
- Locacao (2 dias)
- Figurino (2 dias)

O Sheets atual nao tem isso. Quer adicionar no ELLAHOS ou manter flat (sem hierarquia)?

---

**P4 — PDF: impressao ou so digital?**
O PDF vai ser impresso em papel (reunioes presenciais)?
Ou e 100% digital (enviado por WhatsApp/email, visualizado em tela)?

Impacto: se for impressao, precisamos usar CMYK-safe colors e evitar fondos coloridos
nas barras (impressora pode nao reproduzir bem as transparencias).

---

**P5 — QR Code no PDF?**
Quer um QR Code no rodape do PDF que abre o job diretamente no ELLAHOS?
Fica profissional e facilita o cliente acessar o status online.
(Implementacao: biblioteca `qrcode` client-side, sem dependencia nova pesada)

---

**P6 — Cores das fases: fixas ou configuravel por tenant?**
As cores que defini seguem o design system e fazem sentido semanticamente.
Mas alguns tenants podem querer usar a paleta deles (ex: produtora com identidade verde).

Opcoes:
- A) Cores fixas por tipo de fase (nao configuravel)
- B) Cada usuario pode mudar a cor de cada fase manualmente no editor
- C) O tenant define uma paleta e as cores sao geradas automaticamente

---

**P7 — Template de fases: unico ou por tipo de job?**
O template padrao que criei tem 8 fases (orcamento → entrega).
Jobs de foto still tem fases diferentes de jobs de TV.
Quer templates diferentes por `project_type`? Ex:
- Publicidade TV: 8 fases padrao
- Fotografia Still: Orcamento → Briefing → Pre-Prod → Sessao → Selecao → Entrega
- Documentario: pode ter fases de roteiro, entrevistas, etc.

---

**P8 — Aprovacoes no cronograma: integrar com o modulo de aprovacao?**
O ELLAHOS ja tem um modulo de aprovacao interna e externa.
Quer que as fases de "Aprovacao Interna" e "Aprovacao Cliente" do cronograma
sejam automaticamente linked ao modulo de aprovacao?
(Ex: quando a fase "Aprovacao Cliente" termina, o modulo de aprovacao e disparado)

---

**P9 — Versoes do cronograma?**
No Sheets o usuario tinha que duplicar manualmente para guardar versoes.
Quer que o ELLAHOS mantenha historico automatico? (ex: "Cronograma v1", "v2 revisado")
Ou uma unica versao editavel e suficiente?

---

**P10 — Exportar como XLSX (planilha)?**
Alem do PDF, quer poder exportar o cronograma no formato do Sheets atual?
(Tabela editavel, para quando o cliente ou agencia pedir em Excel)
Isso e mais trabalhoso de implementar — quero saber se e prioridade.
