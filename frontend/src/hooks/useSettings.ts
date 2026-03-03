'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { settingsKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type {
  CompanyInfo,
  IntegrationsConfig,
  IntegrationName,
  IntegrationUpdatePayload,
  TestConnectionResult,
  IntegrationLog,
} from '@/types/settings'

// GET /tenant-settings/company
export function useCompanyInfo() {
  return useQuery({
    queryKey: settingsKeys.companyInfo(),
    queryFn: async () => {
      const res = await apiGet<CompanyInfo>('tenant-settings', undefined, 'company')
      return res.data
    },
  })
}

// PATCH /tenant-settings/company
export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<CompanyInfo>) => {
      const res = await apiMutate<CompanyInfo>(
        'tenant-settings',
        'PATCH',
        payload as Record<string, unknown>,
        'company',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.companyInfo() })
      toast.success('Dados da empresa salvos com sucesso!')
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// POST /tenant-settings/logo (FormData upload)
export function useUploadLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sessao expirada')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessao expirada')

      const formData = new FormData()
      formData.append('file', file)

      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tenant-settings/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || data?.error) {
        const err = data?.error || {}
        throw new Error(err.message || 'Falha ao fazer upload do logo')
      }
      return data.data as { logo_url: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.companyInfo() })
      toast.success('Logo atualizado com sucesso!')
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// GET /tenant-settings/integrations
export function useIntegrations() {
  const query = useQuery({
    queryKey: settingsKeys.integrations(),
    queryFn: async () => {
      const res = await apiGet<IntegrationsConfig>('tenant-settings', undefined, 'integrations')
      return res.data
    },
  })

  return query
}

// PATCH /tenant-settings/integrations/:name
export function useUpdateIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      payload,
    }: {
      name: IntegrationName
      payload: IntegrationUpdatePayload
    }) => {
      const res = await apiMutate<Record<string, unknown>>(
        'tenant-settings',
        'PATCH',
        payload as Record<string, unknown>,
        `integrations/${name}`,
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.integrations() })
      toast.success('Configuracao salva com sucesso!')
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// POST /tenant-settings/integrations/:name/test
export function useTestConnection() {
  return useMutation({
    mutationFn: async ({ name }: { name: IntegrationName }) => {
      const res = await apiMutate<TestConnectionResult>(
        'tenant-settings',
        'POST',
        {},
        `integrations/${name}/test`,
      )
      return res.data
    },
  })
}

// GET /tenant-settings/integration-logs
export function useIntegrationLogs(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: settingsKeys.logsList(filters),
    queryFn: async () => {
      const res = await apiGet<IntegrationLog[]>('tenant-settings', filters, 'integration-logs')
      return { data: res.data, meta: (res as unknown as { meta?: unknown }).meta }
    },
  })
}
