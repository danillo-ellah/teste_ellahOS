'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

export const APPROVAL_PDF_ROLES: UserRole[] = ['admin', 'ceo', 'produtor_executivo']

// H9 fix: cache module-level para evitar re-fetch a cada render
let cachedRole: UserRole | null = null
let cachePromise: Promise<UserRole | null> | null = null

function fetchRole(): Promise<UserRole | null> {
  if (cachedRole) return Promise.resolve(cachedRole)
  if (cachePromise) return cachePromise

  cachePromise = (async () => {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) return null

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    cachedRole = (data?.role as UserRole) ?? null
    return cachedRole
  })()

  return cachePromise
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(cachedRole)
  const [isLoading, setIsLoading] = useState(cachedRole === null)

  useEffect(() => {
    if (cachedRole !== null) {
      setRole(cachedRole)
      setIsLoading(false)
      return
    }

    let cancelled = false

    fetchRole()
      .then((r) => {
        if (!cancelled) {
          setRole(r)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    role,
    isLoading,
    canGenerateApprovalPdf: role !== null && APPROVAL_PDF_ROLES.includes(role),
  }
}
