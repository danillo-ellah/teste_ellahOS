/**
 * Gerador de PDF do Cronograma — jsPDF programatico
 * Layout A4 Landscape (297mm x 210mm)
 *
 * Secoes:
 * 1. Header com logo duplo (produtora + cliente)
 * 2. Faixa de cor brand_color
 * 3. Sub-header com metadados do job
 * 4. Gantt visual simplificado
 * 5. Tabela resumo de fases
 * 6. Rodape
 */

import { parseISO, differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { jsPDF as JsPDFType } from 'jspdf'
import { countWorkingDays, getInitials, formatDateForFilename } from '@/lib/cronograma-utils'
import type { PhaseExportData } from '@/types/cronograma'

// ---------------------------------------------------------------------------
// Constantes de layout (unidades: mm)
// ---------------------------------------------------------------------------

const PAGE_W = 297
const PAGE_H = 210
const MARGIN_X = 14
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Cores
const NEUTRAL_800 = '#1f2937'
const NEUTRAL_600 = '#4b5563'
const NEUTRAL_400 = '#9ca3af'
const NEUTRAL_300 = '#d1d5db'
const NEUTRAL_200 = '#e5e7eb'
const NEUTRAL_100 = '#f3f4f6'
const NEUTRAL_50 = '#f9fafb'
const WHITE = '#ffffff'
const DEFAULT_BRAND = '#E11D48'

// ---------------------------------------------------------------------------
// Alias para nao repetir o tipo longo
type PDF = JsPDFType

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

function setFillColor(doc: PDF, hex: string, opacity = 1) {
  const [r, g, b] = hexToRgb(hex)
  if (opacity < 1) {
    // jsPDF nao suporta opacity diretamente — misturar com branco
    const mix = (c: number) => Math.round(c * opacity + 255 * (1 - opacity))
    doc.setFillColor(mix(r), mix(g), mix(b))
  } else {
    doc.setFillColor(r, g, b)
  }
}

function setTextColor(doc: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setTextColor(r, g, b)
}

function setDrawColor(doc: PDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setDrawColor(r, g, b)
}

function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

function formatDateExtended(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Carregamento de imagem com fallback de CORS
// ---------------------------------------------------------------------------

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 160
        canvas.height = img.naturalHeight || 56
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ---------------------------------------------------------------------------
// Desenhar logo com fallback de iniciais
// ---------------------------------------------------------------------------

function drawLogoOrInitials(
  doc: PDF,
  dataUrl: string | null,
  name: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: 'left' | 'right' = 'left',
) {
  if (dataUrl) {
    // Calcular dimensoes proporcional
    const targetW = Math.min(maxW, 50)
    const targetH = Math.min(maxH, 14)

    const xPos = align === 'right' ? x + maxW - targetW : x
    doc.addImage(dataUrl, 'PNG', xPos, y, targetW, targetH)
  } else if (name) {
    // Fallback: badge retangular com iniciais
    const initials = getInitials(name)
    const badgeW = 18
    const badgeH = 8
    const xPos = align === 'right' ? x + maxW - badgeW : x

    setFillColor(doc, NEUTRAL_100)
    setDrawColor(doc, NEUTRAL_300)
    doc.setLineWidth(0.3)
    doc.roundedRect(xPos, y + (maxH - badgeH) / 2, badgeW, badgeH, 2, 2, 'FD')

    setTextColor(doc, NEUTRAL_600)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(initials, xPos + badgeW / 2, y + maxH / 2 + 0.5, { align: 'center' })

    // Nome abaixo do badge
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    setTextColor(doc, NEUTRAL_400)
    doc.text(
      name.length > 20 ? name.substring(0, 18) + '...' : name,
      xPos + badgeW / 2,
      y + maxH / 2 + 5,
      { align: 'center' },
    )
  }
}

// ---------------------------------------------------------------------------
// Funcao principal de export
// ---------------------------------------------------------------------------

export async function generateCronogramaPdf(data: PhaseExportData): Promise<void> {
  const { job, phases, tenant } = data
  const brandColor = tenant.brand_color || DEFAULT_BRAND

  if (phases.length === 0) return

  // Pre-carregar logos
  const [tenantLogoUrl, clientLogoUrl] = await Promise.all([
    tenant.logo_url ? loadImageAsDataUrl(tenant.logo_url) : Promise.resolve(null),
    job.client_logo_url
      ? loadImageAsDataUrl(job.client_logo_url)
      : job.agency_logo_url
        ? loadImageAsDataUrl(job.agency_logo_url)
        : Promise.resolve(null),
  ])

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ---------------------------------------------------------------------------
  // 1. Header (y: 0 → 22mm)
  // ---------------------------------------------------------------------------

  const headerH = 22
  const logoColW = 55
  const centerX = MARGIN_X + logoColW
  const centerW = CONTENT_W - logoColW * 2

  // Background header (levemente cinza)
  setFillColor(doc, NEUTRAL_50)
  doc.rect(0, 0, PAGE_W, headerH, 'F')

  // Logo produtora (esquerda)
  drawLogoOrInitials(
    doc,
    tenantLogoUrl,
    tenant.company_name,
    MARGIN_X,
    4,
    logoColW,
    14,
    'left',
  )

  // Centro: titulo do job
  const jobTitle = job.title.toUpperCase()
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  setTextColor(doc, NEUTRAL_800)
  const titleLines = doc.splitTextToSize(jobTitle, centerW - 8)
  const titleY = titleLines.length > 1 ? 8 : 10
  doc.text(titleLines.slice(0, 2), centerX + centerW / 2, titleY, { align: 'center' })

  // Subtitulo "CRONOGRAMA DE PRODUCAO"
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setCharSpace(1.5)
  setTextColor(doc, brandColor)
  const subtitleY = titleLines.length > 1 ? 15 : 14
  doc.text('CRONOGRAMA DE PRODUCAO', centerX + centerW / 2, subtitleY, { align: 'center' })
  doc.setCharSpace(0)

  // Linha decorativa abaixo do subtitulo
  setDrawColor(doc, brandColor)
  doc.setLineWidth(0.5)
  const lineW = 40
  doc.line(
    centerX + centerW / 2 - lineW / 2,
    subtitleY + 1.5,
    centerX + centerW / 2 + lineW / 2,
    subtitleY + 1.5,
  )

  // Logo cliente (direita)
  const clientName = job.client_name || job.agency_name || ''
  drawLogoOrInitials(
    doc,
    clientLogoUrl,
    clientName,
    MARGIN_X + logoColW + centerW,
    4,
    logoColW,
    14,
    'right',
  )

  // ---------------------------------------------------------------------------
  // 2. Faixa brand color (y: 22 → 24.5mm)
  // ---------------------------------------------------------------------------

  const brandY = headerH
  const brandH = 2.5

  // Gradiente simulado: dois rects sobrepostos
  setFillColor(doc, brandColor)
  doc.rect(0, brandY, PAGE_W * 0.6, brandH, 'F')
  setFillColor(doc, brandColor, 0.4)
  doc.rect(PAGE_W * 0.6, brandY, PAGE_W * 0.4, brandH, 'F')

  // ---------------------------------------------------------------------------
  // 3. Sub-header — metadados (y: 24.5 → 30mm)
  // ---------------------------------------------------------------------------

  const metaY = brandY + brandH + 3
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  setTextColor(doc, NEUTRAL_600)

  const metaItems = [
    { label: 'Projeto', value: job.title },
    { label: 'Codigo', value: job.code || '—' },
    { label: 'Cliente', value: job.client_name || job.agency_name || '—' },
    { label: 'Emitido em', value: formatDateExtended(new Date().toISOString().split('T')[0]) },
  ]

  const metaColW = CONTENT_W / metaItems.length
  metaItems.forEach(({ label, value }, i) => {
    const mx = MARGIN_X + i * metaColW
    doc.setFont('helvetica', 'bold')
    setTextColor(doc, NEUTRAL_800)
    doc.text(`${label}:`, mx, metaY)

    doc.setFont('helvetica', 'normal')
    setTextColor(doc, NEUTRAL_600)
    const truncated = value.length > 30 ? value.substring(0, 28) + '...' : value
    doc.text(truncated, mx, metaY + 4)
  })

  // Separador
  setDrawColor(doc, NEUTRAL_200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_X, metaY + 7, PAGE_W - MARGIN_X, metaY + 7)

  // ---------------------------------------------------------------------------
  // 4. Gantt visual (y: ~32 → ~65mm)
  // ---------------------------------------------------------------------------

  const ganttStartY = metaY + 10
  const ganttH = 55

  // Background do gantt
  setFillColor(doc, NEUTRAL_50)
  setDrawColor(doc, NEUTRAL_200)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN_X, ganttStartY, CONTENT_W, ganttH, 1, 1, 'FD')

  // Calcular range de datas
  const sortedByStart = [...phases].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const sortedByEnd = [...phases].sort((a, b) => b.end_date.localeCompare(a.end_date))
  const minDateStr = sortedByStart[0].start_date
  const maxDateStr = sortedByEnd[0].end_date
  const minDate = parseISO(minDateStr)
  const maxDate = parseISO(maxDateStr)
  const totalDays = differenceInCalendarDays(maxDate, minDate) + 1

  // Colunas do gantt
  const GANTT_LABEL_W = 52
  const ganttContentW = CONTENT_W - GANTT_LABEL_W - 4
  const dayW = ganttContentW / totalDays

  // Eixo X: meses
  const monthHeaderH = 5
  let lastMonth = ''
  let monthStartX = MARGIN_X + GANTT_LABEL_W + 2

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')

  for (let d = 0; d < totalDays; d++) {
    const day = new Date(minDate)
    day.setDate(day.getDate() + d)
    const monthLabel = format(day, 'MMM yyyy', { locale: ptBR }).toUpperCase()
    if (monthLabel !== lastMonth) {
      if (lastMonth) {
        // Separador de mes
        setDrawColor(doc, NEUTRAL_200)
        doc.setLineWidth(0.2);
        (doc as any).setLineDash([1, 1]);
        doc.line(
          MARGIN_X + GANTT_LABEL_W + 2 + d * dayW,
          ganttStartY + 1,
          MARGIN_X + GANTT_LABEL_W + 2 + d * dayW,
          ganttStartY + ganttH - 1,
        );
        (doc as any).setLineDash([])
      }
      setTextColor(doc, NEUTRAL_400)
      doc.text(monthLabel, MARGIN_X + GANTT_LABEL_W + 2 + d * dayW + 1, ganttStartY + monthHeaderH - 0.5)
      lastMonth = monthLabel
      monthStartX = MARGIN_X + GANTT_LABEL_W + 2 + d * dayW
    }
  }

  // Eixo X: dias (numeros em destaque para cada 5 dias)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  for (let d = 0; d < totalDays; d += 5) {
    const day = new Date(minDate)
    day.setDate(day.getDate() + d)
    setTextColor(doc, NEUTRAL_400)
    doc.text(
      format(day, 'dd'),
      MARGIN_X + GANTT_LABEL_W + 2 + d * dayW + dayW / 2,
      ganttStartY + monthHeaderH + 3,
      { align: 'center' },
    )
  }

  // Linha "Hoje"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = differenceInCalendarDays(today, minDate)
  if (todayOffset >= 0 && todayOffset < totalDays) {
    const todayX = MARGIN_X + GANTT_LABEL_W + 2 + todayOffset * dayW + dayW / 2
    ;(doc as any).setLineDash([0.5, 0.5])
    setDrawColor(doc, '#F43F5E')
    doc.setLineWidth(0.4)
    doc.line(todayX, ganttStartY + monthHeaderH + 4, todayX, ganttStartY + ganttH - 1)
    ;(doc as any).setLineDash([])

    setTextColor(doc, '#F43F5E')
    doc.setFontSize(5)
    doc.setFont('helvetica', 'bold')
    doc.text('HOJE', todayX, ganttStartY + monthHeaderH + 3.5, { align: 'center' })
  }

  // Barras por fase
  const barAreaH = ganttH - monthHeaderH - 5
  const barRowH = Math.min(6, barAreaH / phases.length)
  const barH = barRowH * 0.65
  const barsStartY = ganttStartY + monthHeaderH + 5

  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order)

  sortedPhases.forEach((phase, i) => {
    const rowY = barsStartY + i * barRowH
    const phaseStart = parseISO(phase.start_date)
    const phaseEnd = parseISO(phase.end_date)
    const startOffset = differenceInCalendarDays(phaseStart, minDate)
    const spanDays = differenceInCalendarDays(phaseEnd, phaseStart) + 1

    const barX = MARGIN_X + GANTT_LABEL_W + 2 + startOffset * dayW
    const barW = Math.max(spanDays * dayW, 1)

    // Label da fase (esquerda)
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'normal')
    setTextColor(doc, NEUTRAL_800)
    const labelText = `${phase.phase_emoji} ${phase.phase_label}`
    const labelTruncated = labelText.length > 18 ? labelText.substring(0, 16) + '...' : labelText
    doc.text(labelTruncated, MARGIN_X + 2, rowY + barH * 0.7)

    // Complemento em italico
    if (phase.complement) {
      doc.setFontSize(4.5)
      doc.setFont('helvetica', 'italic')
      setTextColor(doc, NEUTRAL_400)
      const compTruncated = phase.complement.length > 20
        ? phase.complement.substring(0, 18) + '...'
        : phase.complement
      doc.text(`· ${compTruncated}`, MARGIN_X + 2, rowY + barH * 0.7 + 2.5)
    }

    // Barra
    setFillColor(doc, phase.phase_color, 0.15)
    setDrawColor(doc, phase.phase_color)
    doc.setLineWidth(0.2)
    doc.roundedRect(barX, rowY, barW, barH, 0.5, 0.5, 'FD')

    // Borda esquerda (mais grossa)
    setDrawColor(doc, phase.phase_color)
    setFillColor(doc, phase.phase_color)
    doc.rect(barX, rowY, Math.min(1, barW), barH, 'F')
  })

  // ---------------------------------------------------------------------------
  // 5. Tabela de fases (y: ~70 → ~180mm)
  // ---------------------------------------------------------------------------

  const tableStartY = ganttStartY + ganttH + 4
  const colWidths = [65, 35, 35, 22, 35]  // Fase, Inicio, Fim, Dias, Status
  const colLabels = ['FASE', 'INICIO', 'FIM', 'DIAS', 'STATUS']
  const rowHeight = 8
  const tableW = colWidths.reduce((a, b) => a + b, 0)

  // Header da tabela
  setFillColor(doc, NEUTRAL_100)
  setDrawColor(doc, NEUTRAL_200)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN_X, tableStartY, tableW, rowHeight, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(0.5)
  setTextColor(doc, NEUTRAL_600)

  let colX = MARGIN_X
  colLabels.forEach((label, ci) => {
    doc.text(label, colX + 3, tableStartY + 5.2)
    colX += colWidths[ci]
  })
  doc.setCharSpace(0)

  // Linhas de dados
  sortedPhases.forEach((phase, ri) => {
    const rowY = tableStartY + rowHeight + ri * rowHeight
    const hasComplement = Boolean(phase.complement)
    const actualRowH = hasComplement ? rowHeight + 3 : rowHeight

    // Fundo alternado
    if (ri % 2 === 0) {
      setFillColor(doc, WHITE)
    } else {
      setFillColor(doc, NEUTRAL_50)
    }
    doc.rect(MARGIN_X, rowY, tableW, actualRowH, 'F')

    // Borda esquerda colorida
    setFillColor(doc, phase.phase_color)
    doc.rect(MARGIN_X, rowY, 1.5, actualRowH, 'F')

    // Separador
    setDrawColor(doc, NEUTRAL_200)
    doc.setLineWidth(0.15)
    doc.line(MARGIN_X, rowY + actualRowH, MARGIN_X + tableW, rowY + actualRowH)

    const textY = rowY + 5.2

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setTextColor(doc, NEUTRAL_800)

    // Col 0: Fase (emoji + nome)
    const phaseText = `${phase.phase_emoji} ${phase.phase_label}`
    const phaseTruncated = phaseText.length > 30 ? phaseText.substring(0, 28) + '...' : phaseText
    doc.text(phaseTruncated, MARGIN_X + 1.5 + 3, textY)

    // Complemento em segunda linha
    if (hasComplement) {
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      setTextColor(doc, NEUTRAL_400)
      const compTruncated = phase.complement!.length > 35
        ? phase.complement!.substring(0, 33) + '...'
        : phase.complement!
      doc.text(compTruncated, MARGIN_X + 1.5 + 3, textY + 3.5)
    }

    // Col 1: Inicio
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    setTextColor(doc, NEUTRAL_600)
    doc.text(formatDateLabel(phase.start_date), MARGIN_X + colWidths[0] + 3, textY)

    // Col 2: Fim
    doc.text(formatDateLabel(phase.end_date), MARGIN_X + colWidths[0] + colWidths[1] + 3, textY)

    // Col 3: Dias
    const wdays = countWorkingDays(phase.start_date, phase.end_date, phase.skip_weekends)
    setTextColor(doc, NEUTRAL_800)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `${wdays}d`,
      MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2] + 3,
      textY,
    )

    // Col 4: Status
    const statusLabels: Record<string, string> = {
      pending: 'Nao iniciado',
      in_progress: 'Em andamento',
      completed: 'Concluido',
    }
    const statusColors: Record<string, string> = {
      pending: '#64748B',
      in_progress: '#3B82F6',
      completed: '#22C55E',
    }
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const sColor = statusColors[phase.status] || '#64748B'
    setTextColor(doc, sColor)
    doc.text(
      statusLabels[phase.status] || phase.status,
      MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 3,
      textY,
    )
  })

  // Linha total
  const totalY = tableStartY + rowHeight + sortedPhases.length * rowHeight
  const totalWorkingDays = sortedPhases.reduce(
    (acc, p) => acc + countWorkingDays(p.start_date, p.end_date, p.skip_weekends),
    0,
  )

  setFillColor(doc, NEUTRAL_100)
  setDrawColor(doc, NEUTRAL_300)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN_X, totalY, tableW, rowHeight, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setTextColor(doc, NEUTRAL_800)
  doc.text('TOTAL', MARGIN_X + 4, totalY + 5.2)
  doc.text(
    `${totalWorkingDays} dias`,
    MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2] + 3,
    totalY + 5.2,
  )

  // ---------------------------------------------------------------------------
  // 6. Rodape
  // ---------------------------------------------------------------------------

  const footerY = PAGE_H - 8

  setDrawColor(doc, NEUTRAL_200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_X, footerY - 2, PAGE_W - MARGIN_X, footerY - 2)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setTextColor(doc, NEUTRAL_400)
  doc.text('Gerado por ELLAHOS \u2022 ellahos.com.br', MARGIN_X, footerY + 2)

  const todayLabel = formatDateExtended(new Date().toISOString().split('T')[0])
  doc.text(todayLabel, PAGE_W - MARGIN_X, footerY + 2, { align: 'right' })

  // ---------------------------------------------------------------------------
  // Salvar
  // ---------------------------------------------------------------------------

  const filename = `cronograma-${(job.code || 'job').toLowerCase().replace(/\s+/g, '-')}-${formatDateForFilename()}.pdf`
  doc.save(filename)
}
