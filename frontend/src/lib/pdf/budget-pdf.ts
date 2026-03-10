// Gerador de PDF: Orcamento Comercial
// Tabela de custos agrupada por categoria + resumo financeiro

import type { JobDetail } from '@/types/jobs'
import type { CostItem } from '@/types/cost-management'
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

export interface BudgetPdfParams {
  job: JobDetail
  costItems: CostItem[]
  tenantName?: string
}

export async function generateBudgetPdf(params: BudgetPdfParams): Promise<void> {
  const { job, costItems, tenantName } = params
  const pdf = await createPdfDoc()

  const jobCode = job.job_code || job.id.slice(0, 8)
  const subtitle = tenantName
    ? `${jobCode} — ${job.title} | ${tenantName}`
    : `${jobCode} — ${job.title}`

  let y = addHeader(pdf, 'Orcamento Comercial', subtitle)

  // --- Informacoes do Job ---
  y = drawSectionTitle(pdf, 'Informacoes do Projeto', y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, COLOR.BLACK)

  const infoLines: [string, string][] = [
    ['Codigo', jobCode],
    ['Titulo', job.title],
    ['Cliente', job.clients?.name ?? '-'],
    ['Agencia', job.agencies?.name ?? '-'],
    ['Tipo', job.job_type ?? '-'],
    ['Prioridade', job.priority ?? '-'],
    ['Entrega Prevista', formatDateBR(job.expected_delivery_date)],
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

  // --- Tabela de Custos ---
  const activeItems = costItems.filter(i => i.item_status !== 'cancelado')
  if (activeItems.length > 0) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, 'Itens de Custo', y)

    const w = CONTENT_W
    const cols = [w * 0.06, w * 0.40, w * 0.10, w * 0.16, w * 0.14, w * 0.14]
    const headers = ['#', 'Descricao', 'Qtd', 'Valor Unit.', 'Total', 'Status']

    y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

    let rowIdx = 0
    let categoryTotal = 0
    let currentCategory = ''

    for (const item of activeItems) {
      if (item.is_category_header) {
        // Imprimir subtotal da categoria anterior
        if (currentCategory && categoryTotal > 0) {
          y = checkPageBreak(pdf, y, 7)
          y = drawTableRow(pdf, MARGIN.left, y,
            ['', `Subtotal ${currentCategory}`, '', '', formatBRL(categoryTotal), ''],
            cols, 7, { fontSize: 8, altRow: true })
        }
        currentCategory = item.service_description
        categoryTotal = 0

        // Linha de categoria (negrito)
        y = checkPageBreak(pdf, y, 8)
        setFill(pdf, '#e8e8e8')
        setDraw(pdf, COLOR.BORDER)
        pdf.rect(MARGIN.left, y, w, 7, 'FD')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        setText(pdf, COLOR.TITLE)
        pdf.text(`${item.item_number}. ${item.service_description}`, MARGIN.left + 3, y + 4.5)
        y += 7
        rowIdx = 0
        continue
      }

      categoryTotal += item.total_with_overtime
      y = checkPageBreak(pdf, y, 7)

      const itemNum = `${item.item_number}.${item.sub_item_number}`
      const statusMap: Record<string, string> = {
        orcado: 'Orcado',
        aguardando_nf: 'Ag. NF',
        nf_pedida: 'NF Pedida',
        nf_recebida: 'NF Recebida',
        nf_aprovada: 'NF Aprovada',
        pago: 'Pago',
        cancelado: 'Cancelado',
      }

      y = drawTableRow(pdf, MARGIN.left, y,
        [
          itemNum,
          item.service_description,
          String(item.quantity),
          formatBRL(item.unit_value),
          formatBRL(item.total_with_overtime),
          statusMap[item.item_status] ?? item.item_status,
        ],
        cols, 7, { fontSize: 8, altRow: rowIdx % 2 === 1 })

      rowIdx++
    }

    // Subtotal ultima categoria
    if (currentCategory && categoryTotal > 0) {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(pdf, MARGIN.left, y,
        ['', `Subtotal ${currentCategory}`, '', '', formatBRL(categoryTotal), ''],
        cols, 7, { fontSize: 8, altRow: true })
    }

    y += 4
  }

  // --- Resumo Financeiro ---
  y = checkPageBreak(pdf, y, 50)
  y = drawSectionTitle(pdf, 'Resumo Financeiro', y)

  const totalEstimated = activeItems
    .filter(i => !i.is_category_header)
    .reduce((sum, i) => sum + i.total_with_overtime, 0)

  const totalPaid = activeItems
    .filter(i => !i.is_category_header && i.payment_status === 'pago')
    .reduce((sum, i) => sum + (i.actual_paid_value ?? i.total_with_overtime), 0)

  const summaryItems: [string, string][] = [
    ['Total Estimado', formatBRL(totalEstimated)],
    ['Total Pago', formatBRL(totalPaid)],
    ['Valor Fechado', formatBRL(job.closed_value)],
    ['Imposto (%)', job.tax_percentage != null ? `${job.tax_percentage}%` : '-'],
    ['Imposto (R$)', formatBRL(job.tax_value)],
    ['Lucro Bruto', formatBRL(job.gross_profit)],
    ['Margem', job.margin_percentage != null ? `${job.margin_percentage.toFixed(1)}%` : '-'],
  ]

  const sumColW = CONTENT_W / 2
  const sumCols = [sumColW * 0.5, sumColW * 0.5]

  for (const [label, value] of summaryItems) {
    y = checkPageBreak(pdf, y, 7)
    y = drawTableRow(pdf, MARGIN.left, y, [label, value], sumCols, 7, { fontSize: 9 })
  }

  // Footer
  addFooters(pdf, `Orcamento ${jobCode}`)

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  savePdf(pdf, `orcamento_${jobCode}_${today}.pdf`)
}
