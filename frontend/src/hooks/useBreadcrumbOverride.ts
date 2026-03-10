'use client'

import { useEffect } from 'react'
import { useBreadcrumb, type BreadcrumbItem } from '@/lib/breadcrumb-context'

/**
 * Hook para paginas especificas sobrescreverem o breadcrumb do Topbar.
 * Limpa o override automaticamente ao desmontar o componente.
 *
 * @param items - Array de itens de breadcrumb ou null para nao sobrescrever
 */
export function useBreadcrumbOverride(items: BreadcrumbItem[] | null) {
  const { setOverrideItems } = useBreadcrumb()

  useEffect(() => {
    setOverrideItems(items)
    // Limpa ao desmontar (ex: ao sair da pagina de detalhe do job)
    return () => setOverrideItems(null)
  }, [items, setOverrideItems])
}
