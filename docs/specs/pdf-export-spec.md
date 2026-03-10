# Especificacao: Export PDF (3 tipos)

**ADR:** ADR-031-pdf-export-client-side.md
**Status:** Pronto para implementacao
**Data:** 10/03/2026

---

## Visao Geral

3 funcoes utilitarias que geram PDF a partir de dados ja carregados na pagina.
Sem Edge Function nova. Sem dependencia nova. jsPDF programatico (vetorial).

---

## Arquitetura de Arquivos

```
frontend/src/lib/pdf/
  pdf-core.ts          -- helpers compartilhados
  budget-pdf.ts        -- generateBudgetPdf()
  callsheet-pdf.ts     -- generateCallsheetPdf()
  set-report-pdf.ts    -- generateSetReportPdf()
```

---

## 1. pdf-core.ts -- Helpers Compartilhados

### Responsabilidades

- `createPdfDoc(orientation?)` -- cria instancia jsPDF com config padrao (A4, mm, pt-BR)
- `addHeader(doc, title, subtitle?, logoBase64?)` -- header ELLAHOS com logo + titulo do documento + nome do job
- `addFooter(doc, pageNum, totalPages)` -- rodape com "Gerado em DD/MM/YYYY HH:MM | Pagina X de Y | ELLAHOS - Confidencial"
- `addWrappedText(doc, text, x, y, maxWidth)` -- texto com quebra de linha automatica, retorna novo Y
- `drawTable(doc, headers, rows, startY, options?)` -- tabela simples com header cinza, linhas alternadas, retorna novo Y
- `addSectionTitle(doc, title, y)` -- titulo de secao (negrito, linha horizontal abaixo)
- `checkPageBreak(doc, currentY, neededHeight)` -- verifica se precisa nova pagina, adiciona footer + header se sim
- `formatBRL(value)` -- formata numero como "R$ 1.234,56"
- `formatDateBR(dateStr)` -- formata ISO date como "10/03/2026"
- `formatTimeBR(timeStr)` -- formata "HH:MM:SS" como "HH:MM"
- `downloadPdf(doc, filename)` -- salva e faz download

### Logo ELLAHOS

- Por ora, texto "ELLAHOS" em fonte bold 18pt como placeholder
- Futuramente: base64 do logo SVG como constante no arquivo
- Cor do header: fundo escuro (#1a1a2e) com texto branco

### Configuracao Padrao

```
Pagina: A4 (210mm x 297mm)
Margens: top 20mm, bottom 20mm, left 15mm, right 15mm
Area util: 180mm largura x 257mm altura
Fonte base: Helvetica 10pt
Titulo: Helvetica-Bold 14pt
Subtitulo: Helvetica 11pt
Tabela header: Helvetica-Bold 9pt, fundo #f0f0f0
Tabela body: Helvetica 9pt, linhas alternadas #fafafa/#ffffff
Footer: Helvetica 8pt, cor #888888
```

---

## 2. budget-pdf.ts -- Orcamento Comercial

### Funcao

```typescript
generateBudgetPdf(params: {
  job: JobDetail
  costItems: CostItem[]
  budgetSummary?: BudgetSummary
  tenantName?: string
}): void
```

### Fonte dos Dados

| Dado | Origem | Hook/variavel |
|------|--------|---------------|
| Job (titulo, codigo, cliente, agencia) | `JobDetail` | `useJob(jobId)` -- ja carregado na pagina |
| Cost items agrupados | `CostItem[]` | `useCostItems({ job_id })` -- ja carregado em `/custos` |
| Resumo orcamentario | `BudgetSummary` | `useBudgetSummary(jobId)` -- ja carregado em `/orcamento` |

### Layout do PDF (secoes)

```
+----------------------------------------------------------+
|  [LOGO ELLAHOS]              ORCAMENTO COMERCIAL          |
|  {tenant_name}                                            |
+----------------------------------------------------------+
|                                                          |
|  INFORMACOES DO JOB                                      |
|  Job: {job_code} - {title}                               |
|  Cliente: {clients.name}                                 |
|  Agencia: {agencies.name}                                |
|  Tipo: {job_type}                                        |
|  Data prevista de entrega: {expected_delivery_date}      |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  CUSTOS POR CATEGORIA                                    |
|  +------+---------------------------+--------+--------+ |
|  | Item | Descricao                 |  Qtd   |  Total  | |
|  +------+---------------------------+--------+--------+ |
|  | 1    | EQUIPE (subtotal)         |        | 45.000  | |
|  | 1.1  | Diretor                   |  1     | 15.000  | |
|  | 1.2  | DOP                       |  1     | 12.000  | |
|  | 1.3  | Editor                    |  1     |  8.000  | |
|  | ...  | ...                       |  ...   |  ...    | |
|  +------+---------------------------+--------+--------+ |
|  | 2    | EQUIPAMENTO (subtotal)    |        | 18.000  | |
|  | ...  | ...                       |  ...   |  ...    | |
|  +------+---------------------------+--------+--------+ |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  RESUMO FINANCEIRO                                       |
|  Valor total estimado:         R$ 120.000,00             |
|  Impostos ({tax_percentage}%): R$  14.400,00             |
|  Valor fechado:                R$ 150.000,00             |
|  Margem bruta:                 R$  15.600,00 (10,4%)     |
|                                                          |
+----------------------------------------------------------+
|  Gerado em 10/03/2026 14:30 | Pag 1/1 | ELLAHOS         |
+----------------------------------------------------------+
```

### Regras de Negocio

- Cost items com `is_category_header = true` sao linhas de subtotal (negrito, fundo cinza claro)
- Cost items com `item_status = 'cancelado'` nao aparecem no PDF
- Valores financeiros formatados em BRL
- Se `budgetSummary` disponivel, usar dados agregados; senao, calcular do array de cost items
- **NAO incluir:** vendor_name, payment_status, NF details (dados internos)
- Nome do arquivo: `orcamento_{job_code}_{YYYYMMDD}.pdf`

### Onde fica o botao

**Pagina:** `/jobs/[id]/financeiro/custos` (page.tsx)
**Posicao:** Ao lado do botao "Exportar CSV" existente
**Label:** "Exportar PDF"
**Icone:** `FileDown` (lucide-react)

Tambem pode ir na pagina `/jobs/[id]/financeiro/orcamento` (page.tsx), no header, ao lado do titulo "Orcamento".

---

## 3. callsheet-pdf.ts -- Callsheet de Diaria

### Funcao

```typescript
generateCallsheetPdf(params: {
  job: JobDetail
  shootingDate: JobShootingDate
  team: JobTeamMember[]
  tenantName?: string
}): void
```

### Fonte dos Dados

| Dado | Origem | Hook/variavel |
|------|--------|---------------|
| Job (titulo, codigo, cliente) | `JobDetail` | `useJob(jobId)` -- ja carregado |
| Diaria especifica | `JobShootingDate` | `useJobShootingDates(jobId)` -- ja carregado em TabDiarias |
| Equipe do job | `JobTeamMember[]` | `job.team` do JobDetail (include=team) |

### Layout do PDF (secoes)

```
+----------------------------------------------------------+
|  [LOGO ELLAHOS]                 CALLSHEET                 |
|  {tenant_name}                                            |
+----------------------------------------------------------+
|                                                          |
|  PRODUCAO                                                |
|  Job: {job_code} - {title}                               |
|  Cliente: {clients.name}                                 |
|  Data: {shooting_date} ({dia_semana})                    |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  LOCACAO E HORARIOS                                      |
|  Local: {location}                                       |
|  Inicio: {start_time}                                    |
|  Fim previsto: {end_time}                                |
|  Descricao: {description}                                |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  EQUIPE                                                  |
|  +----+--------------------+-----------------+----------+|
|  | #  | Nome               | Funcao          | Status   ||
|  +----+--------------------+-----------------+----------+|
|  | 1  | Joao Silva         | Diretor         | Confirm. ||
|  | 2  | Maria Santos       | DOP             | Confirm. ||
|  | 3  | Pedro Lima         | 1o Assistente   | Orcado   ||
|  | ...| ...                | ...             | ...      ||
|  +----+--------------------+-----------------+----------+|
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  OBSERVACOES                                             |
|  {description da diaria, se houver}                      |
|                                                          |
+----------------------------------------------------------+
|  Gerado em 10/03/2026 14:30 | Pag 1/1 | ELLAHOS         |
+----------------------------------------------------------+
```

### Regras de Negocio

- `team` filtrado apenas por membros com `hiring_status != 'cancelado'`
- Funcao: traduzir TeamRole enum para label legivel (ex: `diretor` -> "Diretor", `dop` -> "Diretor de Fotografia")
- HiringStatus traduzido: `confirmado` -> "Confirmado", `orcado` -> "Orcado", `proposta_enviada` -> "Proposta enviada"
- Se nao tem equipe, mostrar secao vazia com "(Nenhum membro de equipe cadastrado)"
- Se nao tem locacao, mostrar "A definir"
- Dia da semana: calcular a partir da data (ex: "Terca-feira")
- Nome do arquivo: `callsheet_{job_code}_{YYYYMMDD}.pdf`

### Onde fica o botao

**Pagina:** Tab "Diarias" do job detail (TabDiarias.tsx)
**Posicao:** No menu de acoes (DropdownMenu) de cada diaria -- novo item "Exportar Callsheet PDF"
**Icone:** `FileDown` (lucide-react)

---

## 4. set-report-pdf.ts -- Relatorio de Set

### Funcao

```typescript
generateSetReportPdf(params: {
  job: JobDetail
  entry: DiaryEntry
  tenantName?: string
}): void
```

### Fonte dos Dados

| Dado | Origem | Hook/variavel |
|------|--------|---------------|
| Job (titulo, codigo) | `JobDetail` | `useJob(jobId)` -- ja carregado |
| Entrada do diario | `DiaryEntry` | `useProductionDiaryList(jobId)` -- ja carregado em TabProductionDiary |

### Layout do PDF (secoes)

```
+----------------------------------------------------------+
|  [LOGO ELLAHOS]            RELATORIO DE SET               |
|  {tenant_name}              Dia {day_number}              |
+----------------------------------------------------------+
|                                                          |
|  INFORMACOES GERAIS                                      |
|  Job: {job_code} - {title}                               |
|  Data: {shooting_date}                                   |
|  Locacao: {location}                                     |
|  Clima: {weather_condition_label}                        |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  HORARIOS                                                |
|  Chamada: {call_time}     Almoco: {lunch_time}           |
|  Filmagem: {filming_start_time}  Wrap: {wrap_time}       |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  CENAS                                                   |
|  Planejadas: {planned_scenes}                            |
|  Filmadas: {filmed_scenes}                               |
|  Total de takes: {total_takes}                           |
|                                                          |
|  (Se scenes_list preenchida:)                            |
|  +------+-----------------------+-------+--------+------+|
|  | Cena | Descricao             | Takes | OK     | Stat ||
|  +------+-----------------------+-------+--------+------+|
|  | 3    | Abertura parque       |  5    | Take 3 | OK   ||
|  | 4A   | Dialogo cafe          |  8    | Take 6 | OK   ||
|  | 5    | -                     |  0    | -      | N/G  ||
|  +------+-----------------------+-------+--------+------+|
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  OCORRENCIAS E DESTAQUES                                 |
|  [Se issues:] Problemas: {issues}                        |
|  [Se highlights:] Destaques: {highlights}                |
|  [Se observations:] Observacoes: {observations}          |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  PRESENCA DA EQUIPE (se attendance_list preenchida)      |
|  +----+--------------------+-----------+--------+-------+|
|  | #  | Nome               | Funcao    | Pres.  | Hora  ||
|  +----+--------------------+-----------+--------+-------+|
|  | 1  | Joao Silva         | Diretor   | Sim    | 06:30 ||
|  | 2  | Maria Santos       | DOP       | Sim    | 06:45 ||
|  | 3  | Pedro Lima         | 1oAD      | Nao    | -     ||
|  +----+--------------------+-----------+--------+-------+|
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  EQUIPAMENTOS (se equipment_list preenchida)             |
|  +----+------------------------+------+----------------+ |
|  | #  | Equipamento            | Qtd  | Obs            | |
|  +----+------------------------+------+----------------+ |
|  | 1  | Camera RED V-Raptor    | 2    | -              | |
|  | 2  | Lente Cooke S7i 32mm   | 4    | Kit completo   | |
|  +----+------------------------+------+----------------+ |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  BOLETIM DE PRODUCAO (se executive_summary preenchido)   |
|  Status do dia: {day_status_label}                       |
|  Resumo executivo: {executive_summary}                   |
|  Proximos passos: {next_steps}                           |
|  Assinatura diretor: {director_signature}                |
|                                                          |
+----------------------------------------------------------+
|  Gerado em 10/03/2026 14:30 | Pag 1/2 | ELLAHOS         |
+----------------------------------------------------------+
```

### Regras de Negocio

- Secoes opcionais: so aparecem se os dados existem (scenes_list, attendance_list, equipment_list, boletim)
- WeatherCondition traduzida: `sol` -> "Ensolarado", `nublado` -> "Nublado", etc.
- SceneStatus traduzida: `ok` -> "OK", `incompleta` -> "Incompleta", `nao_gravada` -> "Nao gravada"
- DayStatus traduzida: `no_cronograma` -> "No cronograma", `adiantado` -> "Adiantado", `atrasado` -> "Atrasado"
- Fotos: NAO incluir no PDF v1 (thumbnails via URL requerem fetch async + base64, complexidade desnecessaria agora)
- Horarios: normalizar "HH:MM:SS" para "HH:MM"
- Nome do arquivo: `relatorio_set_{job_code}_dia{day_number}_{YYYYMMDD}.pdf`

### Onde fica o botao

**Pagina:** Tab "Relatorio de Set" do job detail (TabProductionDiary.tsx)
**Posicao:** Nos botoes de acao de cada entry (ao lado de Editar/Remover)
**Label:** "Exportar PDF" ou icone `FileDown`

---

## Resumo: Mapa de Botoes

| PDF | Pagina | Componente | Posicao |
|-----|--------|-----------|---------|
| Orcamento Comercial | `/jobs/[id]/financeiro/custos` | `page.tsx` | Ao lado de "Exportar CSV" |
| Callsheet | Tab Diarias | `TabDiarias.tsx` | DropdownMenu de cada diaria |
| Relatorio de Set | Tab Relatorio de Set | `TabProductionDiary.tsx` | Botoes de acao de cada entry |

---

## Estimativa de Implementacao

| Arquivo | Complexidade | Linhas estimadas |
|---------|-------------|-----------------|
| `pdf-core.ts` | Media | ~200 |
| `budget-pdf.ts` | Media | ~120 |
| `callsheet-pdf.ts` | Baixa | ~100 |
| `set-report-pdf.ts` | Media-Alta | ~160 |
| Integracao botoes (3 files) | Baixa | ~60 total |

**Total estimado:** ~640 linhas de codigo
**Sprints:** 1 sprint (implementacao + teste manual)

---

## Checklist de Implementacao

- [ ] 1. Criar `frontend/src/lib/pdf/pdf-core.ts`
- [ ] 2. Criar `frontend/src/lib/pdf/budget-pdf.ts`
- [ ] 3. Criar `frontend/src/lib/pdf/callsheet-pdf.ts`
- [ ] 4. Criar `frontend/src/lib/pdf/set-report-pdf.ts`
- [ ] 5. Adicionar botao em `/custos/page.tsx`
- [ ] 6. Adicionar item no dropdown em `TabDiarias.tsx`
- [ ] 7. Adicionar botao em `TabProductionDiary.tsx`
- [ ] 8. Teste manual: gerar os 3 PDFs com dados reais
- [ ] 9. Verificar: pagebreak, caracteres especiais, valores negativos
