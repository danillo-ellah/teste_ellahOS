'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

const APPROVAL_PDF_ROLES: UserRole[] = ['admin', 'ceo', 'produtor_executivo']

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setIsLoading(false)
        return
      }

      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setRole(data.role as UserRole)
          setIsLoading(false)
        })
    })
  }, [])

  return {
    role,
    isLoading,
    canGenerateApprovalPdf: role !== null && APPROVAL_PDF_ROLES.includes(role),
  }
}
