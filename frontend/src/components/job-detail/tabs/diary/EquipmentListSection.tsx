'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EquipmentItem } from '@/types/production-diary'

interface EquipmentListSectionProps {
  equipment: EquipmentItem[]
  onChange: (equipment: EquipmentItem[]) => void
}

function emptyEquipment(): EquipmentItem {
  return { name: '', quantity: null, notes: null }
}

export function EquipmentListSection({ equipment, onChange }: EquipmentListSectionProps) {
  // IDs estáveis por item — evita re-render com key por índice ao remover/reordenar
  const [ids, setIds] = useState<string[]>(() => equipment.map(() => crypto.randomUUID()))

  function updateItem(index: number, partial: Partial<EquipmentItem>) {
    const updated = equipment.map((e, i) => (i === index ? { ...e, ...partial } : e))
    onChange(updated)
  }

  function removeItem(index: number) {
    setIds((prev) => prev.filter((_, i) => i !== index))
    onChange(equipment.filter((_, i) => i !== index))
  }

  function addItem() {
    setIds((prev) => [...prev, crypto.randomUUID()])
    onChange([...equipment, emptyEquipment()])
  }

  return (
    <div className="space-y-3">
      {equipment.map((item, i) => (
        <div
          key={ids[i]}
          className="flex items-start gap-2 p-3 rounded-md border border-border bg-muted/30"
        >
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="Nome do equipamento *"
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              className="h-10 text-sm sm:col-span-1"
            />
            <Input
              type="number"
              min={0}
              placeholder="Quantidade"
              value={item.quantity ?? ''}
              onChange={(e) =>
                updateItem(i, { quantity: e.target.value ? Number(e.target.value) : null })
              }
              className="h-10 text-sm"
            />
            <Input
              placeholder="Observacao"
              value={item.notes ?? ''}
              onChange={(e) => updateItem(i, { notes: e.target.value || null })}
              className="h-10 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
            onClick={() => removeItem(i)}
            aria-label={`Remover ${item.name || 'equipamento'}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9">
        <Plus className="size-3.5 mr-1.5" />
        Adicionar equipamento
      </Button>
    </div>
  )
}
