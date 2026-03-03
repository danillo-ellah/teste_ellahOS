import { useMutation } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'

// Resultado estruturado retornado pelo endpoint ocr-analyze
export interface OcrResult {
  nf_document_id: string
  nf_number: string | null
  emission_date: string | null
  total_value: number | null
  cnpj_emitter: string | null
  company_name: string | null
  description: string | null
  confidence: 'high' | 'medium' | 'low'
}

// Hook para acionar OCR de uma NF via Groq Vision API.
// Envia o nf_document_id e recebe os campos extraidos da NF para pre-preencher
// o formulario de validacao.
//
// Uso:
//   const { mutate, isPending, data, error } = useOcrAnalyze()
//   mutate(nfDocumentId)
//   // data?.data contém OcrResult após sucesso
export function useOcrAnalyze() {
  return useMutation({
    mutationFn: (nfDocumentId: string) =>
      apiMutate<OcrResult>(
        'nf-processor',
        'POST',
        { nf_document_id: nfDocumentId },
        'ocr-analyze',
      ),
  })
}
