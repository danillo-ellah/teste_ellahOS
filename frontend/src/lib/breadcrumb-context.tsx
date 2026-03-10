'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// Item de breadcrumb
export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  // Override definido por paginas especificas (ex: detalhe do job)
  overrideItems: BreadcrumbItem[] | null
  setOverrideItems: (items: BreadcrumbItem[] | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  overrideItems: null,
  setOverrideItems: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrideItems, setOverrideItemsState] = useState<BreadcrumbItem[] | null>(null)

  const setOverrideItems = useCallback((items: BreadcrumbItem[] | null) => {
    setOverrideItemsState(items)
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ overrideItems, setOverrideItems }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}
