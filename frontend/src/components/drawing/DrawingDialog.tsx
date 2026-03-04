'use client'

import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DrawingCanvas, type DrawingCanvasRef } from './DrawingCanvas'

// --- Props ---

interface DrawingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  backgroundImage?: string
  initialImage?: string
  onSave: (dataUrl: string) => Promise<void>
}

export function DrawingDialog({
  open,
  onOpenChange,
  title,
  backgroundImage,
  initialImage,
  onSave,
}: DrawingDialogProps) {
  const canvasRef = useRef<DrawingCanvasRef>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!canvasRef.current) return
    setSaving(true)
    try {
      const dataUrl = await canvasRef.current.exportImage()
      await onSave(dataUrl)
      onOpenChange(false)
    } catch {
      // Error handled by parent via onSave
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Desenhar — {title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <DrawingCanvas
            ref={canvasRef}
            backgroundImage={backgroundImage}
            initialImage={initialImage}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar Desenho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
