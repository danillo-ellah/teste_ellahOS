'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

export const APPROVAL_PDF_ROLES: UserRole[] = ['admin', 'ceo', 'produtor_executivo']

// H9 fix: cache module-level para evitar re-fetch a cada render
let cachedRole: UserRole | null = null
let cachedFullName: string | null = null
let cachePromise: Promise<{ role: UserRole | null; fullName: string | null }> | null = null

function fetchProfile(): Promise<{ role: UserRole | null; fullName: string | null }> {
  if (cachedRole) return Promise.resolve({ role: cachedRole, fullName: cachedFullName })
  if (cachePromise) return cachePromise

  cachePromise = (async () => {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) return { role: null, fullName: null }

    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    cachedRole = (data?.role as UserRole) ?? null
    cachedFullName = (data?.full_name as string) ?? null
    return { role: cachedRole, fullName: cachedFullName }
  })()

  return cachePromise
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(cachedRole)
  const [fullName, setFullName] = useState<string | null>(cachedFullName)
  const [isLoading, setIsLoading] = useState(cachedRole === null)

  useEffect(() => {
    // Already initialized from cache in useState — skip fetch
    if (cachedRole !== null) return

    let cancelled = false

    fetchProfile()
      .then((r) => {
        if (!cancelled) {
          setRole(r.role)
          setFullName(r.fullName)
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
    fullName,
    isLoading,
    canGenerateApprovalPdf: role !== null && APPROVAL_PDF_ROLES.includes(role),
  }
}
