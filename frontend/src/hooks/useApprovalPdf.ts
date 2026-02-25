'use client'

import { useMutation } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/api'

interface GenerateApprovalResult {
  job_id: string
  html_length: number
  drive_file_id: string | null
  drive_url: string | null
  job_file_id: string | null
  generated_at: string
}

export function useGenerateApprovalPdf() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiMutate<GenerateApprovalResult>(
        'pdf-generator',
        'POST',
        { job_id: jobId },
        'aprovacao-interna',
      )
      return res.data
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}
