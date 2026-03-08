'use client'

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
  function updateItem(index: number, partial: Partial<EquipmentItem>) {
    const updated = equipment.map((e, i) => (i === index ? { ...e, ...partial } : e))
    onChange(updated)
  }

  function removeItem(index: number) {
    onChange(equipment.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...equipment, emptyEquipment()])
  }

  return (
    <div className="space-y-3">
      {equipment.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30"
        >
          <Input
            placeholder="Equipamento *"
            value={item.name}
            onChange={(e) => updateItem(i, { name: e.target.value })}
            className="h-8 text-sm flex-1"
          />
          <Input
            type="number"
            min={0}
            placeholder="Qtd"
            value={item.quantity ?? ''}
            onChange={(e) =>
              updateItem(i, { quantity: e.target.value ? Number(e.target.value) : null })
            }
            className="h-8 text-sm w-20"
          />
          <Input
            placeholder="Obs"
            value={item.notes ?? ''}
            onChange={(e) => updateItem(i, { notes: e.target.value || null })}
            className="h-8 text-sm w-32"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(i)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="size-3.5 mr-1.5" />
        Adicionar equipamento
      </Button>
    </div>
  )
}
