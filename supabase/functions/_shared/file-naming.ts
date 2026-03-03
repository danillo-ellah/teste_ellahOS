/**
 * Modulo de nomenclatura padronizada para arquivos financeiros do ELLAHOS.
 *
 * Padroes:
 *   Comprovante: PGTO_YYYYMMDD_J{jobCode}_ID{costItemId8}.{ext}
 *   NF:          NF_YYYYMMDD_J{jobCode}_ID{costItemId8}.{ext}
 *   Recibo:      REC_YYYYMMDD_J{jobCode}_ID{costItemId8}.{ext}
 *
 * Exemplos:
 *   PGTO_20250315_JELH2025001_IDa1b2c3d4.pdf
 *   NF_20250315_JELH2025001_IDa1b2c3d4.pdf
 */

// Prefixos por tipo de arquivo financeiro
const FILE_PREFIX: Record<FileType, string> = {
  payment_proof: 'PGTO',
  nf: 'NF',
  receipt: 'REC',
};

export type FileType = 'payment_proof' | 'nf' | 'receipt';

export interface GenerateFileNameParams {
  /** Tipo do arquivo financeiro */
  type: FileType;
  /** Codigo do job, ex: "ELH-2025-001" */
  jobCode: string;
  /** UUID do cost_item — apenas os primeiros 8 caracteres sao usados */
  costItemId?: string;
  /** Data no formato YYYY-MM-DD; padrao: hoje (UTC) */
  date?: string;
  /** Extensao sem ponto; padrao: "pdf" */
  extension?: string;
  /** Sequencial para multiplos arquivos do mesmo tipo no mesmo dia (>1 adiciona sufixo _N) */
  sequence?: number;
}

export interface ParsedFileName {
  type: string;
  date: string;
  jobCode: string;
  costItemId?: string;
  sequence?: number;
}

/**
 * Gera nome padronizado para arquivos financeiros.
 *
 * Formato: {PREFIX}_{YYYYMMDD}_J{jobCodeSanitizado}[_ID{costItemId8}][_{seq}].{ext}
 *
 * jobCode e sanitizado removendo hifens para manter o nome compacto.
 * Ex: "ELH-2025-001" -> "ELH2025001"
 */
export function generateFileName(params: GenerateFileNameParams): string {
  const prefix = FILE_PREFIX[params.type];

  // Data no formato YYYYMMDD
  const rawDate = params.date ?? new Date().toISOString().split('T')[0];
  const dateStr = rawDate.replace(/-/g, '');

  // Job code sanitizado: remove hifens e espacos
  const jobPart = params.jobCode.replace(/[-\s]/g, '');

  // ID do cost_item: primeiros 8 chars do UUID
  const idPart = params.costItemId
    ? `_ID${params.costItemId.replace(/-/g, '').substring(0, 8)}`
    : '';

  // Sequencial (apenas se > 1)
  const seqPart = params.sequence && params.sequence > 1
    ? `_${params.sequence}`
    : '';

  const ext = params.extension ?? 'pdf';

  return `${prefix}_${dateStr}_J${jobPart}${idPart}${seqPart}.${ext}`;
}

/**
 * Tenta extrair metadados de um nome de arquivo no padrao ELLAHOS.
 * Retorna null se o nome nao seguir o padrao.
 *
 * Padrão reconhecido:
 *   (PGTO|NF|REC)_(YYYYMMDD)_J([A-Z0-9]+)(_ID([0-9a-f]{8}))?(_(\d+))?\.\w+
 */
export function parseFileName(filename: string): ParsedFileName | null {
  // Remove extensao e caminho
  const base = filename.replace(/\.[^.]+$/, '').split('/').pop() ?? filename;

  const pattern =
    /^(PGTO|NF|REC)_(\d{8})_J([A-Z0-9]+)(?:_ID([0-9a-fA-F]{8}))?(?:_(\d+))?$/;

  const match = base.match(pattern);
  if (!match) return null;

  const [, rawType, dateRaw, jobCode, costItemId, seqRaw] = match;

  // Reconverter tipo de prefixo para FileType
  const typeMap: Record<string, FileType> = {
    PGTO: 'payment_proof',
    NF: 'nf',
    REC: 'receipt',
  };

  // Formatar data como YYYY-MM-DD
  const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;

  return {
    type: typeMap[rawType] ?? rawType.toLowerCase(),
    date,
    jobCode,
    costItemId: costItemId ?? undefined,
    sequence: seqRaw ? parseInt(seqRaw, 10) : undefined,
  };
}

/**
 * Extrai a extensao de um nome de arquivo (sem ponto).
 * Retorna "pdf" como fallback se nao houver extensao.
 */
export function extractExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return 'pdf';
  return parts[parts.length - 1].toLowerCase();
}
