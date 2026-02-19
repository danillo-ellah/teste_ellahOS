'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { settingsKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import type {
  IntegrationsConfig,
  IntegrationName,
  IntegrationUpdatePayload,
  TestConnectionResult,
  IntegrationLog,
} from '@/types/settings'

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
      return { data: res.data, meta: (res as any).meta }
    },
  })
}
