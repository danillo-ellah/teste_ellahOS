'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { WhatsAppMessageRow } from '@/types/whatsapp'

interface WhatsAppMessagesResponse {
  data: WhatsAppMessageRow[]
  meta: { total: number; page: number; per_page: number; total_pages: number }
}

export function useWhatsAppMessages(jobId: string) {
  const query = useQuery({
    queryKey: jobKeys.whatsappMessages(jobId),
    queryFn: async () => {
      const res = await apiGet<WhatsAppMessagesResponse>(
        'whatsapp',
        { per_page: '50' },
        `${jobId}/messages`,
      )
      return res.data
    },
    enabled: !!jobId,
    staleTime: 60_000,
  })

  return {
    data: (query.data as unknown as WhatsAppMessagesResponse)?.data ?? [],
    total: (query.data as unknown as WhatsAppMessagesResponse)?.meta?.total ?? 0,
    isLoading: query.isLoading,
  }
}
