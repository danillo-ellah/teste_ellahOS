'use client'

/**
 * Hook que protege rotas baseado nas roles permitidas.
 * Usa SIDEBAR_ACCESS como fonte de verdade para quais roles podem acessar cada area.
 * Redireciona para /jobs (pagina segura para todos) se o usuario nao tem acesso.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface UseRouteGuardOptions {
  /** Roles com permissao para acessar a rota */
  allowedRoles: UserRole[]
  /** Rota de fallback caso o usuario nao tenha acesso. Padrao: /jobs */
  fallbackHref?: string
}

interface UseRouteGuardResult {
  /** true enquanto o role ainda nao foi carregado */
  isLoading: boolean
  /** true se o usuario tem acesso (role carregada e dentro de allowedRoles) */
  hasAccess: boolean
}

export function useRouteGuard({
  allowedRoles,
  fallbackHref = '/jobs',
}: UseRouteGuardOptions): UseRouteGuardResult {
  const { role, isLoading } = useUserRole()
  const router = useRouter()

  const hasAccess = !isLoading && role !== null && allowedRoles.includes(role)

  useEffect(() => {
    // Aguarda carregamento antes de redirecionar
    if (isLoading) return

    // Redireciona se role foi carregada mas nao tem acesso
    if (!isLoading && (role === null || !allowedRoles.includes(role))) {
      router.replace(fallbackHref)
    }
  }, [isLoading, role, allowedRoles, fallbackHref, router])

  return { isLoading, hasAccess }
}
