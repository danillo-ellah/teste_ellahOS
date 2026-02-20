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

/** Detecta erro 404 tanto de Edge Functions (ApiRequestError) quanto do Supabase client (PGRST116) */
export function isNotFoundError(error: Error | null): boolean {
  if (!error) return false
  if (error instanceof ApiRequestError && error.status === 404) return true
  // Supabase PostgREST retorna PGRST116 quando .single() nao encontra row
  if (error.message?.includes('PGRST116')) return true
  // Fallback — JSON-parsed error objects
  const msg = error.message ?? ''
  if (msg.includes('JSON object requested, multiple (or no) rows returned')) return true
  return false
}

/** Converte erros do Supabase/PostgREST em mensagens seguras para o usuario */
export function safeErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  if (error instanceof ApiRequestError) return error.message

  const msg = error instanceof Error ? error.message : String(error)

  // Erros de constraint do PostgreSQL
  if (msg.includes('unique') || msg.includes('duplicate key')) {
    if (msg.includes('cnpj')) return 'CNPJ ja cadastrado para esta empresa'
    return 'Registro duplicado. Verifique os dados e tente novamente.'
  }
  if (msg.includes('violates check constraint')) {
    if (msg.includes('amount')) return 'Valor deve ser positivo'
    if (msg.includes('quantity')) return 'Quantidade deve ser positiva'
    if (msg.includes('entity_xor')) return 'Contato deve pertencer a um cliente OU agencia'
    return 'Dados invalidos. Verifique os campos e tente novamente.'
  }
  if (msg.includes('violates foreign key')) {
    return 'Referencia invalida. O registro vinculado pode ter sido removido.'
  }
  if (msg.includes('PGRST116')) return 'Registro nao encontrado'
  if (msg.includes('JWT')) return 'Sessao expirada. Faca login novamente.'
  if (msg.includes('permission denied') || msg.includes('RLS')) {
    return 'Voce nao tem permissao para esta acao.'
  }

  // Nao expor mensagens internas do banco
  if (msg.includes('pg_') || msg.includes('relation') || msg.includes('column')) {
    return 'Erro interno. Tente novamente ou contate o suporte.'
  }

  return 'Erro ao processar a requisicao. Tente novamente.'
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

// GET publico sem autenticacao (para paginas publicas como aprovacao)
export async function apiPublicGet<T>(
  functionName: string,
  path: string,
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}/${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
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

// POST publico sem autenticacao (para paginas publicas como aprovacao)
export async function apiPublicMutate<T>(
  functionName: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
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

// POST/PATCH/DELETE com body
export async function apiMutate<T>(
  functionName: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  path?: string,
): Promise<ApiResponse<T>> {
  const fullPath = path ? `${functionName}/${path}` : functionName

  return apiFetch<T>(fullPath, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}
