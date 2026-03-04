// Gerador de PDF para Ordem do Dia
// Usa apenas jsPDF (sem jspdf-autotable) — todas as tabelas desenhadas manualmente.

import type { jsPDF as JsPDFType } from 'jspdf'
import type { ShootingDayOrder, CrewCall, FilmingBlock, CastScheduleEntry } from '@/types/shooting-day-order'

// Alias para nao repetir o tipo longo em cada funcao
type PDF = JsPDFType

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------
const COLOR_HEADER_BG = '#f5f5f5'   // cinza claro para cabecalho de tabelas
const COLOR_BORDER    = '#cccccc'   // borda de celulas/retangulos
const COLOR_TITLE     = '#333333'   // titulos de secao
const COLOR_MUTED     = '#666666'   // texto secundario
const COLOR_WHITE     = '#ffffff'
const COLOR_BLOCK_BG  = '#fafafa'   // fundo de bloco de filmagem

// ---------------------------------------------------------------------------
// Constantes de layout
// ---------------------------------------------------------------------------
const MARGIN_TOP    = 15  // mm
const MARGIN_LEFT   = 15  // mm
const MARGIN_RIGHT  = 15  // mm
const MARGIN_BOTTOM = 20  // mm
const PAGE_WIDTH    = 210 // mm (A4)
const PAGE_HEIGHT   = 297 // mm (A4)
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT  // 180mm
const BOTTOM_LIMIT  = PAGE_HEIGHT - MARGIN_BOTTOM              // 277mm

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [r, g, b]
}

function setFillColor(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setFillColor(r, g, b)
}

function setDrawColor(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setDrawColor(r, g, b)
}

function setTextColor(pdf: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  pdf.setTextColor(r, g, b)
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateTime(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Verifica se ha espaco para 'needed' mm; se nao, adiciona pagina e retorna nova posicao y. */
function checkPageBreak(pdf: PDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_LIMIT) {
    pdf.addPage()
    return MARGIN_TOP
  }
  return y
}

/**
 * Adiciona texto com quebra de linha automatica.
 * Retorna o novo y apos o texto.
 */
function addWrappedText(
  pdf: PDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
): number {
  const lines = pdf.splitTextToSize(text || '', maxWidth)
  for (const line of lines) {
    y = checkPageBreak(pdf, y, lineHeight + 2)
    pdf.text(line as string, x, y)
    y += lineHeight
  }
  return y
}

/**
 * Desenha uma linha de tabela com celulas.
 * cells: textos, widths: larguras em mm, isHeader: pinta fundo cinza.
 * Retorna o novo y (y + rowHeight).
 */
function drawTableRow(
  pdf: PDF,
  x: number,
  y: number,
  cells: string[],
  widths: number[],
  rowHeight: number,
  isHeader: boolean,
  fontSize = 9,
): number {
  const cellPad = 3  // padding horizontal interno
  const totalW = widths.reduce((a, b) => a + b, 0)

  if (isHeader) {
    setFillColor(pdf, COLOR_HEADER_BG)
  } else {
    setFillColor(pdf, COLOR_WHITE)
  }
  setDrawColor(pdf, COLOR_BORDER)
  pdf.rect(x, y, totalW, rowHeight, 'FD')

  pdf.setFontSize(fontSize)

  if (isHeader) {
    pdf.setFont('helvetica', 'bold')
    setTextColor(pdf, COLOR_TITLE)
  } else {
    pdf.setFont('helvetica', 'normal')
    setTextColor(pdf, '#000000')
  }

  let curX = x
  for (let i = 0; i < cells.length; i++) {
    // Separador vertical entre celulas (exceto a primeira)
    if (i > 0) {
      setDrawColor(pdf, COLOR_BORDER)
      pdf.line(curX, y, curX, y + rowHeight)
    }
    const cellLines = pdf.splitTextToSize(cells[i] || '', widths[i] - cellPad * 2) as string[]
    // Centraliza verticalmente o texto na celula (primeira linha)
    const textY = y + (rowHeight + fontSize * 0.352) / 2
    pdf.text(cellLines[0] || '', curX + cellPad, textY)
    curX += widths[i]
  }

  return y + rowHeight
}

/** Desenha cabecalho de secao (texto em maiusculo, negrito, cor titulo). */
function drawSectionHeader(pdf: PDF, label: string, y: number): number {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setTextColor(pdf, COLOR_TITLE)
  pdf.text(label.toUpperCase(), MARGIN_LEFT, y)
  y += 1.5
  setDrawColor(pdf, COLOR_BORDER)
  pdf.line(MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y)
  return y + 4
}

// ---------------------------------------------------------------------------
// Secoes do PDF
// ---------------------------------------------------------------------------

/** 1. Cabecalho da OD */
function drawHeader(pdf: PDF, od: ShootingDayOrder, y: number): number {
  // Titulo grande
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  setTextColor(pdf, COLOR_TITLE)
  pdf.text('ORDEM DO DIA', MARGIN_LEFT, y)

  // Badge template no canto direito
  const templateLabel = od.pdf_template === 'moderno' ? 'MODERNO' : 'CLASSICO'
  pdf.setFontSize(8)
  setTextColor(pdf, COLOR_MUTED)
  pdf.text(templateLabel, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' })

  y += 8

  // Subtitulo: nome da OD
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  setTextColor(pdf, '#111111')
  pdf.text(od.title || 'Ordem do Dia', MARGIN_LEFT, y)
  y += 7

  // Detalhes
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  setTextColor(pdf, '#333333')

  const dateBR = od.shooting_date_id ? formatDateBR(od.created_at) : ''
  const dayLabel = od.day_number ? `Dia ${od.day_number}` : ''
  const dateStr = [dateBR, dayLabel].filter(Boolean).join(' — ')

  if (dateStr) {
    pdf.text(`Data: ${dateStr}`, MARGIN_LEFT, y)
    y += 5.5
  }

  if (od.general_location) {
    pdf.text(`Local Geral: ${od.general_location}`, MARGIN_LEFT, y)
    y += 5.5
  }

  if (od.weather_summary) {
    pdf.setFont('helvetica', 'italic')
    setTextColor(pdf, COLOR_MUTED)
    pdf.text(`Clima: ${od.weather_summary}`, MARGIN_LEFT, y)
    pdf.setFont('helvetica', 'normal')
    setTextColor(pdf, '#333333')
    y += 5.5
  }

  y += 2
  // Linha separadora
  setDrawColor(pdf, COLOR_BORDER)
  pdf.setLineWidth(0.5)
  pdf.line(MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y)
  pdf.setLineWidth(0.2)
  y += 6

  return y
}

/** 2. Cronograma do dia — faixa cinza com horarios chave */
function drawTimeline(pdf: PDF, od: ShootingDayOrder, y: number): number {
  const items: Array<[string, string | null]> = [
    ['1a Chamada', od.first_call],
    ['Chamada Producao', od.production_call],
    ['Inicio Filmagem', od.filming_start],
    ['Cafe da Manha', od.breakfast_time],
    ['Almoco', od.lunch_time],
    ['Camera Wrap', od.camera_wrap],
    ['Desproducao', od.deproduction],
  ]

  const populated = items.filter(([, v]) => v)
  if (populated.length === 0) return y

  y = checkPageBreak(pdf, y, 24)
  y = drawSectionHeader(pdf, 'Cronograma do Dia', y)

  // Fundo cinza para a faixa de timeline
  setFillColor(pdf, COLOR_HEADER_BG)
  setDrawColor(pdf, COLOR_BORDER)
  pdf.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 14, 'FD')

  pdf.setFontSize(9)
  setTextColor(pdf, '#333333')

  // Dividir em 2 linhas de ate 4 items cada
  const row1 = populated.slice(0, 4)
  const row2 = populated.slice(4)

  const colW = CONTENT_WIDTH / 4
  const y1 = y + 4
  const y2 = y + 10

  row1.forEach(([label, val], i) => {
    const tx = MARGIN_LEFT + i * colW + 3
    pdf.setFont('helvetica', 'bold')
    pdf.text(label + ':', tx, y1)
    pdf.setFont('helvetica', 'normal')
    pdf.text(val || '', tx, y1 + 4)
  })

  row2.forEach(([label, val], i) => {
    const tx = MARGIN_LEFT + i * colW + 3
    pdf.setFont('helvetica', 'bold')
    pdf.text(label + ':', tx, y2)
    pdf.setFont('helvetica', 'normal')
    pdf.text(val || '', tx, y2 + 4)
  })

  y += 14 + 6
  return y
}

/** 3. Tabela de chamadas por departamento (2 colunas para economizar espaco) */
function drawCrewCalls(pdf: PDF, crewCalls: CrewCall[], y: number): number {
  if (!crewCalls || crewCalls.length === 0) return y

  const ROW_H = 7
  const dataRows = Math.ceil(crewCalls.length / 2)
  const estimatedHeight = 16 + (dataRows + 1) * ROW_H
  y = checkPageBreak(pdf, y, estimatedHeight)
  y = drawSectionHeader(pdf, 'Chamada por Departamento', y)

  // 2 pares de colunas: [Departamento | Horario | Departamento | Horario]
  const halfW = CONTENT_WIDTH / 2
  const col1 = halfW * 0.7  // departamento esquerda
  const col2 = halfW * 0.3  // horario esquerda
  const col3 = halfW * 0.7  // departamento direita
  const col4 = halfW * 0.3  // horario direita

  const x = MARGIN_LEFT
  let curY = y
  curY = drawTableRow(pdf, x, curY,
    ['Departamento', 'Horario', 'Departamento', 'Horario'],
    [col1, col2, col3, col4],
    ROW_H, true, 9)

  for (let i = 0; i < crewCalls.length; i += 2) {
    curY = checkPageBreak(pdf, curY, ROW_H + 2)
    const left = crewCalls[i]
    const right = crewCalls[i + 1]
    curY = drawTableRow(pdf, x, curY,
      [
        left.department || '',
        left.call_time || '',
        right?.department || '',
        right?.call_time || '',
      ],
      [col1, col2, col3, col4],
      ROW_H, false, 9)
  }

  return curY + 6
}

/** 4. Blocos de filmagem */
function drawFilmingBlocks(pdf: PDF, blocks: FilmingBlock[], y: number): number {
  if (!blocks || blocks.length === 0) return y

  y = checkPageBreak(pdf, y, 20)
  y = drawSectionHeader(pdf, 'Blocos de Filmagem', y)

  for (const block of blocks) {
    const hasNotes = block.notes && block.notes.trim().length > 0
    const blockH = hasNotes ? 28 : 22

    y = checkPageBreak(pdf, y, blockH + 4)

    // Borda externa do bloco
    setFillColor(pdf, COLOR_BLOCK_BG)
    setDrawColor(pdf, COLOR_BORDER)
    pdf.rect(MARGIN_LEFT, y, CONTENT_WIDTH, blockH, 'FD')

    const textX = MARGIN_LEFT + 4
    let lineY = y + 6

    // Linha 1: horario + cenas + local
    const timeRange = `${block.start_time || ''} - ${block.end_time || ''}`
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setTextColor(pdf, '#111111')
    pdf.text(timeRange, textX, lineY)

    if (block.scenes_label) {
      pdf.setFont('helvetica', 'normal')
      setTextColor(pdf, COLOR_MUTED)
      pdf.text(`| Cenas: ${block.scenes_label}`, textX + 30, lineY)
    }

    if (block.location) {
      pdf.setFont('helvetica', 'normal')
      setTextColor(pdf, COLOR_MUTED)
      pdf.text(`| Local: ${block.location}`, textX + 80, lineY)
    }

    lineY += 6

    // Linha 2: elenco + ajuste
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    setTextColor(pdf, '#333333')

    const parts: string[] = []
    if (block.cast_names) parts.push(`Elenco: ${block.cast_names}`)
    if (block.adjustment_minutes) parts.push(`Ajuste: +${block.adjustment_minutes}min`)
    if (parts.length > 0) {
      const line2Lines = pdf.splitTextToSize(parts.join('  |  '), CONTENT_WIDTH - 8) as string[]
      pdf.text(line2Lines[0] || '', textX, lineY)
      lineY += 5
    }

    // Linha 3: notas (opcional)
    if (hasNotes) {
      pdf.setFont('helvetica', 'italic')
      setTextColor(pdf, COLOR_MUTED)
      const notesLines = pdf.splitTextToSize(`Notas: ${block.notes}`, CONTENT_WIDTH - 8) as string[]
      pdf.text(notesLines[0] || '', textX, lineY)
    }

    y += blockH + 3
  }

  return y + 4
}

/** 5. Tabela de elenco */
function drawCastSchedule(pdf: PDF, cast: CastScheduleEntry[], y: number): number {
  if (!cast || cast.length === 0) return y

  const ROW_H = 7
  const estimatedH = 16 + (cast.length + 1) * ROW_H
  y = checkPageBreak(pdf, y, Math.min(estimatedH, 60))
  y = drawSectionHeader(pdf, 'Elenco do Dia', y)

  // 6 colunas
  const w = CONTENT_WIDTH
  const cols = [w * 0.22, w * 0.18, w * 0.12, w * 0.16, w * 0.16, w * 0.16]
  const headers = ['Ator / Atriz', 'Personagem', 'Call', 'Maquiagem', 'Set', 'Wrap']

  const x = MARGIN_LEFT
  let curY = y
  curY = drawTableRow(pdf, x, curY, headers, cols, ROW_H, true, 8)

  for (const entry of cast) {
    curY = checkPageBreak(pdf, curY, ROW_H + 2)
    curY = drawTableRow(pdf, x, curY,
      [
        entry.name || '',
        entry.character || '',
        entry.call_time || '',
        entry.makeup_time || '',
        entry.on_set_time || '',
        entry.wrap_time || '',
      ],
      cols, ROW_H, false, 8)
  }

  return curY + 6
}

/** 6. Informacoes importantes */
function drawImportantInfo(pdf: PDF, info: string, y: number): number {
  if (!info || !info.trim()) return y

  y = checkPageBreak(pdf, y, 30)
  y = drawSectionHeader(pdf, 'Informacoes Importantes', y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setTextColor(pdf, '#333333')

  const lines = pdf.splitTextToSize(info, CONTENT_WIDTH - 8) as string[]
  const boxH = Math.max(16, lines.length * 5 + 8)

  y = checkPageBreak(pdf, y, boxH + 4)

  // Caixa com borda
  setFillColor(pdf, COLOR_BLOCK_BG)
  setDrawColor(pdf, COLOR_BORDER)
  pdf.rect(MARGIN_LEFT, y, CONTENT_WIDTH, boxH, 'FD')

  let lineY = y + 6
  for (const line of lines) {
    if (lineY + 5 > y + boxH - 2) break
    pdf.text(line, MARGIN_LEFT + 4, lineY)
    lineY += 5
  }

  return y + boxH + 6
}

/** 7. Footer em todas as paginas */
function drawFooters(pdf: PDF, od: ShootingDayOrder) {
  const total = pdf.getNumberOfPages()
  const generatedAt = formatDateTime()

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    setTextColor(pdf, COLOR_MUTED)

    const footerY = PAGE_HEIGHT - 8
    pdf.text(`Gerado por ELLAHOS — ${od.title}`, MARGIN_LEFT, footerY)
    pdf.text(generatedAt, PAGE_WIDTH / 2, footerY, { align: 'center' })
    pdf.text(`Pagina ${i} de ${total}`, PAGE_WIDTH - MARGIN_RIGHT, footerY, { align: 'right' })

    // Linha acima do footer
    setDrawColor(pdf, COLOR_BORDER)
    pdf.line(MARGIN_LEFT, footerY - 3, PAGE_WIDTH - MARGIN_RIGHT, footerY - 3)
  }
}

// ---------------------------------------------------------------------------
// Funcao principal exportada
// ---------------------------------------------------------------------------

export async function generateODPdf(od: ShootingDayOrder): Promise<JsPDFType> {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Linha padrao fina
  pdf.setLineWidth(0.2)

  let y = MARGIN_TOP

  // 1. Cabecalho
  y = drawHeader(pdf, od, y)

  // 2. Cronograma
  y = drawTimeline(pdf, od, y)

  // 3. Chamadas de departamento
  y = drawCrewCalls(pdf, od.crew_calls || [], y)

  // 4. Blocos de filmagem
  y = drawFilmingBlocks(pdf, od.filming_blocks || [], y)

  // 5. Elenco
  y = drawCastSchedule(pdf, od.cast_schedule || [], y)

  // 6. Informacoes importantes
  y = drawImportantInfo(pdf, od.important_info || '', y)

  // 7. Footer em todas as paginas
  drawFooters(pdf, od)

  // Suprimir warning de variavel nao usada no strict mode
  void addWrappedText

  return pdf
}
