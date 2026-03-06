'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { FINANCIAL_VIEW_ROLES } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function FinanceiroLayout({ children, params }: Props) {
  const { id } = use(params)
  const { role, isLoading } = useUserRole()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Roles without financial access get redirected to the job detail
  if (role && !FINANCIAL_VIEW_ROLES.includes(role)) {
    router.replace(`/jobs/${id}`)
    return null
  }

  return <>{children}</>
}
