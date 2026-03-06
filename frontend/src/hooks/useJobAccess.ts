'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserRole } from './useUserRole'
import {
  resolveTabAccess,
  getVisibleTabs,
  canEditTab,
  type TabAccessLevel,
} from '@/lib/access-control-map'
import type { JobDetailTabId } from '@/lib/constants'
import type { JobDetail } from '@/types/jobs'

// Cache do person_id do usuario logado (evita re-fetch por render)
let cachedPersonId: string | null | undefined = undefined
let personPromise: Promise<string | null> | null = null

function fetchPersonId(): Promise<string | null> {
  if (cachedPersonId !== undefined) return Promise.resolve(cachedPersonId)
  if (personPromise) return personPromise

  const p: Promise<string | null> = (async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      cachedPersonId = null
      return null
    }

    const { data } = await supabase
      .from('people')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    cachedPersonId = data?.id ?? null
    return cachedPersonId ?? null
  })()

  personPromise = p
  return p
}

export function useJobAccess(job: JobDetail) {
  const { role: userRole, isLoading: isRoleLoading } = useUserRole()
  const [personId, setPersonId] = useState<string | null | undefined>(cachedPersonId)
  const [isPersonLoading, setIsPersonLoading] = useState(cachedPersonId === undefined)

  useEffect(() => {
    if (cachedPersonId !== undefined) {
      setPersonId(cachedPersonId)
      setIsPersonLoading(false)
      return
    }

    let cancelled = false
    fetchPersonId().then((id) => {
      if (!cancelled) {
        setPersonId(id)
        setIsPersonLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setIsPersonLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // Encontra o team member do usuario neste job
  const teamMember = useMemo(() => {
    if (personId == null || !job.team) return null
    return job.team.find((m) => m.person_id === personId) ?? null
  }, [personId, job.team])

  const teamRole = teamMember?.role ?? null
  const overrideTabs = teamMember?.access_override?.tabs ?? null

  // Calcula acesso efetivo
  const visibleTabs = useMemo(() => {
    if (!userRole) return [] as JobDetailTabId[]
    return getVisibleTabs(userRole, teamRole, overrideTabs)
  }, [userRole, teamRole, overrideTabs])

  const isLoading = isRoleLoading || isPersonLoading

  return {
    isLoading,
    userRole,
    teamRole,
    visibleTabs,
    hasOverride: overrideTabs !== null,
    canViewTab(tabId: JobDetailTabId): boolean {
      if (!userRole) return false
      return resolveTabAccess(userRole, teamRole, tabId, overrideTabs) !== 'hidden'
    },
    canEditTab(tabId: JobDetailTabId): boolean {
      if (!userRole) return false
      return canEditTab(userRole, teamRole, tabId, overrideTabs)
    },
    getTabAccess(tabId: JobDetailTabId): TabAccessLevel {
      if (!userRole) return 'hidden'
      return resolveTabAccess(userRole, teamRole, tabId, overrideTabs)
    },
  }
}
