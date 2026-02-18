import { createClient } from '@/lib/supabase/client'
import type { ApiResponse } from '@/types/jobs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function getToken(): Promise<string> {
  const supabase = createClient()
  // Validar JWT contra o servidor antes de usar o token
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new ApiRequestError('UNAUTHORIZED', 'Sessao expirada', 401)
  }
  // Token validado - seguro obter session para extrair access_token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new ApiRequestError('UNAUTHORIZED', 'Sessao expirada', 401)
  }
  return session.access_token
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('TIMEOUT', 'Requisicao expirou. Tente novamente.', 408)
    }
    throw new ApiRequestError('NETWORK_ERROR', 'Erro de conexao. Verifique sua internet.', 0)
  }
  clearTimeout(timeoutId)

  const data = await res.json()

  if (!res.ok || data?.error) {
    const err = data?.error || {}
    throw new ApiRequestError(
      err.code || 'UNKNOWN_ERROR',
      err.message || 'Erro desconhecido',
      res.status || 500,
      err.details,
    )
  }

  return data as ApiResponse<T>
}

// GET com query params
export async function apiGet<T>(
  functionName: string,
  params?: Record<string, string>,
  path?: string,
): Promise<ApiResponse<T>> {
  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : ''
  const fullPath = path
    ? `${functionName}/${path}${queryString}`
    : `${functionName}${queryString}`

  return apiFetch<T>(fullPath, { method: 'GET' })
}

// POST/PATCH/DELETE com body
export async function apiMutate<T>(
  functionName: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  path?: string,
): Promise<ApiResponse<T>> {
  const fullPath = path ? `${functionName}/${path}` : functionName

  return apiFetch<T>(fullPath, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}
