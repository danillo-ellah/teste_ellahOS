'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

// Roles com acesso ao modulo Pos-Producao
const POS_PRODUCAO_ROLES: UserRole[] = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador',
  'freelancer', // editor, colorista, finalizador usam user_role freelancer
]

export default function PosProducaoLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: POS_PRODUCAO_ROLES })

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!hasAccess) return null

  return <>{children}</>
}
