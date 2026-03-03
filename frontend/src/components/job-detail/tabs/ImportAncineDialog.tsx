'use client'

import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Loader2, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { AncinePdfData } from '@/lib/ancine-pdf-parser'
import type { JobDetail } from '@/types/jobs'

interface ImportAncineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobDetail
  onSuccess?: () => void
}

export function ImportAncineDialog({ open, onOpenChange, job, onSuccess }: ImportAncineDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parsing, setParsing] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [data, setData] = useState<AncinePdfData | null>(null)
  const [saving, setSaving] = useState(false)

  // Limpar estado quando fecha o dialog
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
      setData(null)
      setParsing(false)
      setSaving(false)
    }
    onOpenChange(open)
  }, [onOpenChange, pdfBlobUrl])

  // Upload e parse do PDF
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF')
      return
    }

    setParsing(true)
    setData(null)

    // Criar blob URL para preview
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    const blobUrl = URL.createObjectURL(file)
    setPdfBlobUrl(blobUrl)

    try {
      const { parseAncinePdf } = await import('@/lib/ancine-pdf-parser')
      const parsed = await parseAncinePdf(file)
      setData(parsed)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[ancine-import] parse error:', err)
      toast.error(`Erro ao extrair dados do PDF: ${msg}`)
    } finally {
      setParsing(false)
    }

    // Limpar input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }, [pdfBlobUrl])

  // Registrar ANCINE — salvar dados extraidos no job
  const handleRegister = useCallback(async () => {
    if (!data) return

    setSaving(true)
    try {
      const currentCf = (job.custom_fields ?? {}) as Record<string, unknown>
      await apiMutate('jobs', 'PATCH', {
        ancine_number: data.crtPrincipal || null,
        custom_fields: {
          ...currentCf,
          ancine_status: 'registrado',
          ancine_registration: {
            crt_principal: data.crtPrincipal || '',
            versions: data.versions.map(v => ({ number: v.number, crt: v.crt })),
            title: data.title || '',
            duration: data.duration || '',
            type: data.type || '',
            product: data.product || '',
            production_year: data.productionYear || new Date().getFullYear(),
            director: data.director || '',
            advertiser: data.advertiser || '',
            agency: data.agency || '',
            production_company: data.productionCompany || '',
            cnpj: data.cnpj || '',
            segment: data.segment || '',
            imported_at: new Date().toISOString(),
          },
        },
      }, job.id)

      queryClient.invalidateQueries({ queryKey: ['job', job.id] })
      toast.success('Dados ANCINE registrados com sucesso')
      onSuccess?.()
      handleOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [data, job, queryClient, handleOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] !max-h-[95vh] sm:!max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Importar PDF ANCINE</DialogTitle>
        </DialogHeader>

        {/* Estado inicial: upload */}
        {!pdfBlobUrl && !parsing && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <FileText className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Selecione o PDF do registro ANCINE para extrair CRTs automaticamente
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4 mr-2" />
              Selecionar PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Parsing */}
        {parsing && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Extraindo dados do PDF...</p>
          </div>
        )}

        {/* Resultado: PDF + dados lado a lado */}
        {pdfBlobUrl && data && !parsing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[60vh] max-h-[75vh] overflow-hidden">
            {/* Esquerda: PDF preview */}
            <div className="flex flex-col min-h-0">
              <Label className="mb-2 text-sm font-medium">PDF Original (conferencia)</Label>
              <div className="flex-1 rounded-lg border overflow-hidden bg-muted min-h-[400px]">
                <iframe
                  src={pdfBlobUrl}
                  title="PDF ANCINE"
                  className="w-full h-full"
                  style={{ minHeight: '400px', border: 'none' }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 self-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3 mr-1" />
                Trocar PDF
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Direita: dados extraidos (readonly) */}
            <div className="flex flex-col min-h-0 overflow-y-auto">
              <Label className="mb-2 text-sm font-medium">Dados Extraidos</Label>

              {/* Campos principais */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <DataField label="CRT Principal" value={data.crtPrincipal} mono />
                <DataField label="Titulo" value={data.title} />
                <DataField label="Tipo" value={data.type} />
                <DataField label="Ano Producao" value={String(data.productionYear)} />
                <DataField label="Duracao" value={data.duration} />
                <DataField label="Produto" value={data.product} />
                <DataField label="Diretor" value={data.director} />
                <DataField label="Anunciante" value={data.advertiser} />
                <DataField label="Agencia" value={data.agency} />
                <DataField label="Produtora" value={data.productionCompany} />
                <DataField label="CNPJ" value={data.cnpj} mono />
                <DataField label="Segmento" value={data.segment} />
              </div>

              {/* Versoes (readonly) */}
              {data.versions.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Versoes ({data.versions.length})
                  </Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Versao</th>
                          <th className="text-left p-2 font-medium">CRT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.versions.map((v) => (
                          <tr key={v.crt} className="border-b last:border-0">
                            <td className="p-2 font-medium">{v.number}</td>
                            <td className="p-2 font-mono text-xs">{v.crt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Nenhuma versao com CRT encontrada no PDF. Verifique se e um registro ANCINE com versoes.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {data && !parsing && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegister}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>Registrar ANCINE</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Campo de dados extraido (readonly, para exibicao) */
function DataField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className={`truncate ${mono ? 'font-mono text-xs' : ''} ${value ? '' : 'text-muted-foreground italic'}`}>
        {value || 'Nao encontrado'}
      </p>
    </div>
  )
}
