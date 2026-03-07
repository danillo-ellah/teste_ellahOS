'use client'

import { CheckSquare, Plus, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChecklistItem } from '@/types/preproduction'

interface DynamicChecklistProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  readOnly?: boolean
  onAddExtraItem?: () => void
}

export function DynamicChecklist({
  items,
  onChange,
  readOnly = false,
  onAddExtraItem,
}: DynamicChecklistProps) {
  const checkedCount = items.filter((i) => i.checked).length
  const totalItems = items.length
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0

  function handleToggle(id: string, checked: boolean) {
    if (readOnly) return
    onChange(
      items.map((item) => (item.id === id ? { ...item, checked } : item)),
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <CheckSquare className="size-4" />
            Checklist Pre-Producao
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{totalItems} itens
            </span>
            {!readOnly && onAddExtraItem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onAddExtraItem}
              >
                <Plus className="size-3 mr-1" />
                Adicionar item
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum item no checklist
          </p>
        ) : (
          <ul className="space-y-3">
            {items
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`ppm-check-${item.id}`}
                    checked={item.checked}
                    onCheckedChange={(checked) =>
                      handleToggle(item.id, checked === true)
                    }
                    disabled={readOnly}
                  />
                  <label
                    htmlFor={`ppm-check-${item.id}`}
                    className={[
                      'text-sm select-none flex-1',
                      readOnly ? '' : 'cursor-pointer',
                      item.checked
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground',
                    ].join(' ')}
                  >
                    {item.label}
                  </label>
                  {item.is_extra && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      <Sparkles className="size-3 mr-0.5" />
                      extra
                    </Badge>
                  )}
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
