'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { FileDown, Share2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { ShootingDayOrder, ODTemplate } from '@/types/shooting-day-order'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ODPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  od: ShootingDayOrder | null
  jobId: string
}

// ---------------------------------------------------------------------------
// Helper: busca o HTML de preview na Edge Function
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function fetchPreviewHtml(odId: string, template: ODTemplate): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/shooting-day-order/${odId}/preview?template=${template}`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } },
  )

  if (!res.ok) {
    throw new Error(`Falha ao carregar preview: ${res.status}`)
  }

  return await res.text()
}

// ---------------------------------------------------------------------------
// Subcomponente: area de preview com iframe escalado (padrao TabClaquete)
// A4 portrait: 794px largura x 1123px altura (96dpi)
// ---------------------------------------------------------------------------

const A4_WIDTH_PX  = 794
const A4_HEIGHT_PX = 1123

function PreviewIframe({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef    = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const iframe    = iframeRef.current
    if (!container || !iframe) return

    const updateScale = () => {
      const w = container.offsetWidth
      if (w > 0) {
        const scale = w / A4_WIDTH_PX
        iframe.style.transform = `scale(${scale})`
      }
    }

    const observer = new ResizeObserver(updateScale)
    observer.observe(container)
    updateScale()

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border bg-white"
      style={{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        srcDoc={html}
        title="Preview Ordem do Dia"
        style={{
          position:        'absolute',
          top:             0,
          left:            0,
          width:           `${A4_WIDTH_PX}px`,
          height:          `${A4_HEIGHT_PX}px`,
          border:          'none',
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ODPreviewDialog({ open, onOpenChange, od, jobId: _jobId }: ODPreviewDialogProps) {
  const [template, setTemplate]   = useState<ODTemplate>('classico')
  const [html, setHtml]           = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing]     = useState(false)

  // Busca HTML toda vez que o dialog abre ou o template muda
  useEffect(() => {
    if (!open || !od) {
      setHtml(null)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchPreviewHtml(od.id, template)
      .then((result) => {
        if (!cancelled) setHtml(result)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ODPreviewDialog] fetchPreviewHtml:', err)
          toast.error('Erro ao carregar preview da Ordem do Dia')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, od, template])

  // Limpa o estado ao fechar
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      setHtml(null)
      setTemplate('classico')
    }
    onOpenChange(next)
  }, [onOpenChange])

  // Exportar PDF usando od-pdf-generator (jsPDF puro, sem dependencias extras)
  const handleExportPdf = useCallback(async () => {
    if (!od) return
    setExporting(true)
    try {
      const { generateODPdf } = await import('@/lib/od-pdf-generator')
      const pdf = await generateODPdf(od)
      const safeName = od.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
      pdf.save(`OD_${safeName || od.id}.pdf`)
      toast.success('PDF exportado com sucesso')
    } catch (err) {
      toast.error('Erro ao gerar PDF')
      console.error('[ODPreviewDialog] generateODPdf:', err)
    } finally {
      setExporting(false)
    }
  }, [od])

  // Compartilhar via WhatsApp (dispara endpoint share na EF)
  const handleShare = useCallback(async () => {
    if (!od) return
    setSharing(true)
    try {
      await apiMutate('shooting-day-order', 'POST', { send_to_team: true }, `${od.id}/share`)
      toast.success('Ordem do Dia compartilhada via WhatsApp')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setSharing(false)
    }
  }, [od])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">
            Preview — {od?.title ?? 'Ordem do Dia'}
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de template */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Template:</span>
          <Button
            size="sm"
            variant={template === 'classico' ? 'default' : 'outline'}
            onClick={() => setTemplate('classico')}
          >
            Classico
          </Button>
          <Button
            size="sm"
            variant={template === 'moderno' ? 'default' : 'outline'}
            onClick={() => setTemplate('moderno')}
          >
            Moderno
          </Button>
        </div>

        {/* Area de preview */}
        {loading ? (
          <Skeleton className="w-full" style={{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }} />
        ) : html ? (
          <PreviewIframe html={html} />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground text-sm"
            style={{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }}
          >
            Nenhum preview disponivel
          </div>
        )}

        {/* Acoes */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exporting || loading || !od}
          >
            {exporting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="size-4 mr-2" />
            )}
            Exportar PDF
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing || loading || !od}
          >
            {sharing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="size-4 mr-2" />
            )}
            Compartilhar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
