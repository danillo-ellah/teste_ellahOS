'use client'

import { useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'
import { Undo2, Redo2, Trash2, Minus, Circle, Pen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --- Color palette ---

const COLORS = [
  { value: '#000000', label: 'Preto' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#ffffff', label: 'Borracha' },
] as const

// --- Stroke sizes ---

const SIZES = [
  { value: 2, label: 'Fino', icon: Minus },
  { value: 5, label: 'Medio', icon: Circle },
  { value: 10, label: 'Grosso', icon: Pen },
] as const

// --- Props ---

export interface DrawingCanvasRef {
  exportImage: () => Promise<string>
  clearCanvas: () => void
}

interface DrawingCanvasProps {
  backgroundImage?: string
  initialImage?: string
  className?: string
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  function DrawingCanvas({ backgroundImage, initialImage, className }, ref) {
    const canvasRef = useRef<ReactSketchCanvasRef>(null)
    const [color, setColor] = useState('#000000')
    const [strokeWidth, setStrokeWidth] = useState(5)
    const [isEraser, setIsEraser] = useState(false)

    // Load initial drawing paths when canvas mounts
    const hasLoadedRef = useRef(false)
    const handleCanvasReady = () => {
      if (initialImage && canvasRef.current && !hasLoadedRef.current) {
        hasLoadedRef.current = true
        // initialImage is a data URL — we load it as background if no backgroundImage
        // Otherwise we'd need SVG paths; for now initial drawings are view-only thumbnails
      }
    }

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        if (!canvasRef.current) throw new Error('Canvas not ready')
        return canvasRef.current.exportImage('png')
      },
      clearCanvas: () => {
        canvasRef.current?.clearCanvas()
      },
    }))

    function handleColorChange(c: string) {
      if (c === '#ffffff') {
        setIsEraser(true)
        canvasRef.current?.eraseMode(true)
      } else {
        setIsEraser(false)
        canvasRef.current?.eraseMode(false)
        setColor(c)
      }
    }

    function handleUndo() {
      canvasRef.current?.undo()
    }

    function handleRedo() {
      canvasRef.current?.redo()
    }

    function handleClear() {
      canvasRef.current?.clearCanvas()
    }

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => handleColorChange(c.value)}
                className={cn(
                  'size-7 rounded-full border-2 transition-all shrink-0',
                  c.value === '#ffffff'
                    ? isEraser
                      ? 'border-primary ring-2 ring-primary/30 bg-white'
                      : 'border-zinc-300 bg-white'
                    : !isEraser && color === c.value
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-zinc-300 dark:border-zinc-600',
                )}
                style={c.value !== '#ffffff' ? { backgroundColor: c.value } : undefined}
              />
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border" />

          {/* Stroke sizes */}
          <div className="flex items-center gap-1">
            {SIZES.map((s) => (
              <Button
                key={s.value}
                type="button"
                variant={!isEraser && strokeWidth === s.value ? 'default' : 'ghost'}
                size="icon"
                className="size-7"
                title={s.label}
                onClick={() => {
                  setStrokeWidth(s.value)
                  if (isEraser) {
                    setIsEraser(false)
                    canvasRef.current?.eraseMode(false)
                  }
                }}
              >
                <s.icon className="size-3.5" />
              </Button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="Desfazer"
              onClick={handleUndo}
            >
              <Undo2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="Refazer"
              onClick={handleRedo}
            >
              <Redo2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              title="Limpar tudo"
              onClick={handleClear}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="relative w-full aspect-video border border-border rounded-lg overflow-hidden bg-white"
          style={{ touchAction: 'none' }}
          onPointerDown={handleCanvasReady}
        >
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            eraserWidth={strokeWidth * 3}
            strokeColor={color}
            canvasColor="transparent"
            backgroundImage={backgroundImage ?? ''}
            preserveBackgroundImageAspectRatio="xMidYMid meet"
            style={{
              border: 'none',
              borderRadius: '0',
              width: '100%',
              height: '100%',
            }}
            exportWithBackgroundImage={!!backgroundImage}
          />
        </div>
      </div>
    )
  },
)
