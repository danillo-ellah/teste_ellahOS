/**
 * Parser de PDF ANCINE — extrai CRTs e dados do registro para criacao batch de claquetes.
 *
 * Usa pdfjs-dist (dynamic import) para extrair texto do PDF.
 * CRTs sao extraidos via regex robusto (14 digitos).
 * Campos textuais sao best-effort e editaveis pelo usuario.
 *
 * Estrutura real do PDF ANCINE (paginas do portal sad2.ancine.gov.br):
 * - Valores e labels podem estar na mesma linha ou em linhas adjacentes
 * - Versoes: cada versao em linhas separadas (ex: "001" / "20260006390013")
 * - CNPJ sem pontuacao (14 digitos corridos)
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

  // Worker local (copiado de node_modules para public/ — evita bloqueio CSP)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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
      items.sort((a, b) => a.x - b.x)
      const lineText = items.map(i => i.str).join(' ').trim()
      if (lineText) allLines.push(lineText)
    }
  }

  return allLines
}

/**
 * Parseia as linhas do PDF ANCINE e retorna dados estruturados.
 *
 * Estrutura real extraida do PDF:
 *   "CARRINHO CAFE"
 *   "Título da Obra"
 *   "20260006390008"
 *   "CRT Principal"
 *   "001"
 *   "20260006390013"
 *   "002"
 *   "20260006390021"
 *   ...
 */
export async function parseAncinePdf(file: File): Promise<AncinePdfData> {
  const lines = await extractTextLines(file)
  const fullText = lines.join('\n')

  // Log para debug (removivel depois)
  console.log('[ancine-parser] linhas extraidas:', lines.length)
  console.log('[ancine-parser] primeiras 40 linhas:', lines.slice(0, 40))

  // --- CRTs ---
  // Coletar todos os numeros de 14 digitos
  const allCrts: string[] = []
  const crt14Regex = /\b(\d{14})\b/g
  let match: RegExpExecArray | null
  while ((match = crt14Regex.exec(fullText)) !== null) {
    allCrts.push(match[1])
  }

  // CRT Principal: aparece proximo ao label "CRT Principal"
  let crtPrincipal = ''
  for (let i = 0; i < lines.length; i++) {
    if (/CRT\s*Principal/i.test(lines[i])) {
      // Valor pode estar na mesma linha, na anterior, ou na proxima
      const crtInLine = lines[i].match(/\b(\d{14})\b/)
      if (crtInLine) {
        crtPrincipal = crtInLine[1]
      } else if (i > 0) {
        const prev = lines[i - 1].match(/\b(\d{14})\b/)
        if (prev) crtPrincipal = prev[1]
      }
      if (!crtPrincipal && i < lines.length - 1) {
        const next = lines[i + 1].match(/\b(\d{14})\b/)
        if (next) crtPrincipal = next[1]
      }
      break
    }
  }

  // Versoes: no PDF, aparecem como linhas alternadas "NNN" / "CCCCCCCCCCCCCC"
  // Procurar padrao: linha com 3 digitos seguida de linha com 14 digitos
  const versions: AncineVersion[] = []
  const versionCrts = new Set<string>()

  // Primeiro: tentar mesma linha "NNN CCCCCCCCCCCCCC"
  const sameLineRegex = /\b(\d{3})\s+(\d{14})\b/g
  while ((match = sameLineRegex.exec(fullText)) !== null) {
    const num = match[1]
    const crt = match[2]
    if (!versionCrts.has(crt)) {
      versions.push({ number: num, crt })
      versionCrts.add(crt)
    }
  }

  // Se nao encontrou na mesma linha, procurar em linhas consecutivas
  if (versions.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      const numMatch = lines[i].trim().match(/^(\d{3})$/)
      if (numMatch) {
        const crtMatch = lines[i + 1].trim().match(/^(\d{14})$/)
        if (crtMatch && !versionCrts.has(crtMatch[1])) {
          versions.push({ number: numMatch[1], crt: crtMatch[1] })
          versionCrts.add(crtMatch[1])
        }
      }
    }
  }

  // Fallback: CRT principal como primeiro 14-digitos nao usado em versoes
  if (!crtPrincipal) {
    for (const crt of allCrts) {
      if (!versionCrts.has(crt)) {
        crtPrincipal = crt
        break
      }
    }
  }
  if (!crtPrincipal && versions.length > 0) {
    crtPrincipal = versions[0].crt
  }

  // --- Campos texto (best-effort) ---
  // No PDF ANCINE, o VALOR aparece ANTES do label (linha anterior)
  const title = extractFieldBefore(lines, ['Título da Obra', 'Titulo da Obra', 'TITULO'])
    || extractFieldAfter(lines, ['Título da Obra', 'Titulo da Obra', 'TITULO'])
  const duration = extractDuration(fullText)
  const type = extractFieldBefore(lines, ['Tipo']) || extractFieldAfter(lines, ['Tipo']) || 'COMUM'
  const product = extractFieldBefore(lines, ['Produto Anunciado', 'PRODUTO'])
    || extractFieldAfter(lines, ['Produto Anunciado', 'PRODUTO'])
  const director = extractDirector(lines)
  const advertiser = extractAdvertiser(lines)
  const agency = extractAgency(lines)
  const productionCompany = extractProductionCompany(lines)
  const cnpj = extractProductionCnpj(lines)
  const segment = extractFieldBefore(lines, ['Segmento de Mercado', 'SEGMENTO'])
    || extractFieldAfter(lines, ['Segmento de Mercado', 'SEGMENTO'])
    || 'TODOS OS SEGMENTOS DE MERCADO'
  const productionYear = extractYear(fullText)

  console.log('[ancine-parser] resultado:', {
    crtPrincipal,
    versionsCount: versions.length,
    title, duration, type, product, director, advertiser, agency, productionCompany, cnpj,
  })

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

/**
 * Extrai campo onde o VALOR aparece na linha ANTES do label.
 * Padrao ANCINE: "CARRINHO CAFE" (valor) / "Título da Obra" (label)
 */
function extractFieldBefore(lines: string[], labels: string[]): string {
  for (let i = 1; i < lines.length; i++) {
    for (const label of labels) {
      if (lines[i].trim().toLowerCase().includes(label.toLowerCase())) {
        const val = lines[i - 1].trim()
        // Ignorar se o valor anterior parece ser outro label ou e vazio
        if (val && !val.includes('Obra') && !val.includes('ANCINE') && val.length < 200) {
          return val
        }
      }
    }
  }
  return ''
}

/**
 * Extrai campo onde o VALOR aparece na linha DEPOIS do label.
 */
function extractFieldAfter(lines: string[], labels: string[]): string {
  for (let i = 0; i < lines.length - 1; i++) {
    for (const label of labels) {
      if (lines[i].trim().toLowerCase().includes(label.toLowerCase())) {
        const val = lines[i + 1].trim()
        if (val && val.length < 200) {
          return val
        }
      }
    }
  }
  return ''
}

/**
 * Extrai nome do diretor.
 * No PDF: secao "DIRETOR" com "Nome" como sublabel, valor na linha anterior ou proxima.
 */
function extractDirector(lines: string[]): string {
  let inDirectorSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (/^DIRETOR$/i.test(line)) {
      inDirectorSection = true
      continue
    }

    if (inDirectorSection) {
      // Procurar "Nome" e pegar o valor antes dele
      if (/^Nome$/i.test(line) || line === 'Nome') {
        if (i > 0 && !/^(CPF|CNPJ|DIRETOR)$/i.test(lines[i - 1].trim())) {
          return lines[i - 1].trim()
        }
      }
      // Nome com valor na mesma linha
      if (/^Nome\s+(.+)/i.test(line)) {
        const m = line.match(/^Nome\s+(.+)/i)
        if (m) return m[1].trim()
      }
      // Se encontrou outra secao, parar
      if (/^(SEGMENTO|ANUNCIANTE|AG[ÊE]NCIA|EMPRESA)/i.test(line)) {
        break
      }
    }
  }
  return ''
}

/**
 * Extrai nome do anunciante.
 * Secao "ANUNCIANTE" → "Nome ou Nome Empresarial" → valor na linha anterior
 */
function extractAdvertiser(lines: string[]): string {
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (/^ANUNCIANTE$/i.test(line)) {
      inSection = true
      continue
    }

    if (inSection) {
      if (/Nome.*Empresarial|Denomina/i.test(line)) {
        if (i > 0 && !/^(CPF|CNPJ|Pa|ANUNCIANTE)$/i.test(lines[i - 1].trim())) {
          const val = lines[i - 1].trim()
          // Ignorar se e um CNPJ puro
          if (!/^\d{11,14}$/.test(val)) return val
        }
      }
      if (/^(EMPRESA|DIRETOR|SEGMENTO|AG[ÊE]NCIA)/i.test(line)) break
    }
  }
  return ''
}

/**
 * Extrai nome da agencia.
 * Secao "AGÊNCIA DE PUBLICIDADE" → "Nome ou Nome Empresarial" → valor na linha anterior
 */
function extractAgency(lines: string[]): string {
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (/AG[ÊE]NCIA\s*(DE\s*PUBLICIDADE)?$/i.test(line)) {
      inSection = true
      continue
    }

    if (inSection) {
      if (/Nome.*Empresarial|Denomina/i.test(line)) {
        if (i > 0 && !/^(CPF|CNPJ|Pa|AG[ÊE]NCIA)$/i.test(lines[i - 1].trim())) {
          const val = lines[i - 1].trim()
          if (!/^\d{11,14}$/.test(val)) return val
        }
      }
      if (/^(ANUNCIANTE|EMPRESA|DIRETOR|SEGMENTO)/i.test(line)) break
    }
  }
  return ''
}

/**
 * Extrai nome da produtora.
 * Secao "EMPRESA PRODUTORA" → "Nome Empresarial" → valor na linha anterior
 */
function extractProductionCompany(lines: string[]): string {
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (/EMPRESA\s*PRODUTORA$/i.test(line)) {
      inSection = true
      continue
    }

    if (inSection) {
      if (/Nome.*Empresarial|Denomina/i.test(line)) {
        if (i > 0) {
          const val = lines[i - 1].trim()
          if (val && !/^\d{11,14}$/.test(val) && !/^(CNPJ|EMPRESA)/i.test(val)) return val
        }
      }
      if (/^(DIRETOR|SEGMENTO|ANUNCIANTE|AG[ÊE]NCIA)/i.test(line)) break
    }
  }
  return ''
}

/**
 * Extrai CNPJ da empresa produtora (14 digitos sem pontuacao no PDF ANCINE).
 */
function extractProductionCnpj(lines: string[]): string {
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (/EMPRESA\s*PRODUTORA$/i.test(line)) {
      inSection = true
      continue
    }

    if (inSection) {
      // CNPJ aparece como 14 digitos corridos
      const cnpjMatch = line.match(/^(\d{14})$/)
      if (cnpjMatch) {
        return formatCnpj(cnpjMatch[1])
      }
      // Ou com pontuacao
      const cnpjFormatted = line.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
      if (cnpjFormatted) return cnpjFormatted[1]

      if (/^(DIRETOR|SEGMENTO|ANUNCIANTE|AG[ÊE]NCIA)/i.test(line)) break
    }
  }

  // Fallback: qualquer CNPJ formatado no texto
  const m = fullTextCnpj(lines.join('\n'))
  return m
}

/** Formata CNPJ: 12345678000199 → 12.345.678/0001-99 */
function formatCnpj(raw: string): string {
  if (raw.length !== 14) return raw
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`
}

/** Procura CNPJ formatado no texto */
function fullTextCnpj(text: string): string {
  const m = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
  return m ? m[1] : ''
}

/** Extrai duracao no formato HH:MM:SS */
function extractDuration(text: string): string {
  const m = text.match(/\b(\d{2}:\d{2}:\d{2})\b/)
  return m ? m[1] : ''
}

/** Extrai ano de producao (20XX) */
function extractYear(text: string): number {
  const currentYear = new Date().getFullYear()

  // Procurar especificamente proximo a "Ano de Produção"
  const anoMatch = text.match(/(\d{4})\s*\n.*Ano\s*de\s*Produ/i)
    || text.match(/Ano\s*de\s*Produ[^\n]*\n\s*(\d{4})/i)
  if (anoMatch) {
    const y = parseInt(anoMatch[1])
    if (y >= 2000 && y <= currentYear + 1) return y
  }

  // Fallback
  const matches = text.match(/\b(20\d{2})\b/g)
  if (!matches) return currentYear
  const years = matches.map(Number).filter(y => y >= 2020 && y <= currentYear + 1)
  return years.length > 0 ? Math.max(...years) : currentYear
}
