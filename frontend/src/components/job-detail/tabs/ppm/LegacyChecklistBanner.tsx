'use client'

import { AlertTriangle } from 'lucide-react'

export function LegacyChecklistBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Formato antigo detectado
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Este checklist usa o formato antigo com 6 itens fixos. Ao salvar, sera
          convertido automaticamente para o novo formato dinamico.
        </p>
      </div>
    </div>
  )
}
