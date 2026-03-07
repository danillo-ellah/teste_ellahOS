'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PpmDecision } from '@/types/preproduction'

interface PpmDecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  decision?: PpmDecision | null
  currentUserName: string
  onSave: (decision: PpmDecision) => void
}

export function PpmDecisionDialog({
  open,
  onOpenChange,
  decision,
  currentUserName,
  onSave,
}: PpmDecisionDialogProps) {
  const isEdit = !!decision
  const [date, setDate] = useState(decision?.date ?? new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(decision?.description ?? '')
  const [responsible, setResponsible] = useState(decision?.responsible ?? '')

  function handleSave() {
    if (!description.trim()) return

    onSave({
      id: decision?.id ?? crypto.randomUUID(),
      date,
      description: description.trim(),
      responsible: responsible.trim() || null,
      created_by_name: decision?.created_by_name ?? currentUserName,
      created_at: decision?.created_at ?? new Date().toISOString(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar decisao' : 'Nova decisao da PPM'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="decision-date">Data</Label>
            <Input
              id="decision-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-fit"
            />
          </div>
          <div>
            <Label htmlFor="decision-desc">Decisao</Label>
            <Textarea
              id="decision-desc"
              placeholder="Descreva a decisao tomada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>
          <div>
            <Label htmlFor="decision-resp">Responsavel (opcional)</Label>
            <Input
              id="decision-resp"
              placeholder="Quem e responsavel por executar"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!description.trim()}>
            {isEdit ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
