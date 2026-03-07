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
import type { ChecklistItem } from '@/types/preproduction'

interface AddChecklistItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: ChecklistItem) => void
  nextPosition: number
}

export function AddChecklistItemDialog({
  open,
  onOpenChange,
  onAdd,
  nextPosition,
}: AddChecklistItemDialogProps) {
  const [label, setLabel] = useState('')

  function handleAdd() {
    if (!label.trim()) return

    onAdd({
      id: crypto.randomUUID(),
      label: label.trim(),
      checked: false,
      position: nextPosition,
      is_extra: true,
    })
    setLabel('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar item ao checklist</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="extra-label">Descricao do item</Label>
          <Input
            id="extra-label"
            placeholder="Ex: Teste de equipamento no set"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1.5"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Este item sera marcado como &quot;extra&quot; (adicionado alem do
            template)
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!label.trim()}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
