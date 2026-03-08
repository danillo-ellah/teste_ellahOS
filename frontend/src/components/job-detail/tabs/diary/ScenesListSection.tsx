'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SceneItem, SceneStatus } from '@/types/production-diary'

interface ScenesListSectionProps {
  scenes: SceneItem[]
  onChange: (scenes: SceneItem[]) => void
  totalTakes: string
  onTotalTakesChange: (value: string) => void
}

const STATUS_CONFIG: Record<SceneStatus, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  incompleta: { label: 'Incompleta', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  nao_gravada: { label: 'Nao gravada', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

function emptyScene(): SceneItem {
  return { scene_number: '', description: null, takes: 0, ok_take: null, status: 'ok' }
}

export function ScenesListSection({
  scenes,
  onChange,
  totalTakes,
  onTotalTakesChange,
}: ScenesListSectionProps) {
  const hasScenes = scenes.length > 0
  const computedTakes = hasScenes ? scenes.reduce((sum, s) => sum + s.takes, 0) : null

  function updateScene(index: number, partial: Partial<SceneItem>) {
    const updated = scenes.map((s, i) => (i === index ? { ...s, ...partial } : s))
    onChange(updated)
  }

  function removeScene(index: number) {
    onChange(scenes.filter((_, i) => i !== index))
  }

  function addScene() {
    onChange([...scenes, emptyScene()])
  }

  return (
    <div className="space-y-3">
      {scenes.map((scene, i) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded-md border border-border bg-muted/30">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Linha 1: numero da cena + descricao */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                placeholder="Cena *"
                value={scene.scene_number}
                onChange={(e) => updateScene(i, { scene_number: e.target.value })}
                className="h-10 sm:col-span-1"
              />
              <Input
                placeholder="Descricao da cena"
                value={scene.description ?? ''}
                onChange={(e) => updateScene(i, { description: e.target.value || null })}
                className="h-10 sm:col-span-3"
              />
            </div>
            {/* Linha 2: takes + take ok + status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Takes"
                value={scene.takes || ''}
                onChange={(e) => updateScene(i, { takes: Number(e.target.value) || 0 })}
                className="h-10"
              />
              <Input
                type="number"
                min={0}
                placeholder="Take OK"
                value={scene.ok_take ?? ''}
                onChange={(e) => updateScene(i, {
                  ok_take: e.target.value ? Number(e.target.value) : null,
                })}
                className="h-10"
              />
              <div className="col-span-2 sm:col-span-1">
                <Select
                  value={scene.status}
                  onValueChange={(v) => updateScene(i, { status: v as SceneStatus })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [SceneStatus, { label: string; className: string }][]).map(
                      ([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <Badge variant="secondary" className={cfg.className}>
                            {cfg.label}
                          </Badge>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
            onClick={() => removeScene(i)}
            aria-label={`Remover cena ${scene.scene_number || i + 1}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addScene} className="h-9">
        <Plus className="size-3.5 mr-1.5" />
        Adicionar cena
      </Button>

      {/* Total de takes */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Total de takes:</span>
        {hasScenes ? (
          <span className="text-sm font-medium" title="Calculado automaticamente a partir das cenas">
            {computedTakes}
          </span>
        ) : (
          <Input
            type="number"
            min={0}
            placeholder="Ex: 47"
            value={totalTakes}
            onChange={(e) => onTotalTakesChange(e.target.value)}
            className="w-28 h-10"
          />
        )}
      </div>
    </div>
  )
}
