import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Cache tenant_id para evitar re-fetch
let _cachedTenantId: string | null = null

async function getTenantId(): Promise<string> {
  if (_cachedTenantId) return _cachedTenantId

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario nao autenticado')

  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!data?.tenant_id) throw new Error('Tenant nao encontrado')
  _cachedTenantId = data.tenant_id
  return data.tenant_id
}

/**
 * Faz upload de imagem para o bucket storyboard-drawings no Supabase Storage.
 * Retorna a URL publica da imagem.
 */
export async function uploadStoryboardImage(
  file: Blob,
  jobId: string,
  sceneId: string,
): Promise<string> {
  const tenantId = await getTenantId()
  const supabase = createClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename = `${tenantId}/${jobId}/${sceneId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('storyboard-drawings')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`)
  }

  // Bucket publico — URL direta
  return `${SUPABASE_URL}/storage/v1/object/public/storyboard-drawings/${filename}`
}

/**
 * Converte data URL (base64) para Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}
