'use client'

import {
  FolderOpen,
  FileVideo,
  FileText,
  FileImage,
  File,
  Archive,
  Download,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PortalDocument } from '@/types/portal'

function getFileIcon(fileType: string | null | undefined) {
  const type = (fileType ?? '').toLowerCase()
  if (type.includes('video') || type.includes('mp4') || type.includes('mov')) {
    return { Icon: FileVideo, color: '#3B82F6' }
  }
  if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg')) {
    return { Icon: FileImage, color: '#10B981' }
  }
  if (type.includes('pdf')) {
    return { Icon: FileText, color: '#EF4444' }
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) {
    return { Icon: Archive, color: '#F59E0B' }
  }
  return { Icon: File, color: '#71717A' }
}

function getFileExt(fileType: string | null | undefined, name: string): string {
  if (fileType) {
    const parts = fileType.split('/')
    return (parts[parts.length - 1] ?? '').toUpperCase()
  }
  const nameParts = name.split('.')
  if (nameParts.length > 1) {
    return (nameParts[nameParts.length - 1] ?? '').toUpperCase()
  }
  return 'ARQUIVO'
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

function formatDocDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return ''
  }
}

function isPreviewable(fileType: string | null | undefined): boolean {
  const type = (fileType ?? '').toLowerCase()
  return (
    type.includes('video') ||
    type.includes('image') ||
    type.includes('mp4') ||
    type.includes('jpg') ||
    type.includes('png') ||
    type.includes('jpeg') ||
    type.includes('pdf')
  )
}

interface PortalDocumentsProps {
  documents: PortalDocument[]
}

export function PortalDocuments({ documents }: PortalDocumentsProps) {
  if (documents.length === 0) {
    return (
      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-labelledby="docs-heading"
      >
        <h2 id="docs-heading" className="flex items-center gap-2 text-base font-semibold mb-4">
          <FolderOpen className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
          Documentos e Arquivos
        </h2>
        <div className="flex flex-col items-center py-8 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhum arquivo disponivel ainda.</p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="docs-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="docs-heading"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <FolderOpen className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
          Documentos e Arquivos
        </h2>
        {documents.length > 1 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled title="Em breve">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Baixar tudo
          </Button>
        )}
      </div>

      {/* Grid responsivo: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const { Icon, color } = getFileIcon(doc.file_type)
          const ext = getFileExt(doc.file_type, doc.name)
          const size = formatFileSize(doc.file_size)
          const date = formatDocDate(doc.created_at)
          const canPreview = isPreviewable(doc.file_type)

          return (
            <article
              key={doc.id}
              className="rounded-lg border border-border bg-muted/30 dark:bg-zinc-800/50 p-4"
              role="article"
              aria-label={`Arquivo: ${doc.name}`}
            >
              {/* Icone do tipo */}
              <Icon
                className="h-8 w-8"
                style={{ color }}
                aria-hidden="true"
              />

              {/* Nome (max 2 linhas) */}
              <p className="text-sm font-medium mt-3 leading-snug line-clamp-2">
                {doc.name}
              </p>

              {/* Meta */}
              <p className="text-xs text-muted-foreground mt-1">
                {[ext, size, date].filter(Boolean).join(' · ')}
              </p>

              {/* Acoes */}
              <div className="flex gap-2 mt-3">
                {canPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visualizar ${doc.name} (abre em nova aba)`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Visualizar
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs gap-1"
                  asChild
                >
                  <a
                    href={doc.file_url}
                    download={doc.name}
                    aria-label={`Baixar ${doc.name}, ${ext} ${size}`}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Baixar
                  </a>
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
