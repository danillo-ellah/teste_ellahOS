# Spec Visual: Validacao de NFs — Redesign v2
# Revisao de UX/UI baseada em feedback do usuario

**Data:** 2026-02-26
**Versao:** 2.0 (revisao do v1.0 de 2026-02-25)
**Autor:** UI/UX Designer — ELLAHOS
**Motivo:** Usuario reportou a tela como "pouco intuitiva" e "nao muito profissional"
**Escopo:** Analise critica do estado atual + proposta de melhorias sem quebrar o layout split

---

## Indice

1. [Diagnostico: O Que Esta Errado](#1-diagnostico-o-que-esta-errado)
2. [Mapa de Problemas por Componente](#2-mapa-de-problemas-por-componente)
3. [Proposta: Modal de Validacao (principal)](#3-proposta-modal-de-validacao-principal)
4. [Proposta: Tabela da Lista](#4-proposta-tabela-da-lista)
5. [Proposta: Pagina Principal](#5-proposta-pagina-principal)
6. [Resumo de Mudancas por Prioridade](#6-resumo-de-mudancas-por-prioridade)

---

## 1. Diagnostico: O Que Esta Errado

Ao comparar o codigo implementado com o design system e com boas praticas de UX para fluxos de revisao/aprovacao (Frame.io, Linear, Shotgun), identifiquei quatro categorias de problema.

### 1.1 Problema de Hierarquia Visual no Modal

O modal de validacao e o componente mais importante da tela — e onde o usuario passa 90% do tempo. Mas ele nao comunica visualmente o que importa:

- O titulo "Validar NF — nf-uber-01-02.pdf" mistura nivel de hierarquia com informacao de arquivo. O usuario nao consegue escanear rapidamente "o que eu estou fazendo aqui".
- O painel direito despeja seis campos de input (fornecedor, CNPJ, numero NF, valor, data, competencia) em sequencia linear sem nenhum agrupamento ou ênfase. Todos os campos parecem ter o mesmo peso. Na realidade, **Fornecedor e Valor sao os campos mais criticos** — o usuario precisa validar eles primeiro.
- A secao "Match Sugerido" e de longe a mais importante do painel direito (e o ponto de decisao final), mas visualmente ela aparece como mais uma secao de formulario. O card azul de match e pequeno e sem destaque suficiente.
- Os botoes do footer criam tensao errada: "Rejeitar NF" (destructive, vermelho) fica a esquerda e tem o mesmo tamanho e peso visual que "Confirmar Match" (primary). O olho do usuario é atraido para o vermelho primeiro — o oposto do que queremos.

### 1.2 Problema de Fluxo (o usuario nao sabe o que fazer)

O fluxo atual exige que o usuario:
1. Abra o modal
2. Olhe para o PDF a esquerda
3. Confira cada campo do formulario individualmente
4. Decida se o match sugerido esta correto
5. Clique em "Confirmar Match"

O problema e que o passo 3 e 4 nao tem ordem clara. O usuario nao sabe se deve primeiro checar o PDF, depois preencher os campos, depois confirmar o match — ou o contrario. A tela nao guia. Ela apenas apresenta dados.

Alem disso, o botao "Rejeitar NF" esta no footer sempre visivel mas **clica em toggle** (ativa o modo rejeicao no painel direito). Isso e inesperado. Clicar em "Rejeitar NF" deveria mostrar um feedback imediato de que a NF foi rejeitada — mas ao inves disso abre um campo de texto dentro do painel direito de forma sutil, sem scroll automatico, potencialmente invisivel se o painel tiver rolado.

### 1.3 Problema de Profissionalismo Visual

Itens que reduzem a percepcao de qualidade profissional:

- **Badge "OCR" dentro do input:** o badge fica sobreposto ao campo de texto, visualmente disputando espaco com o valor do campo. Em telas com valores longos, o badge pode literalmente tapar o final do texto.
- **Label "DADOS EXTRAIDOS" com `text-[11px]`:** o uso de um tamanho fora da escala tipografica (11px e `overline` no design system, mas deve ser `text-[11px]` literal so quando necessario — aqui aparece com tracking-widest que exagera o estilo). O resultado parece amador comparado a produtos como Linear ou Frame.io.
- **Padding inconsistente no painel direito:** o painel usa `p-6` de padding geral com campos `gap-3`, mas a secao de match tem margin `mt-6` enquanto a secao de dados tem `mt-3`. A inconsistencia cria um ritmo visual irregular.
- **Estado de rejeicao inline:** o formulario de motivo de rejeicao aparece dentro do scroll do painel direito, embaixo de todos os outros campos. O usuario que acabou de clicar em "Rejeitar NF" no footer precisa scrollar para baixo no painel para encontrar o campo que acabou de aparecer. Isso e uma quebra de UX severa.
- **Botao "Reclassificar para outro lancamento" com `w-full`:** este botao secundario tem a mesma largura do painel inteiro, dando a ele o mesmo peso visual do botao primario de "Confirmar Match" no footer. Isso dilui a hierarquia de acoes.
- **Toolbar do PDF:** altura `h-9` com `bg-zinc-100` fica visualmente desconectada do painel do PDF, parecendo um elemento flutuante sem contexto.

### 1.4 Problema de Acoes na Tabela

Na tabela de listagem:
- O botao "Validar" e um `Button variant="ghost"` de tamanho `sm` com `h-7 px-2`. A area de toque e minuscula (28px de altura, abaixo do minimo de 44px do design system para touch targets).
- A acao mais importante (validar) e um botao ghost — visualmente fraco. Acoes primarias devem ter o variant adequado para destaque.
- O dropdown de "mais opcoes" coloca "Rejeitar" dentro do menu junto com "Visualizar PDF" e "Reclassificar" e "Copiar ID". Rejeitar e uma acao destrutiva que nao deveria estar escondida no mesmo nivel de copiar ID.
- A coluna "Job Vinculado" mostra um dash `—` para NFs sem job. O tooltip "Sem job vinculado — valide para associar" e util mas a coluna inteira fica sem significado visual para o caso mais comum (NFs pendentes sem job).

---

## 2. Mapa de Problemas por Componente

### 2.1 NfValidationDialog (modal principal)

```
PROBLEMA                          SEVERIDADE   IMPACTO
--------------------------------------------------------------
Fluxo de rejeicao inline/scroll   CRITICO      Usuario nao ve o campo
Hierarquia botoes footer invertida CRITICO     Rose perde para vermelho
Badge OCR sobrepoe texto do input  ALTO        Leitura comprometida
Secao Match sem destaque adequado  ALTO        Ponto de decisao opaco
Titulo do modal mistura contextos  MEDIO       Scanning dificultado
Espacamento inconsistente          MEDIO       Aparencia pouco profissional
Botao reclassificar com w-full     MEDIO       Peso visual errado
Padding toolbar PDF desconectado   BAIXO       Estetica
```

### 2.2 NfDocumentTable (listagem)

```
PROBLEMA                          SEVERIDADE   IMPACTO
--------------------------------------------------------------
Area de toque do botao Validar     ALTO        Acessibilidade (h-7 = 28px)
Rejeitar escondido no dropdown     MEDIO       Descoberta da acao
Botao Validar como ghost           MEDIO       Hierarquia de acoes
Coluna Job Vinculado vazia         BAIXO       Informacao ausente
```

### 2.3 Pagina principal (page.tsx)

```
PROBLEMA                          SEVERIDADE   IMPACTO
--------------------------------------------------------------
Sem indicador de "NFs urgentes"    MEDIO       Triagem dificultada
Filter bar funcional mas visualmente plana      BAIXO   Estetica
```

---

## 3. Proposta: Modal de Validacao (principal)

O modal mantem o layout split 50/50 (PDF a esquerda, dados a direita). O que muda e a organizacao interna e o tratamento de cada elemento.

### 3.1 Header Redesenhado

**Estado atual:**
```
+----------------------------------------------------+
|  Validar NF — nf-uber-producao-jan-2026.pdf   [X] |
+----------------------------------------------------+
```

**Proposta v2:**
```
+----------------------------------------------------+
|  [FileText 16px]  Validar Nota Fiscal         [X] |
|  nf-uber-producao-jan-2026.pdf  [● Pendente]      |
+----------------------------------------------------+
```

Especificacao:
- Titulo: "Validar Nota Fiscal" — texto fixo, sem o nome do arquivo no titulo
- Subtitulo: nome do arquivo (caption, text-zinc-500) + NfStatusBadge alinhados na mesma linha, abaixo do titulo
- Padding: `px-6 py-4` (mantido)
- Border-bottom: mantida
- Separacao visual: o titulo e o contexto ficam claros separados

Racionalizacao: o nome do arquivo e informacao de contexto, nao e o titulo da acao. O usuario precisa saber que esta "Validando uma Nota Fiscal" (acao), e o arquivo especifico e contexto secundario.

### 3.2 Painel Esquerdo — PDF Preview

Sem mudancas estruturais. Ajustes esteticos:

**Toolbar do PDF — proposta:**
```
+--------------------------------------------------+
|  [FileText 14px] nf-uber-producao.pdf  |  [ExternalLink] Abrir  |
+--------------------------------------------------+
```

- Adicionar borda-esquerda `border-l-4 border-l-zinc-300 dark:border-l-zinc-600` na toolbar para criar ancora visual
- Usar `bg-zinc-50 dark:bg-zinc-900` (ja esta correto, apenas manter)
- Separador `|` entre nome e link, usando `mx-3 text-zinc-300` para criar visual mais limpo

Loading state do iframe — proposta:
- Substituir `Skeleton` circular por um retangulo de skeleton em proporcao A4 (ratio 1:1.41) centralizado
- Manter o texto "Carregando PDF..." abaixo

### 3.3 Painel Direito — Reorganizacao Completa

O painel direito deve ser reorganizado em tres zonas visuais claramente distintas, com hierarquia decrescente de importancia:

```
ZONA A — MATCH SUGERIDO (primeira, mais importante)
ZONA B — DADOS PRINCIPAIS (segundo: fornecedor + valor)
ZONA C — DADOS COMPLEMENTARES (terceiro: CNPJ, num. NF, data, competencia)
```

**Justificativa:** O usuario nao precisa preencher campos — a maioria ja vem do OCR. O que o usuario precisa fazer e VERIFICAR o match e CONFIRMAR. Logo, o match deve estar no topo, nao no meio.

**Wireframe do painel direito reorganizado:**

```
+------------------------------------------+
| SCROLL AREA (overflow-y-auto)            |
|                                          |
| MATCH SUGERIDO                           |  <- overline label
| +--------------------------------------+ |
| | [Zap] Auto-matched          [Trocar] | |  <- card com acao inline
| |                                      | |
| | Uber equipe — transporte producao    | |  <- descricao do lancamento
| | [BBB_038] R$ 350,00 · 15/01/2026     | |  <- meta
| +--------------------------------------+ |
|                                          |
| (sem match)                              |
| +-- -- -- -- -- -- -- -- -- -- -- --+ |
| | [AlertCircle] Sem match automatico  | |
| | [Buscar lancamento financeiro]      | |
| +-- -- -- -- -- -- -- -- -- -- -- --+ |
|                                          |
| DADOS DA NOTA FISCAL                    |  <- overline label
|                                          |
| Fornecedor *                            |  <- campo 1: full-width, importante
| [___________________________________]   |
|                                          |
| Valor *            Numero NF            |  <- campos 2+3: lado a lado
| [R$ _________]     [_________]          |
|                                          |
| INFORMACOES ADICIONAIS          [v]      |  <- secao colapsavel
| (expansivel por padrao se houver dados) |
| Data de emissao    Competencia          |
| [__________]       [__________]         |
| CNPJ                                    |
| [__________________________]            |
|                                          |
+------------------------------------------+
```

**Detalhamento da Zona A — Match Sugerido:**

Card com match presente:
- Container: `rounded-lg border border-border bg-card p-4`
- Header do card: linha com `[Zap 14px text-emerald-500]` + texto "Auto-matched" (text-xs font-medium text-emerald-700 dark:text-emerald-400) + botao "Trocar" (Button variant="ghost" size="sm" h-7, a direita com ml-auto)
- Descricao: text-sm font-semibold text-foreground, mt-2 (unica linha de texto grande — merece destaque)
- Badge job code: Badge variant="secondary" xs, inline apos a descricao
- Meta linha: `font-mono text-sm text-zinc-700 dark:text-zinc-300` para o valor (AMBER como cor accent, pois e elemento financeiro per design system) + separador ` · ` + data em text-sm text-zinc-500
- Borda esquerda colorida: `border-l-4 border-l-emerald-500` quando matched, `border-l-4 border-l-amber-500` quando selecionado manualmente

Observacao importante: mudar o badge header de "Auto-matched" azul para **emerald** (verde). O azul esta sendo usado tanto para o status "auto_matched" na tabela quanto para o card de match no modal, criando confusao semântica. No modal, o match e uma coisa BOA (confirmando uma associacao correta) — deve usar verde/emerald.

Card sem match:
- Container: `rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-transparent p-4`
- Icone: `AlertCircle 20px text-amber-500` (warning, nao neutro)
- Texto primario: "Lancamento nao encontrado automaticamente" (text-sm font-medium)
- Texto secundario: "Vincule manualmente ao lancamento correto para confirmar esta NF." (text-xs text-zinc-500)
- Botao: `Button variant="default" size="sm"` com icone `Search` — aqui o variant deve ser "default" (primary rose), pois essa e a acao que o usuario DEVE executar para prosseguir

**Detalhamento da Zona B — Dados Principais:**

Label de secao: "DADOS DA NOTA FISCAL" (overline, 11px, uppercase, tracking-wide, text-zinc-400, mt-5)

Campo Fornecedor (full width):
- Label: `Label` com asterisco vermelho `text-red-500` indicando que e campo critico
- Input: `text-sm`, altura padrao
- Badge OCR: remover do interior do input — mover para ao lado do Label (nao dentro do campo)
  - Novo posicionamento: `<Label> Fornecedor <Badge>OCR</Badge> </Label>` — inline com o label, nao flutuando sobre o input
  - Quando editado pelo usuario: label muda de cor e badge "Editado" substitui "OCR" (amber), tambem inline

Campo Valor (col-span-1 de 2):
- Prefix "R$" mantido
- `font-mono` mantido
- Aumentar levemente o tamanho para `text-base` (16px) — valor monetario merece destaque

Campo Numero NF (col-span-1 de 2):
- Sem mudancas de comportamento

**Detalhamento da Zona C — Informacoes Adicionais (colapsavel):**

- Titulo colapsavel: "Informacoes Adicionais" com icone `ChevronDown`/`ChevronUp` a direita
- Estado padrao: **expandido** se algum campo tiver dado OCR ou editado; **colapsado** se tudo vazio
- Conteudo: Data de emissao, Competencia, CNPJ
- Padding: sem border, apenas `mt-4 pt-4 border-t border-border/50`

Racionalizacao: CNPJ, data e competencia sao campos de confirmacao/auditoria, nao de decisao. O usuario so precisa deles se houver discrepancia. Esconder por padrao reduz a carga cognitiva na leitura inicial.

### 3.4 Footer Redesenhado

**Estado atual:**
```
[Rejeitar NF (destructive)]  [Cancelar (outline)]  [Confirmar Match (primary, disabled)]
```

**Problema:** "Rejeitar" (vermelho) esta a esquerda e atrai o olho antes do CTA principal.

**Proposta v2:**
```
[Cancelar (ghost)]  [Rejeitar (outline com icone)]  [Confirmar NF (primary rose)]
```

Especificacao:

Botao Cancelar:
- `variant="ghost"` (nao "outline") — menor peso visual
- Sem icone
- Texto: "Cancelar"

Botao Rejeitar:
- `variant="outline"` com `className="border-zinc-300 text-zinc-600 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:text-red-400"`
- Icone: `XCircle 16px` (mantido)
- Texto: "Rejeitar"
- Comportamento: abre um Dialog separado (ver 3.5) — NAO modo inline no painel

Botao Confirmar NF:
- `variant="default"` (primary rose, ja correto)
- Icone: `CheckCircle2 16px` (mantido)
- Texto: "Confirmar NF" (mudanca de "Confirmar Match" — mais claro para o usuario)
- disabled quando: sem match selecionado

Adicionar indicador de progresso no footer:
```
[Cancelar]  [Rejeitar]                    [Confirmar NF]
             Falta: vincular lancamento   (texto caption, text-amber-600, so aparece quando canConfirm=false)
```

Esta dica inline no footer explica PORQUE o botao esta desabilitado, sem que o usuario precise investigar.

### 3.5 Rejeicao como Dialog Separado (nao inline)

**Estado atual:** Clicar em "Rejeitar NF" faz toggle de `rejectMode` state que injeta um `div` dentro do scroll do painel direito. O usuario precisa scrollar para ver.

**Proposta v2:** Clicar em "Rejeitar" abre um `AlertDialog` secundario sobreposto ao modal de validacao.

```
+-----------------------------------------------+
|  Rejeitar Nota Fiscal                    [X]  |
+-----------------------------------------------+
|  Voce esta rejeitando:                        |
|  nf-uber-producao-jan-2026.pdf               |
|                                               |
|  Motivo da rejeicao *                         |
|  [                                          ] |
|  Exemplos: duplicada, fornecedor incorreto,   |
|  NF cancelada pelo emitente                   |
|                                               |
+-----------------------------------------------+
|  [Cancelar]              [Rejeitar NF]        |
+-----------------------------------------------+
```

Especificacao do AlertDialog de rejeicao:
- `max-w-md` (448px) — tamanho modal pequeno per design system
- Nao substitui o Dialog principal — flutua sobre ele (z-index maior)
- Textarea (nao Input): `min-h-[80px]` para comportar motivos mais longos
- Placeholder: "Ex: NF duplicada, fornecedor incorreto, NF cancelada..."
- Helper text: text-xs text-zinc-500 abaixo do textarea
- Botao "Rejeitar NF": `variant="destructive"` — aqui sim o vermelho e apropriado porque e o momento de confirmacao da acao destrutiva
- Botao "Cancelar": `variant="outline"` — retorna ao modal de validacao sem fechar

Racionalizacao: o Dialog de rejeicao e um fluxo separado que merece tratamento separado. O usuario deve ter clareza de que esta realizando uma acao irreversivel (ou de dificil reversao) antes de confirmar. Manter inline no scroll do painel confunde o contexto.

---

## 4. Proposta: Tabela da Lista

### 4.1 Botao "Validar" na Coluna de Acoes

**Estado atual:**
```jsx
<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
  <CheckSquare /> Validar
</Button>
```

Problemas: `h-7` (28px) abaixo do minimo de touch target, `variant="ghost"` fraco para acao primaria.

**Proposta v2:**
```
[Revisar]  [...]
```

Especificacao:
- Botao primario da linha: `variant="outline"` size="sm" com `h-8` (32px, ainda compacto para tabela mas melhor que 28px)
- Texto: "Revisar" em vez de "Validar" — mais claro sobre o que o usuario vai fazer (revisar os dados, nao apenas apertar validar)
- Icone: `ClipboardCheck` em vez de `CheckSquare` — mais descritivo da acao de revisao
- Para NFs com status `auto_matched`: botao deve ter cor `hover:border-emerald-500 hover:text-emerald-600` sinalizando que o match ja existe e e so confirmar

### 4.2 Acao de Rejeitar no Dropdown

**Estado atual:** "Rejeitar" esta no mesmo `DropdownMenuContent` que "Visualizar PDF", "Reclassificar" e "Copiar ID".

**Proposta v2:**
- Manter "Rejeitar" no dropdown, mas com separador duplo antes e depois, e com icone mais expressivo
- Adicionar texto de aviso inline: DropdownMenuItem com subtexto

```
+------------------------+
| Visualizar PDF         |
| Reclassificar job      |
|------------------------|
| Copiar ID              |
|========================|  <- separador mais espesso / margem maior
| Rejeitar NF            |  <- text-destructive, icone XCircle
+------------------------+
```

### 4.3 Coluna "Acao Rapida" para Status Auto-matched

Para NFs com `status = 'auto_matched'`, adicionar um botao "Confirmar" diretamente na linha — sem precisar abrir o modal para NFs onde o match ja foi feito automaticamente com alta confiança.

**Proposta adicional (bonus, nao critico):**

Quando `status = 'auto_matched'` e `nf.match_confidence` for alto:
- Botao inline na coluna de acoes: "Confirmar" (variant="outline", cor emerald, sem abrir modal)
- Tooltip: "Match automatico com alta confianca — clique para confirmar diretamente"
- Abre um AlertDialog minimo de confirmacao (sem o modal completo)

Quando `status = 'auto_matched'` e confianca baixa, ou `status = 'pending_review'`:
- Manter o botao "Revisar" que abre o modal completo

### 4.4 Indicador Visual de Urgencia na Tabela

NFs com mais de 7 dias sem validacao devem ter um indicador sutil:

```
| [FileText] nf-uber.pdf          |  <- linha normal
| [FileText] nf-hotel.pdf  [7d]   |  <- badge de dias se > 7 dias
```

Badge de dias:
- `Badge variant="outline"` com texto "Xd" (numero de dias desde recebimento)
- Cor: `border-amber-400 text-amber-600` se entre 7-14 dias
- Cor: `border-red-400 text-red-600` se mais de 14 dias
- Tooltip: "Recebida ha X dias — revisao pendente"
- Posicionamento: inline apos o nome do arquivo, `ml-2`

---

## 5. Proposta: Pagina Principal

### 5.1 Hierarquia do Header da Pagina

**Estado atual:**
```
Financeiro / NFs
Validacao de NFs          [Atualizar] [?]
```

**Proposta v2:**
```
Financeiro / Notas Fiscais
Validacao de NFs                              [Atualizar]
```

- Remover o botao de ajuda `[?]` do header — mover a informacao para um banner contextual ou tooltip no primeiro uso
- O breadcrumb deve usar "Notas Fiscais" por extenso (mais claro que "NFs" — padrao ELLAHOS para navegacao)
- Manter o botao "Atualizar" com `RefreshCw` (correto)

### 5.2 Stats Cards — Ajuste Visual

Os stats cards estao funcionalmente corretos mas podem ser mais legíveis:

**Ajuste no card "Pendentes" (mais urgente):**

Quando `stats.pending_review > 0`, adicionar estado de urgencia ao card:
- Dot animado (pulse) na borda esquerda: `border-l-amber-500` + `animate-pulse` na borda (nao na borda inteira, apenas em um pseudo-elemento)
- Numero com texto maior: aumentar de `text-3xl` para continuar com `text-3xl` mas adicionar `tabular-nums` para evitar salto no layout quando o numero muda
- Descricao mais acionavel: "Aguardando validacao" -> "Necessitam revisao" (mais urgente)

**Ajuste no card "Auto-matched" (pronto para confirmar):**

Quando `stats.auto_matched > 0`:
- Descricao: "Match automatico sugerido" -> "Prontas para confirmar" (mais acionavel)
- Icone: manter `Zap` mas com cor `text-emerald-500` em vez de `text-blue-500` — consistente com a mudanca semantica do modal (matched = bom = verde)

### 5.3 Barra de Filtros — Ajuste Visual

A barra de filtros esta funcionalmente correta. Ajustes esteticos menores:

- Search input: aumentar o placeholder para "Buscar por fornecedor ou arquivo..." (mais descritivo)
- Agrupar os selects com um separador visual sutil: `div` com `border-l border-zinc-200 dark:border-zinc-700 pl-2` antes do select de Status
- Botao "Limpar filtros": adicionar `text-rose-600 hover:text-rose-700 dark:text-rose-400` em vez de `text-zinc-500` — sinaliza que limpar e uma acao de reset (usa a cor accent)

---

## 6. Resumo de Mudancas por Prioridade

### Critico (implementar primeiro — resolve o "pouco intuitivo")

| # | Mudanca | Componente | Descricao |
|---|---------|------------|-----------|
| C1 | Rejeicao como Dialog separado | NfValidationDialog | Substituir inline toggle por AlertDialog sobreposto |
| C2 | Reorganizar painel direito | NfValidationDialog | Match primeiro, depois dados principais, depois adicionais |
| C3 | Footer: reordenar botoes | NfValidationDialog | ghost > outline > primary da esquerda pra direita |
| C4 | Hint no footer | NfValidationDialog | Caption explicando por que Confirmar esta desabilitado |

### Alto (implementar segundo — resolve o "pouco profissional")

| # | Mudanca | Componente | Descricao |
|---|---------|------------|-----------|
| A1 | Header do modal separado | NfValidationDialog | Titulo fixo + subtitulo com nome do arquivo + status badge |
| A2 | Badge OCR fora do input | NfValidationDialog | Mover badge para ao lado do Label, nao dentro do Input |
| A3 | Card de match com cor emerald | NfValidationDialog | Trocar azul por verde no header do card de match |
| A4 | Botao "Buscar lancamento" como primary | NfValidationDialog | Quando sem match, o botao de busca e o CTA principal |
| A5 | Botao "Revisar" na tabela com h-8 | NfDocumentTable | Corrigir area de toque e texto do botao |
| A6 | Secao colapsavel "Informacoes Adicionais" | NfValidationDialog | CNPJ + data + competencia em secao expansivel |

### Medio (polimento — refina a experiencia)

| # | Mudanca | Componente | Descricao |
|---|---------|------------|-----------|
| M1 | Badge de dias na tabela | NfDocumentTable | Indicador de urgencia para NFs antigas |
| M2 | Texto do botao Confirmar | NfValidationDialog | "Confirmar NF" em vez de "Confirmar Match" |
| M3 | Cor emerald no card de stats | NfStatsCards | Card "Auto-matched" em verde, nao azul |
| M4 | Descricoes mais acionaveis nos cards | NfStatsCards | "Prontas para confirmar", "Necessitam revisao" |
| M5 | Breadcrumb "Notas Fiscais" | page.tsx | Por extenso na navegacao |
| M6 | Textarea no dialog de rejeicao | NfValidationDialog | Minimo 80px de altura para o campo de motivo |

### Baixo (refinamento estetico)

| # | Mudanca | Componente | Descricao |
|---|---------|------------|-----------|
| B1 | Borda esquerda na toolbar do PDF | NfValidationDialog | Ancora visual sutil |
| B2 | Botao Limpar filtros em rose | page.tsx | Cor de reset mais intencional |
| B3 | Placeholder mais descritivo na busca | page.tsx | "Buscar por fornecedor ou arquivo..." |
| B4 | tabular-nums nos numeros dos cards | NfStatsCards | Evitar salto de layout ao atualizar |

---

## Notas de Implementacao para o Dev

**Ordem sugerida de implementacao:** C1 + C2 + C3 + C4 primeiro (sem eles a tela continua confusa). Depois A1 a A6 em sequencia. M e B podem ser agrupados em um unico PR de polimento.

**O que NAO mudar:**
- Estrutura split 50/50 do modal (usuario aprovou)
- Funcionalidade do iframe de PDF (esta funcionando)
- Logica de hooks (useValidateNf, useRejectNf) — mudancas sao apenas visuais
- Componente NfStatusBadge (correto)
- Componente NfStatsCards exceto os ajustes de texto e cor descritos

**Referencia de componentes shadcn/ui adicionais necessarios:**
- `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` — para a secao "Informacoes Adicionais"
- `Textarea` — para o campo de motivo de rejeicao no AlertDialog
- Os demais componentes ja estao importados

**Tokens de design system para as novas cores:**
- Emerald (matched): `text-emerald-700 dark:text-emerald-400` / `bg-emerald-50 dark:bg-emerald-950/40` / `border-emerald-200 dark:border-emerald-800`
- Border-left matched: `border-l-4 border-l-emerald-500`
- Border-left sem match: `border-l-4 border-l-amber-500`
- Botao Rejeitar no footer (outline neutro): `border-zinc-300 text-zinc-600 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:text-red-400`
