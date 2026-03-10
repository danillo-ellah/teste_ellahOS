import * as XLSX from 'xlsx'

// --- Limites de seguranca (ADR-IMP-07) ---
export const IMPORT_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_ROWS: 500,
  MAX_COLUMNS: 50,
  BATCH_SIZE: 50,
  MAX_CELL_LENGTH: 5000,
} as const

// --- Tipos ---
export type EntityType = 'clients' | 'contacts' | 'jobs'

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
  fileFormat: 'csv' | 'xlsx'
  fileSize: number
}

export interface FieldMapping {
  sourceColumn: string
  targetField: string
}

export interface ImportableField {
  key: string
  label: string
  required: boolean
  description?: string
}

// --- Campos importaveis por entidade ---
export const ENTITY_FIELDS: Record<EntityType, ImportableField[]> = {
  clients: [
    { key: 'name', label: 'Nome', required: true, description: 'Nome da empresa/cliente' },
    { key: 'trading_name', label: 'Nome Fantasia', required: false },
    { key: 'cnpj', label: 'CNPJ', required: false },
    { key: 'segment', label: 'Segmento', required: false, description: 'Ex: educacao, saude, tecnologia' },
    { key: 'address', label: 'Endereco', required: false },
    { key: 'city', label: 'Cidade', required: false },
    { key: 'state', label: 'Estado (UF)', required: false, description: 'Ex: SP, RJ' },
    { key: 'cep', label: 'CEP', required: false },
    { key: 'website', label: 'Website', required: false },
    { key: 'notes', label: 'Observacoes', required: false },
  ],
  contacts: [
    { key: 'name', label: 'Nome', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Telefone', required: false },
    { key: 'role', label: 'Cargo/Funcao', required: false },
    { key: 'is_primary', label: 'Contato Principal', required: false, description: 'true/false ou sim/nao' },
    { key: 'client_name', label: 'Nome do Cliente', required: true, description: 'Deve existir no sistema' },
  ],
  jobs: [
    { key: 'title', label: 'Titulo', required: true },
    { key: 'client_name', label: 'Nome do Cliente', required: true, description: 'Deve existir no sistema' },
    { key: 'job_type', label: 'Tipo de Projeto', required: true, description: 'Ex: filme_publicitario, branded_content' },
    { key: 'priority', label: 'Prioridade', required: false, description: 'baixa, media, alta, urgente' },
    { key: 'expected_delivery_date', label: 'Data Prevista Entrega', required: false, description: 'YYYY-MM-DD' },
    { key: 'closed_value', label: 'Valor Fechado (R$)', required: false },
    { key: 'production_cost', label: 'Custo Producao (R$)', required: false },
    { key: 'briefing_text', label: 'Briefing', required: false },
    { key: 'notes', label: 'Observacoes', required: false },
    { key: 'brand', label: 'Marca', required: false },
    { key: 'format', label: 'Formato', required: false },
    { key: 'po_number', label: 'Numero PO', required: false },
  ],
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  clients: 'Clientes',
  contacts: 'Contatos',
  jobs: 'Jobs',
}

// --- Parsing ---

export function parseFile(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    if (file.size > IMPORT_LIMITS.MAX_FILE_SIZE) {
      reject(new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 5 MB.`))
      return
    }

    const fileFormat = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx'

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Erro ao ler o arquivo'))
          return
        }

        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Arquivo vazio ou sem planilha'))
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        })

        if (jsonData.length === 0) {
          reject(new Error('Planilha vazia — nenhuma linha de dados encontrada'))
          return
        }

        if (jsonData.length > IMPORT_LIMITS.MAX_ROWS) {
          reject(new Error(`Muitas linhas (${jsonData.length}). Limite: ${IMPORT_LIMITS.MAX_ROWS} linhas.`))
          return
        }

        const headers = Object.keys(jsonData[0])
        if (headers.length > IMPORT_LIMITS.MAX_COLUMNS) {
          reject(new Error(`Muitas colunas (${headers.length}). Limite: ${IMPORT_LIMITS.MAX_COLUMNS} colunas.`))
          return
        }

        // Converter tudo para string e truncar celulas longas
        const rows = jsonData.map((row) => {
          const cleaned: Record<string, string> = {}
          for (const key of headers) {
            const val = String(row[key] ?? '').trim()
            cleaned[key] = val.length > IMPORT_LIMITS.MAX_CELL_LENGTH
              ? val.substring(0, IMPORT_LIMITS.MAX_CELL_LENGTH)
              : val
          }
          return cleaned
        })

        resolve({
          headers,
          rows,
          fileName: file.name,
          fileFormat,
          fileSize: file.size,
        })
      } catch {
        reject(new Error('Erro ao processar o arquivo. Verifique se e um CSV ou XLSX valido.'))
      }
    }

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

// --- Auto-mapeamento ---

/** Tenta mapear colunas do arquivo para campos do sistema por similaridade */
export function autoMapColumns(
  headers: string[],
  entityType: EntityType,
): FieldMapping[] {
  const fields = ENTITY_FIELDS[entityType]
  const mappings: FieldMapping[] = []
  const usedHeaders = new Set<string>()

  // Mapa de aliases comuns para cada campo
  const ALIASES: Record<string, string[]> = {
    name: ['nome', 'name', 'razao social', 'razao_social', 'empresa', 'cliente', 'contato'],
    trading_name: ['nome fantasia', 'fantasia', 'trading_name', 'nome_fantasia'],
    cnpj: ['cnpj', 'cnpj_cpf', 'documento'],
    segment: ['segmento', 'segment', 'setor', 'area'],
    address: ['endereco', 'address', 'logradouro', 'rua'],
    city: ['cidade', 'city', 'municipio'],
    state: ['estado', 'state', 'uf'],
    cep: ['cep', 'zip', 'codigo_postal'],
    website: ['website', 'site', 'url', 'pagina'],
    notes: ['observacoes', 'obs', 'notas', 'notes', 'observacao'],
    email: ['email', 'e-mail', 'e_mail', 'mail'],
    phone: ['telefone', 'phone', 'fone', 'cel', 'celular', 'whatsapp'],
    role: ['cargo', 'funcao', 'role', 'departamento'],
    is_primary: ['principal', 'is_primary', 'contato_principal', 'primario'],
    client_name: ['cliente', 'client', 'client_name', 'nome_cliente', 'empresa'],
    title: ['titulo', 'title', 'nome', 'projeto', 'job'],
    job_type: ['tipo', 'type', 'job_type', 'tipo_projeto', 'project_type'],
    priority: ['prioridade', 'priority', 'urgencia'],
    expected_delivery_date: ['entrega', 'delivery', 'data_entrega', 'prazo', 'deadline'],
    closed_value: ['valor', 'value', 'valor_fechado', 'preco', 'price', 'orcamento'],
    production_cost: ['custo', 'cost', 'custo_producao'],
    briefing_text: ['briefing', 'brief', 'descricao', 'description'],
    brand: ['marca', 'brand'],
    format: ['formato', 'format'],
    po_number: ['po', 'po_number', 'numero_po', 'pedido'],
  }

  for (const field of fields) {
    const aliases = ALIASES[field.key] ?? [field.key]
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ')
      const match = aliases.some((alias) => {
        const normalizedAlias = alias.toLowerCase().replace(/[_\-\s]+/g, ' ')
        return normalized === normalizedAlias || normalized.includes(normalizedAlias)
      })
      if (match) {
        mappings.push({ sourceColumn: header, targetField: field.key })
        usedHeaders.add(header)
        break
      }
    }
  }

  return mappings
}

// --- Transformacao ---

/** Aplica mapeamento e transforma valores */
export function applyMapping(
  rows: Record<string, string>[],
  mappings: FieldMapping[],
  entityType: EntityType,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {}

    for (const { sourceColumn, targetField } of mappings) {
      let value: unknown = row[sourceColumn] ?? ''

      // Transformacoes por tipo de campo
      if (targetField === 'is_primary') {
        const v = String(value).toLowerCase().trim()
        value = v === 'true' || v === 'sim' || v === 'yes' || v === '1' || v === 'x'
      } else if (targetField === 'closed_value' || targetField === 'production_cost') {
        // Formato BR: 1.234,56 -> 1234.56
        const cleaned = String(value)
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
        const num = parseFloat(cleaned)
        value = isNaN(num) ? null : num
      } else if (targetField === 'expected_delivery_date') {
        value = normalizeDateString(String(value))
      } else if (targetField === 'state') {
        value = String(value).toUpperCase().trim().substring(0, 2) || null
      } else if (targetField === 'cnpj') {
        // Remove formatacao
        value = String(value).replace(/[^\d]/g, '') || null
      } else {
        // String normal — trim
        value = String(value).trim() || null
      }

      mapped[targetField] = value
    }

    // Defaults por entidade
    if (entityType === 'contacts' && mapped.is_primary === undefined) {
      mapped.is_primary = false
    }

    return mapped
  })
}

/** Converte DD/MM/YYYY ou DD-MM-YYYY para YYYY-MM-DD */
function normalizeDateString(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Ja no formato ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // DD/MM/YYYY ou DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

// --- Validacao local (pre-envio) ---

export interface ValidationError {
  line: number
  field: string
  message: string
}

export function validateRows(
  rows: Record<string, unknown>[],
  entityType: EntityType,
): ValidationError[] {
  const fields = ENTITY_FIELDS[entityType]
  const requiredFields = fields.filter((f) => f.required).map((f) => f.key)
  const errors: ValidationError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    for (const key of requiredFields) {
      const val = row[key]
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        const fieldDef = fields.find((f) => f.key === key)
        errors.push({
          line: i + 1,
          field: key,
          message: `${fieldDef?.label ?? key} e obrigatorio`,
        })
      }
    }
  }

  return errors
}

// --- Chunking para envio em batches ---

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// --- Hash do arquivo para idempotencia ---

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
