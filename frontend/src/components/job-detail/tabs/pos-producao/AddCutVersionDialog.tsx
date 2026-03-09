'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateCutVersion } from '@/hooks/usePosProducao'
import { ApiRequestError } from '@/lib/api'
import type { CutVersionType } from '@/types/pos-producao'

interface AddCutVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  deliverableId: string
}

export function AddCutVersionDialog({ open, onOpenChange, jobId, deliverableId }: AddCutVersionDialogProps) {
  const [versionType, setVersionType] = useState<CutVersionType>('offline')
  const [reviewUrl, setReviewUrl] = useState('')
  const [notes, setNotes] = useState('')
  const { mutateAsync: createVersion, isPending } = useCreateCutVersion(jobId, deliverableId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createVersion({
        version_type: versionType,
        review_url: reviewUrl.trim() || '',
        revision_notes: notes.trim() || '',
      })
      toast.success('Versao criada')
      setVersionType('offline')
      setReviewUrl('')
      setNotes('')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao criar versao'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Nova Versao de Corte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tipo</Label>
            <div className="flex gap-2">
              {(['offline', 'online'] as CutVersionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVersionType(t)}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors min-h-[44px] ${
                    versionType === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  {t === 'offline' ? 'Offline' : 'Online'}
                </button>
              ))}
            </div>
          </div>

          {/* URL de review */}
          <div className="space-y-2">
            <Label htmlFor="review-url" className="text-xs font-medium">
              Link de Review <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="review-url"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://frame.io/..."
              className="h-9 text-xs"
              disabled={isPending}
              type="url"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="cut-notes" className="text-xs font-medium">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="cut-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descricao da versao, principais alteracoes..."
              className="text-xs min-h-[80px] resize-none"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              <Plus className="size-3.5" />
              {isPending ? 'Criando...' : 'Criar Versao'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
