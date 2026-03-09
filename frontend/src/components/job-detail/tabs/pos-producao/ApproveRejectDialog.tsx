'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdateCutVersion } from '@/hooks/usePosProducao'
import { ApiRequestError } from '@/lib/api'
import type { CutVersion } from '@/types/pos-producao'

interface ApproveRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  deliverableId: string
  version: CutVersion
}

export function ApproveRejectDialog({
  open,
  onOpenChange,
  jobId,
  deliverableId,
  version,
}: ApproveRejectDialogProps) {
  const [notes, setNotes] = useState('')
  const [pendingAction, setPendingAction] = useState<'aprovado' | 'rejeitado' | null>(null)
  const { mutateAsync: updateVersion, isPending } = useUpdateCutVersion(jobId, deliverableId)

  async function handleAction(action: 'aprovado' | 'rejeitado') {
    if (action === 'rejeitado' && !notes.trim()) {
      toast.error('Notas de revisao sao obrigatorias ao rejeitar')
      return
    }
    setPendingAction(action)
    try {
      await updateVersion({
        versionId: version.id,
        status: action,
        revision_notes: notes.trim() || undefined,
      })
      toast.success(action === 'aprovado' ? 'Versao aprovada' : 'Versao rejeitada')
      setNotes('')
      setPendingAction(null)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao processar acao'
      toast.error(msg)
      setPendingAction(null)
    }
  }

  const versionLabel = `V${version.version_number} (${version.version_type})`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Avaliar Versao {versionLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="revision-notes" className="text-xs font-medium">
              Notas de Revisao{' '}
              <span className="text-muted-foreground font-normal">(obrigatorio ao rejeitar)</span>
            </Label>
            <Textarea
              id="revision-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva os pontos de revisao ou feedback de aprovacao..."
              className="text-xs min-h-[100px] resize-none"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="sm:order-first"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => handleAction('rejeitado')}
            disabled={isPending || !notes.trim()}
            className="gap-1.5"
          >
            <XCircle className="size-3.5" />
            {pendingAction === 'rejeitado' ? 'Rejeitando...' : 'Rejeitar'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleAction('aprovado')}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {pendingAction === 'aprovado' ? 'Aprovando...' : 'Aprovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
