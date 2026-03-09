'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import type {
  OnboardingStatus,
  CompanyData,
  ProfileData,
  IntegrationsData,
} from '@/types/onboarding'

// Chaves de query para onboarding
export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: () => [...onboardingKeys.all, 'status'] as const,
}

// GET /onboarding/status — estado atual do onboarding
export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: async () => {
      const res = await apiGet<OnboardingStatus>('onboarding', undefined, 'status')
      return res.data
    },
    // Nao refetch automatico — dados mudam apenas nas acoes do wizard
    staleTime: 60_000,
  })
}

// PATCH /onboarding/company — salva dados da empresa (passo 1)
export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CompanyData) => {
      const res = await apiMutate<OnboardingStatus>(
        'onboarding',
        'PATCH',
        data as unknown as Record<string, unknown>,
        'company',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// PATCH /onboarding/profile — salva dados do perfil (passo 2)
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await apiMutate<OnboardingStatus>(
        'onboarding',
        'PATCH',
        data as unknown as Record<string, unknown>,
        'profile',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// PATCH /onboarding/integrations — registra ciencia das integracoes (passo 4)
export function useUpdateIntegrations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IntegrationsData) => {
      const res = await apiMutate<OnboardingStatus>(
        'onboarding',
        'PATCH',
        data as unknown as Record<string, unknown>,
        'integrations',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

// PATCH /onboarding/complete — marca onboarding como concluido (passo 5)
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await apiMutate<{ completed: boolean }>(
        'onboarding',
        'PATCH',
        {},
        'complete',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}
