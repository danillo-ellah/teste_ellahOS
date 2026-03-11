// Gerador de PDF: Orcamento Pre-Job (Oportunidade CRM)
// Tabela de categorias com valor e notas + total

import {
  createPdfDoc,
  addHeader,
  addFooters,
  savePdf,
  drawSectionTitle,
  drawTableRow,
  checkPageBreak,
  formatBRL,
  formatDateBR,
  setText,
  setFill,
  setDraw,
  COLOR,
  MARGIN,
  CONTENT_W,
} from './pdf-core'

export interface OpportunityBudgetPdfParams {
  opportunityTitle: string
  clientName: string | null
  agencyName: string | null
  orcCode: string | null
  version: number
  versionDate: string
  items: Array<{
    item_number: number
    display_name: string
    value: number
    notes: string | null
  }>
  totalValue: number
  tenantName?: string
}

export async function generateOpportunityBudgetPdf(
  params: OpportunityBudgetPdfParams,
): Promise<void> {
  const {
    opportunityTitle,
    clientName,
    agencyName,
    orcCode,
    version,
    versionDate,
    items,
    totalValue,
    tenantName,
  } = params

  const pdf = await createPdfDoc()

  // Subtitulo do header: ORC code + versao, ou so o titulo
  const codeLabel = orcCode ?? 'ORC sem codigo'
  const subtitle = tenantName
    ? `${codeLabel} — v${version} | ${tenantName}`
    : `${codeLabel} — v${version}`

  let y = addHeader(pdf, 'Orcamento Comercial', subtitle)

  // --- Informacoes do Orcamento ---
  y = drawSectionTitle(pdf, 'Informacoes do Orcamento', y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, COLOR.BLACK)

  const infoLines: [string, string][] = [
    ['Codigo', orcCode ?? '-'],
    ['Titulo', opportunityTitle],
    ['Cliente', clientName ?? '-'],
    ['Agencia', agencyName ?? '-'],
    ['Versao', `v${version}`],
    ['Data', formatDateBR(versionDate)],
  ]

  for (const [label, value] of infoLines) {
    y = checkPageBreak(pdf, y, 6)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${label}:`, MARGIN.left, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, MARGIN.left + 35, y)
    y += 5
  }
  y += 4

  // --- Tabela de Categorias ---
  // Filtra apenas itens com valor preenchido
  const filledItems = items.filter((i) => i.value > 0)

  y = checkPageBreak(pdf, y, 20)
  y = drawSectionTitle(pdf, 'Categorias de Custo', y)

  // Larguras das colunas: # | Categoria | Valor | Notas
  const w = CONTENT_W
  const cols = [w * 0.07, w * 0.40, w * 0.18, w * 0.35]
  const headers = ['#', 'Categoria', 'Valor (R$)', 'Notas']

  y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

  if (filledItems.length === 0) {
    // Nenhuma categoria preenchida — exibe todos os itens zerados
    let rowIdx = 0
    for (const item of items) {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(
        pdf,
        MARGIN.left,
        y,
        [
          String(item.item_number),
          item.display_name,
          '—',
          item.notes ?? '—',
        ],
        cols,
        7,
        { fontSize: 8, altRow: rowIdx % 2 === 1 },
      )
      rowIdx++
    }
  } else {
    // Exibe apenas itens com valor > 0
    let rowIdx = 0
    for (const item of filledItems) {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(
        pdf,
        MARGIN.left,
        y,
        [
          String(item.item_number),
          item.display_name,
          formatBRL(item.value),
          item.notes ?? '—',
        ],
        cols,
        7,
        { fontSize: 8, altRow: rowIdx % 2 === 1 },
      )
      rowIdx++
    }
  }

  // Linha de TOTAL
  y = checkPageBreak(pdf, y, 8)
  setFill(pdf, '#e8e8e8')
  setDraw(pdf, COLOR.BORDER)
  pdf.rect(MARGIN.left, y, w, 8, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  setText(pdf, COLOR.TITLE)
  pdf.text('TOTAL', MARGIN.left + 3, y + 5.2)
  // Valor total alinhado a direita dentro da coluna de valor
  const valueColX = MARGIN.left + cols[0] + cols[1]
  const valueColW = cols[2]
  pdf.text(formatBRL(totalValue), valueColX + valueColW - 3, y + 5.2, { align: 'right' })
  y += 8

  y += 4

  // Footer
  const docTitle = orcCode ? `Orcamento ${orcCode} v${version}` : `Orcamento v${version}`
  addFooters(pdf, docTitle)

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const fileCode = orcCode ? orcCode.replace(/[^a-zA-Z0-9]/g, '_') : 'orc'
  savePdf(pdf, `orcamento_${fileCode}_v${version}_${today}.pdf`)
}
