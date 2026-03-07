'use client'

import { CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ChecklistItem } from '@/types/preproduction'

interface PreProductionBadgeProps {
  items?: ChecklistItem[]
  complete?: boolean
  className?: string
}

// Modo detalhado: recebe items e calcula. Modo simples: recebe boolean complete.
export function PreProductionBadge({
  items,
  complete,
  className,
}: PreProductionBadgeProps) {
  const isComplete =
    complete ?? (items ? items.length > 0 && items.every((i) => i.checked) : false)
  const hasItems = items ? items.length > 0 : complete !== undefined

  if (!hasItems) return null

  if (isComplete) {
    return (
      <Badge
        variant="outline"
        className={`bg-green-500/10 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 ${className ?? ''}`}
      >
        <CheckCircle2 className="size-3 mr-1" />
        Pronto pra filmar
      </Badge>
    )
  }

  const pending = items ? items.filter((i) => !i.checked).length : 0
  return (
    <Badge
      variant="outline"
      className={`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 ${className ?? ''}`}
    >
      <Clock className="size-3 mr-1" />
      {items ? `Pre-producao: ${pending} pendente${pending !== 1 ? 's' : ''}` : 'Pre-producao pendente'}
    </Badge>
  )
}
