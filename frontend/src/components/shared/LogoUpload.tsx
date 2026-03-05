'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface LogoUploadProps {
  /** Tabela no Supabase: 'clients' ou 'agencies' */
  table: 'clients' | 'agencies'
  /** ID do registro (client_id ou agency_id) */
  recordId: string
  /** URL atual do logo (se existir) */
  currentLogoUrl: string | null
  /** Callback apos upload com sucesso */
  onUploaded?: (newUrl: string) => void
  /** Callback apos remocao */
  onRemoved?: () => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function getExtension(type: string): string {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/webp') return 'webp'
  return 'png'
}

export function LogoUpload({
  table,
  recordId,
  currentLogoUrl,
  onUploaded,
  onRemoved,
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync preview when prop changes
  if (currentLogoUrl !== null && currentLogoUrl !== preview && !isUploading) {
    setPreview(currentLogoUrl)
  }

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Use PNG, JPG ou WebP')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo excede 2MB')
      return
    }

    // Preview local imediato
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessao expirada')

      const tenantId = session.user.app_metadata?.tenant_id
      if (!tenantId) throw new Error('Tenant nao encontrado')

      const ext = getExtension(file.type)
      const filePath = `${tenantId}/${table}/${recordId}.${ext}`

      // Upload para Storage (upsert)
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      // URL publica
      const { data: publicUrl } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      const logoUrl = `${publicUrl.publicUrl}?t=${Date.now()}`

      // Atualizar registro
      const { error: updateError } = await supabase
        .from(table)
        .update({ logo_url: logoUrl })
        .eq('id', recordId)

      if (updateError) throw updateError

      setPreview(logoUrl)
      onUploaded?.(logoUrl)
      toast.success('Logo atualizado!')
    } catch (err) {
      console.error('[LogoUpload]', err)
      toast.error('Erro ao enviar logo')
      setPreview(currentLogoUrl)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [table, recordId, currentLogoUrl, onUploaded])

  const handleRemove = useCallback(async () => {
    setIsUploading(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from(table)
        .update({ logo_url: null })
        .eq('id', recordId)

      if (error) throw error

      setPreview(null)
      onRemoved?.()
      toast.success('Logo removido')
    } catch (err) {
      console.error('[LogoUpload] remove', err)
      toast.error('Erro ao remover logo')
    } finally {
      setIsUploading(false)
    }
  }, [table, recordId, onRemoved])

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Logo" className="size-full object-contain" />
        ) : (
          <Upload className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-1.5 size-3 animate-spin" />
          ) : (
            <Upload className="mr-1.5 size-3" />
          )}
          {preview ? 'Trocar Logo' : 'Enviar Logo'}
        </Button>
        {preview && !isUploading && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7"
            onClick={handleRemove}
          >
            <X className="mr-1 size-3" />
            Remover
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">PNG, JPG ou WebP. Max 2MB.</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
