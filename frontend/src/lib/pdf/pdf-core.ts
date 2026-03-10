// Utilitarios compartilhados para geracao de PDF
// Baseado no padrao de od-pdf-generator.ts

import type { jsPDF as JsPDFType } from 'jspdf'

export type PDF = JsPDFType

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------
export const COLOR = {
  HEADER_BG:  '#1a1a2e',
  TABLE_HEAD: '#f0f0f0',
  TABLE_ALT:  '#fafafa',
  BORDER:     '#cccccc',
  TITLE:      '#333333',
  MUTED:      '#666666',
  WHITE:      '#ffffff',
  BLACK:      '#000000',
  FOOTER:     '#888888',
} as const

// ---------------------------------------------------------------------------
// Layout A4
// ---------------------------------------------------------------------------
export const MARGIN = { top: 20, bottom: 20, left: 15, right: 15 } as const
export const PAGE_W = 210
export const PAGE_H = 297
export const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right
export const BOTTOM_LIMIT = PAGE_H - MARGIN.bottom

// ---------------------------------------------------------------------------
// Helpers de cor
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ]
}

export function setFill(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setFillColor(r, g, b)
}

export function setDraw(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setDrawColor(r, g, b)
}

export function setText(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setTextColor(r, g, b)
}

// ---------------------------------------------------------------------------
// Formatacao
// ---------------------------------------------------------------------------

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatTimeBR(timeStr: string | null | undefined): string {
  if (!timeStr) return '-'
  // "HH:MM:SS" -> "HH:MM"
  return timeStr.slice(0, 5)
}

export function formatDateTime(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function checkPageBreak(pdf: PDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_LIMIT) {
    pdf.addPage()
    return MARGIN.top
  }
  return y
}

export function addWrappedText(
  pdf: PDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 5,
): number {
  const lines = pdf.splitTextToSize(text || '', maxW)
  for (const line of lines) {
    y = checkPageBreak(pdf, y, lineH + 2)
    pdf.text(line as string, x, y)
    y += lineH
  }
  return y
}

export function drawTableRow(
  pdf: PDF,
  x: number,
  y: number,
  cells: string[],
  widths: number[],
  rowH: number,
  opts?: { isHeader?: boolean; fontSize?: number; altRow?: boolean },
): number {
  const { isHeader = false, fontSize = 9, altRow = false } = opts ?? {}
  const cellPad = 3
  const totalW = widths.reduce((a, b) => a + b, 0)

  if (isHeader) {
    setFill(pdf, COLOR.TABLE_HEAD)
  } else if (altRow) {
    setFill(pdf, COLOR.TABLE_ALT)
  } else {
    setFill(pdf, COLOR.WHITE)
  }
  setDraw(pdf, COLOR.BORDER)
  pdf.rect(x, y, totalW, rowH, 'FD')

  pdf.setFontSize(fontSize)

  if (isHeader) {
    pdf.setFont('helvetica', 'bold')
    setText(pdf, COLOR.TITLE)
  } else {
    pdf.setFont('helvetica', 'normal')
    setText(pdf, COLOR.BLACK)
  }

  let curX = x
  for (let i = 0; i < cells.length; i++) {
    if (i > 0) {
      setDraw(pdf, COLOR.BORDER)
      pdf.line(curX, y, curX, y + rowH)
    }
    const cellLines = pdf.splitTextToSize(cells[i] || '', widths[i] - cellPad * 2) as string[]
    const textY = y + (rowH + fontSize * 0.352) / 2
    pdf.text(cellLines[0] || '', curX + cellPad, textY)
    curX += widths[i]
  }

  return y + rowH
}

export function drawSectionTitle(pdf: PDF, label: string, y: number): number {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setText(pdf, COLOR.TITLE)
  pdf.text(label.toUpperCase(), MARGIN.left, y)
  y += 1.5
  setDraw(pdf, COLOR.BORDER)
  pdf.line(MARGIN.left, y, MARGIN.left + CONTENT_W, y)
  return y + 4
}

export function addHeader(pdf: PDF, title: string, subtitle?: string): number {
  // Faixa escura no topo
  setFill(pdf, COLOR.HEADER_BG)
  pdf.rect(0, 0, PAGE_W, 28, 'F')

  // ELLAHOS
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  setText(pdf, COLOR.WHITE)
  pdf.text('ELLAHOS', MARGIN.left, 14)

  // Titulo do documento
  pdf.setFontSize(11)
  pdf.text(title.toUpperCase(), PAGE_W - MARGIN.right, 12, { align: 'right' })

  // Subtitulo (opcional)
  if (subtitle) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(subtitle, PAGE_W - MARGIN.right, 20, { align: 'right' })
  }

  return 38 // y apos header
}

export function addFooters(pdf: PDF, docTitle: string) {
  const total = pdf.getNumberOfPages()
  const generatedAt = formatDateTime()

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    setText(pdf, COLOR.FOOTER)

    const footerY = PAGE_H - 8
    pdf.text(`Gerado por ELLAHOS — ${docTitle}`, MARGIN.left, footerY)
    pdf.text(generatedAt, PAGE_W / 2, footerY, { align: 'center' })
    pdf.text(`Pagina ${i} de ${total}`, PAGE_W - MARGIN.right, footerY, { align: 'right' })

    setDraw(pdf, COLOR.BORDER)
    pdf.line(MARGIN.left, footerY - 3, PAGE_W - MARGIN.right, footerY - 3)
  }
}

export async function createPdfDoc(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<PDF> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  pdf.setLineWidth(0.2)
  return pdf
}

export function savePdf(pdf: PDF, filename: string) {
  pdf.save(filename)
}
