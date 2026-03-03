/**
 * Parser de PDF ANCINE — extrai CRTs e dados do registro para criacao batch de claquetes.
 *
 * Usa pdfjs-dist (dynamic import) para extrair texto do PDF.
 * CRTs sao extraidos via regex robusto (14 digitos).
 * Campos textuais sao best-effort e editaveis pelo usuario.
 */

export interface AncineVersion {
  number: string
  crt: string
}

export interface AncinePdfData {
  crtPrincipal: string
  versions: AncineVersion[]
  title: string
  duration: string
  type: string
  product: string
  productionYear: number
  director: string
  advertiser: string
  agency: string
  productionCompany: string
  cnpj: string
  segment: string
}

/**
 * Extrai texto de todas as paginas do PDF usando pdfjs-dist.
 * Retorna array de linhas agrupadas por posicao Y (tolerancia de 3px).
 */
async function extractTextLines(file: File): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const allLines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Agrupar items por posicao Y (tolerancia 3px)
    const lineMap = new Map<number, { x: number; str: string }[]>()
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5] / 3) * 3
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y)!.push({ x: item.transform[4], str: item.str })
    }

    // Ordenar por Y decrescente (PDF coordenadas de baixo pra cima)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = lineMap.get(y)!
      // Ordenar por X dentro da mesma linha
      items.sort((a, b) => a.x - b.x)
      const lineText = items.map(i => i.str).join(' ').trim()
      if (lineText) allLines.push(lineText)
    }
  }

  return allLines
}

/**
 * Parseia as linhas do PDF ANCINE e retorna dados estruturados.
 */
export async function parseAncinePdf(file: File): Promise<AncinePdfData> {
  const lines = await extractTextLines(file)
  const fullText = lines.join('\n')

  // --- CRTs ---
  // Versoes: padrao "NNN CCCCCCCCCCCCCC" (3 digitos + espaco + 14 digitos)
  const versionRegex = /\b(\d{3})\s+(\d{14})\b/g
  const versions: AncineVersion[] = []
  const versionCrts = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = versionRegex.exec(fullText)) !== null) {
    const num = match[1]
    const crt = match[2]
    // Evitar duplicatas
    if (!versionCrts.has(crt)) {
      versions.push({ number: num, crt })
      versionCrts.add(crt)
    }
  }

  // CRT principal: primeiro 14-digitos que NAO esta nas versoes
  const allCrtRegex = /\b(\d{14})\b/g
  let crtPrincipal = ''
  while ((match = allCrtRegex.exec(fullText)) !== null) {
    if (!versionCrts.has(match[1])) {
      crtPrincipal = match[1]
      break
    }
  }

  // Se nao achou principal separado, usar o primeiro CRT de versao como referencia
  if (!crtPrincipal && versions.length > 0) {
    crtPrincipal = versions[0].crt
  }

  // --- Campos texto (best-effort) ---
  const title = extractField(lines, ['TITULO', 'TÍTULO', 'Título'])
  const duration = extractDuration(fullText)
  const type = extractField(lines, ['TIPO', 'Tipo']) || 'COMUM'
  const product = extractField(lines, ['PRODUTO', 'Produto'])
  const director = extractField(lines, ['DIRETOR', 'DIREÇÃO', 'DIRECAO', 'Diretor', 'Direção'])
  const advertiser = extractField(lines, ['ANUNCIANTE', 'Anunciante'])
  const agency = extractField(lines, ['AGÊNCIA', 'AGENCIA', 'Agência', 'Agencia'])
  const productionCompany = extractField(lines, ['PRODUTORA', 'Produtora', 'EMPRESA PRODUTORA'])
  const cnpj = extractCnpj(fullText)
  const segment = extractField(lines, ['SEGMENTO', 'Segmento']) || 'TODOS OS SEGMENTOS DE MERCADO'
  const productionYear = extractYear(fullText)

  return {
    crtPrincipal,
    versions,
    title,
    duration,
    type,
    product,
    productionYear,
    director,
    advertiser,
    agency,
    productionCompany,
    cnpj,
    segment,
  }
}

/** Extrai campo de texto baseado em labels que podem preceder o valor */
function extractField(lines: string[], labels: string[]): string {
  for (const line of lines) {
    for (const label of labels) {
      // Padrao "LABEL: valor" ou "LABEL valor"
      const regex = new RegExp(`${escapeRegex(label)}\\s*[:\\-]?\\s*(.+)`, 'i')
      const m = line.match(regex)
      if (m && m[1].trim()) {
        return m[1].trim()
      }
    }
  }

  // Tentar encontrar o label em uma linha e o valor na proxima
  for (let i = 0; i < lines.length - 1; i++) {
    for (const label of labels) {
      if (lines[i].trim().toUpperCase() === label.toUpperCase()) {
        return lines[i + 1].trim()
      }
    }
  }

  return ''
}

/** Extrai duracao no formato HH:MM:SS ou MM:SS */
function extractDuration(text: string): string {
  const m = text.match(/\b(\d{2}:\d{2}:\d{2})\b/)
  return m ? m[1] : ''
}

/** Extrai CNPJ (XX.XXX.XXX/XXXX-XX ou 14 digitos consecutivos com pontuacao) */
function extractCnpj(text: string): string {
  const m = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/)
  return m ? m[1] : ''
}

/** Extrai ano de producao (20XX) */
function extractYear(text: string): number {
  const currentYear = new Date().getFullYear()
  const matches = text.match(/\b(20\d{2})\b/g)
  if (!matches) return currentYear

  // Preferir o ano mais recente que nao seja futuro
  const years = matches.map(Number).filter(y => y <= currentYear + 1)
  return years.length > 0 ? Math.max(...years) : currentYear
}

/** Escapa caracteres especiais para uso em regex */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
