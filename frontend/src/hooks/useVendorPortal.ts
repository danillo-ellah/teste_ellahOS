import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPublicGet, apiPublicMutate, apiGet, apiMutate } from '@/lib/api'
import type {
  VendorPortalData,
  VendorPortalFormPayload,
  CreateInvitePayload,
  VendorInvite,
} from '@/types/vendor-portal'

// Chaves de query isoladas para o vendor portal
export const vendorPortalKeys = {
  all: ['vendor-portal'] as const,
  public: (token: string) => ['vendor-portal-public', token] as const,
  invites: () => [...vendorPortalKeys.all, 'invites'] as const,
  invitesByJob: (jobId: string) => [...vendorPortalKeys.invites(), 'job', jobId] as const,
  invitesByVendor: (vendorId: string) => [...vendorPortalKeys.invites(), 'vendor', vendorId] as const,
}

// GET publico: busca dados do convite pelo token (sem auth)
export function useVendorPortalPublic(token: string) {
  return useQuery({
    queryKey: vendorPortalKeys.public(token),
    queryFn: () => apiPublicGet<VendorPortalData>('vendor-portal', `public/${token}`),
    enabled: !!token,
    retry: false,
    staleTime: Infinity, // Dado imutavel durante a sessao do portal
  })
}

// POST publico: envia formulario preenchido pelo fornecedor (sem auth)
export function useSubmitVendorPortal(token: string) {
  return useMutation({
    mutationFn: (payload: VendorPortalFormPayload) =>
      apiPublicMutate<{ vendor_id: string; message: string }>(
        'vendor-portal',
        `public/${token}`,
        payload as unknown as Record<string, unknown>,
      ),
  })
}

// GET autenticado: lista convites do tenant
export function useVendorInvites(params?: {
  job_id?: string
  vendor_id?: string
  status?: 'pending' | 'used' | 'expired'
}) {
  const queryParams: Record<string, string> = {}
  if (params?.job_id)    queryParams.job_id    = params.job_id
  if (params?.vendor_id) queryParams.vendor_id = params.vendor_id
  if (params?.status)    queryParams.status    = params.status

  const queryKey = params?.job_id
    ? vendorPortalKeys.invitesByJob(params.job_id)
    : params?.vendor_id
      ? vendorPortalKeys.invitesByVendor(params.vendor_id)
      : vendorPortalKeys.invites()

  return useQuery({
    queryKey,
    queryFn: () => apiGet<VendorInvite[]>('vendor-portal', queryParams, 'invites'),
    staleTime: 15_000,
  })
}

// POST autenticado: admin cria um convite
export function useCreateVendorInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvitePayload) =>
      apiMutate<VendorInvite>(
        'vendor-portal',
        'POST',
        payload as Record<string, unknown>,
        'invite',
      ),
    onSuccess: () => {
      // Invalidar lista de convites para refletir o novo
      queryClient.invalidateQueries({ queryKey: vendorPortalKeys.invites() })
    },
  })
}
