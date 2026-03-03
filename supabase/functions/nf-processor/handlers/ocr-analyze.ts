import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { callGroq } from '../../_shared/groq-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para usar OCR
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Schema de validacao do payload
const OcrAnalyzeSchema = z.object({
  nf_document_id: z.string().uuid('nf_document_id deve ser UUID valido'),
});

type OcrAnalyzeInput = z.infer<typeof OcrAnalyzeSchema>;

// Confianca por campo individual
type FieldConfidence = 'high' | 'medium' | 'low';

// Estrutura de campo com confianca
interface OcrField {
  value: string | null;
  confidence: FieldConfidence;
}

// Resultado completo retornado para o frontend
export interface OcrAnalyzeResult {
  nf_document_id: string;
  nf_number: OcrField;
  emission_date: OcrField;
  total_value: OcrField;
  cnpj_emitter: OcrField;
  company_name: OcrField;
  description: OcrField;
  overall_confidence: FieldConfidence;
  source: 'groq_ocr' | 'existing_extraction';
}

// Documento NF do banco (campos relevantes para o OCR)
interface NfDocumentRow {
  id: string;
  file_name: string;
  drive_url: string | null;
  drive_file_id: string | null;
  extracted_issuer_name: string | null;
  extracted_issuer_cnpj: string | null;
  extracted_nf_number: string | null;
  extracted_value: number | null;
  extracted_issue_date: string | null;
  extraction_confidence: number | null;
}

// --- Helpers de prompt e parse ---

// Prompt estruturado para extracao de NF via Groq (sem visao — analisa metadados e filename)
function buildOcrPrompt(fileName: string, driveUrl: string | null): string {
  return `Voce e um sistema especializado em extracao de dados de Notas Fiscais brasileiras.

Arquivo: "${fileName}"
URL do documento: ${driveUrl ?? 'nao disponivel'}

Com base no nome do arquivo e URL do documento acima, tente inferir informacoes de uma Nota Fiscal brasileira.
Retorne APENAS um objeto JSON valido, sem texto adicional, com exatamente esta estrutura:

{
  "nf_number": { "value": "numero da NF ou null", "confidence": "high|medium|low" },
  "emission_date": { "value": "data no formato YYYY-MM-DD ou null", "confidence": "high|medium|low" },
  "total_value": { "value": "valor numerico como string decimal, ex: '1500.00', ou null", "confidence": "high|medium|low" },
  "cnpj_emitter": { "value": "CNPJ no formato XX.XXX.XXX/XXXX-XX ou null", "confidence": "high|medium|low" },
  "company_name": { "value": "razao social do emitente ou null", "confidence": "high|medium|low" },
  "description": { "value": "descricao do servico ou null", "confidence": "high|medium|low" }
}

Regras:
- Se o nome do arquivo contem data (ex: NF_20240315), use para emission_date com confidence "medium"
- Se o nome contem numero de NF (ex: NF-00123), use para nf_number com confidence "medium"
- Para campos que nao e possivel inferir, use null e confidence "low"
- Retorne APENAS o JSON valido, sem markdown, sem explicacoes.`;
}

// Parseia resposta do Groq tolerando markdown e erros
function parseGroqOcrResponse(content: string): Partial<Record<string, OcrField>> | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    function extractField(raw: unknown): OcrField {
      if (!raw || typeof raw !== 'object') {
        return { value: null, confidence: 'low' };
      }
      const obj = raw as Record<string, unknown>;
      const rawValue = obj.value;
      const value =
        typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : null;
      const conf = obj.confidence;
      const confidence: FieldConfidence =
        conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'low';
      return { value, confidence };
    }

    return {
      nf_number: extractField(parsed.nf_number),
      emission_date: extractField(parsed.emission_date),
      total_value: extractField(parsed.total_value),
      cnpj_emitter: extractField(parsed.cnpj_emitter),
      company_name: extractField(parsed.company_name),
      description: extractField(parsed.description),
    };
  } catch {
    return null;
  }
}

// Calcula confianca geral pelos campos principais
function computeOverallConfidence(fields: Partial<Record<string, OcrField>>): FieldConfidence {
  const core = ['total_value', 'company_name', 'nf_number'] as const;
  let highCount = 0;
  let mediumCount = 0;

  for (const key of core) {
    const field = fields[key];
    if (field?.value) {
      if (field.confidence === 'high') highCount++;
      else if (field.confidence === 'medium') mediumCount++;
    }
  }

  if (highCount >= 2) return 'high';
  if (highCount + mediumCount >= 2) return 'medium';
  return 'low';
}

// Converte dados ja extraidos no banco para o formato OcrField
function buildFallbackResult(
  id: string,
  doc: NfDocumentRow,
): OcrAnalyzeResult {
  const baseConf = doc.extraction_confidence;
  const conf: FieldConfidence =
    baseConf === null ? 'low' : baseConf >= 0.8 ? 'high' : baseConf >= 0.5 ? 'medium' : 'low';

  return {
    nf_document_id: id,
    nf_number: { value: doc.extracted_nf_number, confidence: conf },
    emission_date: { value: doc.extracted_issue_date, confidence: conf },
    total_value: {
      value: doc.extracted_value !== null ? String(doc.extracted_value) : null,
      confidence: conf,
    },
    cnpj_emitter: { value: doc.extracted_issuer_cnpj, confidence: conf },
    company_name: { value: doc.extracted_issuer_name, confidence: conf },
    description: { value: null, confidence: 'low' },
    overall_confidence: conf,
    source: 'existing_extraction',
  };
}

// --- Handler principal ---

export async function ocrAnalyzeNf(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para usar OCR em NFs', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parsed = OcrAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: OcrAnalyzeInput = parsed.data;
  const supabase = getSupabaseClient(auth.token);

  console.log(`[ocr-analyze] user=${auth.userId} nf_document_id=${input.nf_document_id}`);

  // 1. Buscar documento NF
  const { data: doc, error: fetchError } = await supabase
    .from('nf_documents')
    .select(
      'id, file_name, drive_url, drive_file_id, ' +
      'extracted_issuer_name, extracted_issuer_cnpj, extracted_nf_number, ' +
      'extracted_value, extracted_issue_date, extraction_confidence',
    )
    .eq('id', input.nf_document_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !doc) {
    throw new AppError('NOT_FOUND', 'Documento NF nao encontrado', 404);
  }

  const nfDoc = doc as NfDocumentRow;

  // 2. Tentar extracao via Groq (usa metadados do arquivo — nome + URL)
  const serviceClient = getServiceClient();
  const prompt = buildOcrPrompt(nfDoc.file_name, nfDoc.drive_url);

  let ocrFields: Partial<Record<string, OcrField>> | null = null;

  try {
    const groqResponse = await callGroq(serviceClient, {
      system:
        'Voce e um sistema de extracao de dados de documentos fiscais brasileiros. ' +
        'Retorne APENAS JSON valido conforme solicitado, sem markdown nem texto adicional.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.1,
    });

    ocrFields = parseGroqOcrResponse(groqResponse.content);

    console.log(
      `[ocr-analyze] Groq OK input=${groqResponse.input_tokens} output=${groqResponse.output_tokens}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ocr-analyze] Groq erro (usando fallback): ${msg}`);
  }

  // 3. Fallback: se Groq nao retornou dados, usar extraidos existentes do banco
  if (!ocrFields) {
    console.log(`[ocr-analyze] fallback para dados existentes nf_document=${input.nf_document_id}`);
    return success(buildFallbackResult(input.nf_document_id, nfDoc));
  }

  // 4. Mesclar resultado Groq com dados existentes do banco
  //    Campos sem valor no Groq sao preenchidos pelos dados do banco (como fallback de baixa confianca)
  const mergedFields: Partial<Record<string, OcrField>> = {
    nf_number: ocrFields.nf_number ?? { value: nfDoc.extracted_nf_number, confidence: 'low' },
    emission_date: ocrFields.emission_date ?? { value: nfDoc.extracted_issue_date, confidence: 'low' },
    total_value: ocrFields.total_value ?? {
      value: nfDoc.extracted_value !== null ? String(nfDoc.extracted_value) : null,
      confidence: 'low',
    },
    cnpj_emitter: ocrFields.cnpj_emitter ?? { value: nfDoc.extracted_issuer_cnpj, confidence: 'low' },
    company_name: ocrFields.company_name ?? { value: nfDoc.extracted_issuer_name, confidence: 'low' },
    description: ocrFields.description ?? { value: null, confidence: 'low' },
  };

  const overallConfidence = computeOverallConfidence(mergedFields);

  const result: OcrAnalyzeResult = {
    nf_document_id: input.nf_document_id,
    nf_number: mergedFields.nf_number as OcrField,
    emission_date: mergedFields.emission_date as OcrField,
    total_value: mergedFields.total_value as OcrField,
    cnpj_emitter: mergedFields.cnpj_emitter as OcrField,
    company_name: mergedFields.company_name as OcrField,
    description: mergedFields.description as OcrField,
    overall_confidence: overallConfidence,
    source: 'groq_ocr',
  };

  // 5. Persistir campos com confianca >= medium no banco (fire-and-forget)
  try {
    const updateData: Record<string, unknown> = {};

    if (result.nf_number.value && result.nf_number.confidence !== 'low') {
      updateData.extracted_nf_number = result.nf_number.value;
    }
    if (result.emission_date.value && result.emission_date.confidence !== 'low') {
      updateData.extracted_issue_date = result.emission_date.value;
    }
    if (result.total_value.value && result.total_value.confidence !== 'low') {
      const parsed = parseFloat(result.total_value.value.replace(',', '.'));
      if (!isNaN(parsed)) updateData.extracted_value = parsed;
    }
    if (result.cnpj_emitter.value && result.cnpj_emitter.confidence !== 'low') {
      updateData.extracted_issuer_cnpj = result.cnpj_emitter.value;
    }
    if (result.company_name.value && result.company_name.confidence !== 'low') {
      updateData.extracted_issuer_name = result.company_name.value;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('nf_documents')
        .update(updateData)
        .eq('id', input.nf_document_id)
        .eq('tenant_id', auth.tenantId);

      console.log(
        `[ocr-analyze] campos persistidos: ${Object.keys(updateData).join(', ')}`,
      );
    }
  } catch (updateErr) {
    console.error('[ocr-analyze] falha ao persistir no banco (nao bloqueia):', updateErr);
  }

  console.log(
    `[ocr-analyze] concluido nf_document=${input.nf_document_id} ` +
    `overall_confidence=${overallConfidence} source=groq_ocr`,
  );

  return success(result);
}
