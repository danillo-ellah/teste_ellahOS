'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  FileDown,
  ImageIcon,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'
import { AncineSection } from '@/components/job-detail/tabs/AncineSection'

// Tipos da claquete
interface Claquete {
  id: string
  job_id: string
  version: number
  title: string
  duration: string
  product: string
  advertiser: string
  agency: string
  director: string
  type: string
  segment: string
  crt: string
  production_company: string
  cnpj: string
  audio_company: string
  production_year: number
  closed_caption: boolean
  sap_key: boolean
  libras: boolean
  audio_description: boolean
  pdf_url: string | null
  png_url: string | null
  created_at: string
}

interface ClaqueteFormData {
  title: string
  duration: string
  product: string
  advertiser: string
  agency: string
  director: string
  type: string
  segment: string
  crt: string
  production_company: string
  cnpj: string
  audio_company: string
  production_year: number
  closed_caption: boolean
  sap_key: boolean
  libras: boolean
  audio_description: boolean
}

const CLAQUETE_TYPES = ['COMUM', 'ANIMACAO', 'DOCUMENTARIO', 'FICCAO', 'MUSICAL', 'OUTRO']

interface TabClaqueteProps {
  job: JobDetail
}

// Helper: preencher form com dados do job
function defaultFormFromJob(job: JobDetail): ClaqueteFormData {
  return {
    title: job.title ?? '',
    duration: '',
    product: '',
    advertiser: job.clients?.name ?? '',
    agency: job.agencies?.name ?? '',
    director: '',
    type: 'COMUM',
    segment: 'TODOS OS SEGMENTOS DE MERCADO',
    crt: '',
    production_company: '',
    cnpj: '',
    audio_company: '',
    production_year: new Date().getFullYear(),
    closed_caption: false,
    sap_key: false,
    libras: false,
    audio_description: false,
  }
}

// ---------------------------------------------------------------------------
// Client-side export helpers (Full HD 1920x1080)
// Uses offscreen div (not iframe) to avoid cross-origin issues with html-to-image.
// The HTML is parsed and injected into a shadow DOM container to isolate styles.
// ---------------------------------------------------------------------------

/** Render claquete HTML in an offscreen div and capture as JPEG data URL */
async function captureClaqueteAsJpeg(html: string): Promise<string> {
  const { toJpeg } = await import('html-to-image')

  // Create offscreen container
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;top:-20000px;left:-20000px;width:1920px;height:1080px;overflow:hidden;z-index:-9999;'
  document.body.appendChild(wrapper)

  try {
    // Parse the HTML and extract body content + styles
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Copy styles
    const styles = doc.querySelectorAll('style')
    styles.forEach((s) => {
      const style = document.createElement('style')
      style.textContent = s.textContent
      wrapper.appendChild(style)
    })

    // Copy body content
    const bodyContent = doc.body.innerHTML
    const bodyDiv = document.createElement('div')
    bodyDiv.style.cssText = 'width:1920px;height:1080px;overflow:hidden;position:relative;font-family:Arial,Helvetica,sans-serif;'
    bodyDiv.innerHTML = bodyContent
    wrapper.appendChild(bodyDiv)

    // Wait for images (base64) to load
    const images = bodyDiv.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
          }),
      ),
    )

    // Extra wait for rendering
    await new Promise((r) => setTimeout(r, 200))

    const dataUrl = await toJpeg(bodyDiv, {
      width: 1920,
      height: 1080,
      quality: 0.95,
      pixelRatio: 1,
      cacheBust: true,
    })

    return dataUrl
  } finally {
    document.body.removeChild(wrapper)
  }
}

/** Export claquete as JPEG file download (1920x1080) */
async function exportAsJpeg(html: string, filename: string) {
  const dataUrl = await captureClaqueteAsJpeg(html)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.jpg`
  a.click()
}

/** Export claquete as PDF (landscape Full HD page) */
async function exportAsPdf(html: string, filename: string) {
  const { default: jsPDF } = await import('jspdf')
  const dataUrl = await captureClaqueteAsJpeg(html)

  // Landscape PDF with 1920x1080 pixel dimensions
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
  })

  pdf.addImage(dataUrl, 'JPEG', 0, 0, 1920, 1080)
  pdf.save(`${filename}.pdf`)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TabClaquete({ job }: TabClaqueteProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewClaquete, setPreviewClaquete] = useState<Claquete | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [form, setForm] = useState<ClaqueteFormData>(() => defaultFormFromJob(job))

  // Buscar claquetes do job
  const { data: claquetes, isLoading } = useQuery({
    queryKey: ['claquetes', job.id],
    queryFn: async () => {
      const res = await apiGet<Claquete[]>('claquete-generator', { job_id: job.id }, 'list')
      return res.data
    },
  })

  // Criar claquete
  const createMutation = useMutation({
    mutationFn: async (data: ClaqueteFormData) => {
      const res = await apiMutate<Claquete & { _preview_html: string }>(
        'claquete-generator',
        'POST',
        { ...data, job_id: job.id },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claquetes', job.id] })
      toast.success('Claquete criada com sucesso')
      setShowForm(false)
      setForm(defaultFormFromJob(job))
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Deletar claquete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiMutate('claquete-generator', 'DELETE', undefined, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claquetes', job.id] })
      toast.success('Claquete removida')
      setDeleteId(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Fetch HTML for preview / export
  const fetchHtml = useCallback(async (claqueteId: string): Promise<string | null> => {
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const res = await fetch(`${SUPABASE_URL}/functions/v1/claquete-generator/preview/${claqueteId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar preview')
      return await res.text()
    } catch {
      toast.error('Erro ao carregar dados da claquete')
      return null
    }
  }, [])

  // Preview HTML
  const handlePreview = useCallback(async (claquete: Claquete) => {
    const html = await fetchHtml(claquete.id)
    if (html) {
      setPreviewClaquete(claquete)
      setPreviewHtml(html)
    }
  }, [fetchHtml])

  // Nome do arquivo no padrao Apps Script: CLAQUETE_{duration}_{title}_{advertiser}
  const buildFilename = useCallback((c: Claquete) => {
    const parts = ['CLAQUETE', c.duration, c.title, c.advertiser]
      .map(s => (s || '').trim())
      .filter(Boolean)
    return parts.join('_').replace(/\s+/g, ' ')
  }, [])

  // Export as JPEG
  const handleExportJpeg = useCallback(async (claquete: Claquete) => {
    setExporting(claquete.id + '-jpeg')
    try {
      const html = await fetchHtml(claquete.id)
      if (!html) return
      await exportAsJpeg(html, buildFilename(claquete))
      toast.success('JPEG exportado (1920x1080 Full HD)')
    } catch (err) {
      toast.error('Erro ao exportar JPEG')
      console.error('[claquete] export JPEG error:', err)
    } finally {
      setExporting(null)
    }
  }, [fetchHtml, buildFilename])

  // Export as PDF
  const handleExportPdf = useCallback(async (claquete: Claquete) => {
    setExporting(claquete.id + '-pdf')
    try {
      const html = await fetchHtml(claquete.id)
      if (!html) return
      await exportAsPdf(html, buildFilename(claquete))
      toast.success('PDF exportado (Full HD)')
    } catch (err) {
      toast.error('Erro ao exportar PDF')
      console.error('[claquete] export PDF error:', err)
    } finally {
      setExporting(null)
    }
  }, [fetchHtml, buildFilename])

  // Export from preview dialog
  const handlePreviewExportJpeg = useCallback(async () => {
    if (!previewHtml || !previewClaquete) return
    setExporting('preview-jpeg')
    try {
      await exportAsJpeg(previewHtml, buildFilename(previewClaquete))
      toast.success('JPEG exportado (1920x1080 Full HD)')
    } catch {
      toast.error('Erro ao exportar JPEG')
    } finally {
      setExporting(null)
    }
  }, [previewHtml, previewClaquete, buildFilename])

  const handlePreviewExportPdf = useCallback(async () => {
    if (!previewHtml || !previewClaquete) return
    setExporting('preview-pdf')
    try {
      await exportAsPdf(previewHtml, buildFilename(previewClaquete))
      toast.success('PDF exportado (Full HD)')
    } catch {
      toast.error('Erro ao exportar PDF')
    } finally {
      setExporting(null)
    }
  }, [previewHtml, previewClaquete, buildFilename])

  const updateField = <K extends keyof ClaqueteFormData>(key: K, value: ClaqueteFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Secao ANCINE (registro, CRT, checklist) */}
      <AncineSection job={job} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Claquetes ANCINE</h3>
          <p className="text-sm text-muted-foreground">
            Documento regulatorio obrigatorio para obras veiculadas em TV aberta — Full HD 1920x1080
          </p>
        </div>
        <Button onClick={() => { setForm(defaultFormFromJob(job)); setShowForm(true) }}>
          <Plus className="size-4 mr-2" />
          Nova Claquete
        </Button>
      </div>

      {/* Lista de claquetes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !claquetes?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Nenhuma claquete criada para este job</p>
            <Button variant="outline" className="mt-4" onClick={() => { setForm(defaultFormFromJob(job)); setShowForm(true) }}>
              <Plus className="size-4 mr-2" />
              Criar primeira claquete
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {claquetes.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <Badge variant="secondary">v{c.version}</Badge>
                    <Badge variant="outline">{c.duration}</Badge>
                    {c.crt && <Badge variant="outline" className="font-mono text-xs">CRT: {c.crt}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(c)}>
                      <Eye className="size-4 mr-1" /> Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportPdf(c)}
                      disabled={!!exporting}
                    >
                      {exporting === c.id + '-pdf' ? (
                        <Loader2 className="size-4 mr-1 animate-spin" />
                      ) : (
                        <FileDown className="size-4 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportJpeg(c)}
                      disabled={!!exporting}
                    >
                      {exporting === c.id + '-jpeg' ? (
                        <Loader2 className="size-4 mr-1 animate-spin" />
                      ) : (
                        <ImageIcon className="size-4 mr-1" />
                      )}
                      JPEG
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Anunciante:</span> {c.advertiser || '\u2014'}</div>
                  <div><span className="text-muted-foreground">Agencia:</span> {c.agency || '\u2014'}</div>
                  <div><span className="text-muted-foreground">Diretor:</span> {c.director || '\u2014'}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {c.type}</div>
                  <div><span className="text-muted-foreground">Produtora:</span> {c.production_company || '\u2014'}</div>
                  <div><span className="text-muted-foreground">Audio:</span> {c.audio_company || '\u2014'}</div>
                  <div><span className="text-muted-foreground">Ano:</span> {c.production_year}</div>
                  <div>
                    <span className="text-muted-foreground">Acessibilidade:</span>{' '}
                    {[
                      c.closed_caption && 'CC',
                      c.sap_key && 'SAP',
                      c.libras && 'LIBRAS',
                      c.audio_description && 'AD',
                    ].filter(Boolean).join(', ') || 'Nenhuma'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criacao */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Claquete</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titulo da peca *</Label>
              <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Ex: CHA REPARACAO" />
            </div>

            <div>
              <Label>Duracao *</Label>
              <Input value={form.duration} onChange={e => updateField('duration', e.target.value)} placeholder='Ex: 30"' />
            </div>

            <div>
              <Label>Produto</Label>
              <Input value={form.product} onChange={e => updateField('product', e.target.value)} placeholder="Ex: INSTITUCIONAL" />
            </div>

            <div>
              <Label>Anunciante</Label>
              <Input value={form.advertiser} onChange={e => updateField('advertiser', e.target.value)} />
            </div>

            <div>
              <Label>Agencia</Label>
              <Input value={form.agency} onChange={e => updateField('agency', e.target.value)} />
            </div>

            <div>
              <Label>Diretor de Cena</Label>
              <Input value={form.director} onChange={e => updateField('director', e.target.value)} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => updateField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAQUETE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Segmento</Label>
              <Input value={form.segment} onChange={e => updateField('segment', e.target.value)} />
            </div>

            <div>
              <Label>Numero CRT (ANCINE)</Label>
              <Input value={form.crt} onChange={e => updateField('crt', e.target.value)} placeholder="Ex: 20250044600006" className="font-mono" />
            </div>

            <div>
              <Label>Produtora de Audio</Label>
              <Input value={form.audio_company} onChange={e => updateField('audio_company', e.target.value)} placeholder="Ex: IELOW SOUND" />
            </div>

            <div>
              <Label>Produtora</Label>
              <Input value={form.production_company} onChange={e => updateField('production_company', e.target.value)} placeholder="Preenchido automaticamente do tenant" />
            </div>

            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => updateField('cnpj', e.target.value)} placeholder="Preenchido automaticamente do tenant" />
            </div>

            <div>
              <Label>Ano de Producao</Label>
              <Input type="number" value={form.production_year} onChange={e => updateField('production_year', Number(e.target.value))} />
            </div>

            {/* Flags de acessibilidade */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Acessibilidade</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="closed_caption" className="cursor-pointer">Closed Caption</Label>
                  <Switch id="closed_caption" checked={form.closed_caption} onCheckedChange={v => updateField('closed_caption', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sap_key" className="cursor-pointer">Tecla SAP</Label>
                  <Switch id="sap_key" checked={form.sap_key} onCheckedChange={v => updateField('sap_key', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="libras" className="cursor-pointer">LIBRAS</Label>
                  <Switch id="libras" checked={form.libras} onCheckedChange={v => updateField('libras', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="audio_description" className="cursor-pointer">Audiodescricao</Label>
                  <Switch id="audio_description" checked={form.audio_description} onCheckedChange={v => updateField('audio_description', v)} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.title || !form.duration}
            >
              {createMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Criar Claquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog — Full HD aspect ratio */}
      <Dialog open={!!previewHtml} onOpenChange={() => { setPreviewHtml(null); setPreviewClaquete(null) }}>
        <DialogContent className="max-w-[95vw] w-[1800px] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>
              {previewClaquete ? buildFilename(previewClaquete) : 'Preview da Claquete'} — Full HD 1920x1080
            </DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <PreviewContent
              html={previewHtml}
              exporting={exporting}
              onExportPdf={handlePreviewExportPdf}
              onExportJpeg={handlePreviewExportJpeg}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmacao de delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover claquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A claquete sera marcada como removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PreviewContent — uses CSS-only scaling (no JS timing issues)
// The trick: a wrapper with aspect-ratio 16/9 and a 1920x1080 iframe
// scaled down using CSS transform. The wrapper's aspect-ratio ensures
// the container always has the correct height regardless of width.
// ---------------------------------------------------------------------------

function PreviewContent({
  html,
  exporting,
  onExportPdf,
  onExportJpeg,
}: {
  html: string
  exporting: string | null
  onExportPdf: () => void
  onExportJpeg: () => void
}) {
  return (
    <>
      {/*
        Outer div: takes full width, aspect-ratio 16/9 gives correct height.
        Inner iframe: 1920x1080 native, scaled down to fit via CSS.
        The scale factor = containerWidth / 1920, but since we use
        width:100% + aspect-ratio, we can use a CSS calc trick:
        scale = 100% of container width / 1920px
        We achieve this by setting the iframe width/height in the style
        and using transform with a known ratio.
      */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
        className="rounded-lg border bg-white"
      >
        {/*
          The iframe is absolutely positioned at 1920x1080.
          We use an inline style with CSS calc for the scale.
          Unfortunately CSS calc can't divide px by px to get unitless,
          so we use a ResizeObserver-free approach: the iframe is placed
          inside a div that we know is exactly containerWidth x (containerWidth * 9/16).
          We set the iframe to 1920x1080 and scale it.

          Approach: set the iframe inside another div with width/height 100%,
          and use CSS zoom (widely supported) as a simpler alternative to transform.
        */}
        <iframe
          sandbox="allow-same-origin"
          srcDoc={html}
          title="Preview Claquete"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1920px',
            height: '1080px',
            border: 'none',
            transformOrigin: 'top left',
            /* Use percentage-based transform: 100% of parent = parent width */
          }}
          ref={(el) => {
            // One-shot ref: calculate scale once the element is in the DOM
            if (!el) return
            const tryScale = () => {
              const parent = el.parentElement
              if (!parent || parent.offsetWidth === 0) {
                // Dialog still animating, retry
                requestAnimationFrame(tryScale)
                return
              }
              const scale = parent.offsetWidth / 1920
              el.style.transform = `scale(${scale})`
            }
            tryScale()
          }}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onExportPdf}
          disabled={!!exporting}
        >
          {exporting === 'preview-pdf' ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="size-4 mr-2" />
          )}
          Exportar PDF
        </Button>
        <Button
          onClick={onExportJpeg}
          disabled={!!exporting}
        >
          {exporting === 'preview-jpeg' ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <ImageIcon className="size-4 mr-2" />
          )}
          Exportar JPEG (Full HD)
        </Button>
      </div>
    </>
  )
}
