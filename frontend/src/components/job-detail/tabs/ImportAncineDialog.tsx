'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Loader2, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { AncinePdfData, AncineVersion } from '@/lib/ancine-pdf-parser'
import type { JobDetail } from '@/types/jobs'

interface ImportAncineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobDetail
}

interface VersionRow extends AncineVersion {
  selected: boolean
  duration: string
}

export function ImportAncineDialog({ open, onOpenChange, job }: ImportAncineDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parsing, setParsing] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [data, setData] = useState<AncinePdfData | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Limpar estado quando fecha o dialog
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
      setData(null)
      setVersions([])
      setParsing(false)
      setCreating(false)
      setProgress({ current: 0, total: 0 })
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
    setVersions([])

    // Criar blob URL para preview
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    const blobUrl = URL.createObjectURL(file)
    setPdfBlobUrl(blobUrl)

    try {
      const { parseAncinePdf } = await import('@/lib/ancine-pdf-parser')
      const parsed = await parseAncinePdf(file)
      setData(parsed)
      setVersions(
        parsed.versions.map(v => ({
          ...v,
          selected: true,
          duration: parsed.duration || '',
        })),
      )
    } catch (err) {
      console.error('[ancine-import] parse error:', err)
      toast.error('Erro ao extrair dados do PDF. Verifique se e um registro ANCINE valido.')
    } finally {
      setParsing(false)
    }

    // Limpar input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }, [pdfBlobUrl])

  // Toggle versao
  const toggleVersion = useCallback((index: number) => {
    setVersions(prev => prev.map((v, i) =>
      i === index ? { ...v, selected: !v.selected } : v
    ))
  }, [])

  // Atualizar duracao de uma versao
  const updateVersionDuration = useCallback((index: number, duration: string) => {
    setVersions(prev => prev.map((v, i) =>
      i === index ? { ...v, duration } : v
    ))
  }, [])

  // Selecionar/deselecionar todas
  const toggleAll = useCallback((checked: boolean) => {
    setVersions(prev => prev.map(v => ({ ...v, selected: checked })))
  }, [])

  const selectedCount = versions.filter(v => v.selected).length

  // Criar claquetes em batch (sequencial para manter numeracao)
  const handleCreateBatch = useCallback(async () => {
    if (!data) return
    const selected = versions.filter(v => v.selected)
    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma versao')
      return
    }

    setCreating(true)
    setProgress({ current: 0, total: selected.length })

    let created = 0
    let errors = 0

    for (const v of selected) {
      try {
        await apiMutate('claquete-generator', 'POST', {
          job_id: job.id,
          title: data.title || job.title || '',
          crt: v.crt,
          duration: v.duration,
          product: data.product,
          advertiser: data.advertiser || job.clients?.name || '',
          agency: data.agency || job.agencies?.name || '',
          director: data.director,
          type: data.type || 'COMUM',
          segment: data.segment || 'TODOS OS SEGMENTOS DE MERCADO',
          production_year: data.productionYear,
          production_company: data.productionCompany,
          cnpj: data.cnpj,
          audio_company: '',
          closed_caption: false,
          sap_key: false,
          libras: false,
          audio_description: false,
        })
        created++
        setProgress({ current: created, total: selected.length })
      } catch (err) {
        errors++
        console.error(`[ancine-import] erro criando claquete CRT ${v.crt}:`, err)
      }
    }

    queryClient.invalidateQueries({ queryKey: ['claquetes', job.id] })

    if (errors === 0) {
      toast.success(`${created} claquete${created > 1 ? 's' : ''} criada${created > 1 ? 's' : ''} com sucesso`)
      handleOpenChange(false)
    } else {
      toast.error(`${created} criadas, ${errors} com erro. Verifique a lista.`)
    }

    setCreating(false)
  }, [data, versions, job, queryClient, handleOpenChange])

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
                <embed
                  src={pdfBlobUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
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

            {/* Direita: dados extraidos */}
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

              {/* Versoes */}
              {versions.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Versoes ({selectedCount} de {versions.length} selecionadas)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCount === versions.length}
                        onCheckedChange={(checked) => toggleAll(!!checked)}
                      />
                      <span className="text-xs text-muted-foreground">Todas</span>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="w-10 p-2"></th>
                          <th className="text-left p-2 font-medium">Versao</th>
                          <th className="text-left p-2 font-medium">CRT</th>
                          <th className="text-left p-2 font-medium w-32">Duracao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((v, i) => (
                          <tr key={v.crt} className="border-b last:border-0">
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={v.selected}
                                onCheckedChange={() => toggleVersion(i)}
                              />
                            </td>
                            <td className="p-2 font-medium">{v.number}</td>
                            <td className="p-2 font-mono text-xs">{v.crt}</td>
                            <td className="p-2">
                              <Input
                                value={v.duration}
                                onChange={(e) => updateVersionDuration(i, e.target.value)}
                                placeholder='Ex: 30"'
                                className="h-7 text-sm"
                              />
                            </td>
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
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={creating || selectedCount === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Criando {progress.current}/{progress.total}...
                </>
              ) : (
                <>Criar {selectedCount} Claquete{selectedCount > 1 ? 's' : ''}</>
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
