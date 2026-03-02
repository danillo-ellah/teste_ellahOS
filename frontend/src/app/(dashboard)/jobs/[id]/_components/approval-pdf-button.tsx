'use client'

import { useState } from 'react'
import {
  FileCheck,
  ExternalLink,
  Eye,
  Loader2,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useGenerateApprovalPdf } from '@/hooks/useApprovalPdf'
import { APPROVAL_PDF_ROLES } from '@/hooks/useUserRole'
import { ApprovalPdfHistory } from './approval-pdf-history'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface ApprovalPdfButtonProps {
  jobId: string
  jobCode: string
  userRole: string
}

async function fetchPreviewHtml(jobId: string): Promise<string> {
  const supabase = createClient()

  // Validar JWT contra o servidor antes de usar o token
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Sessao expirada. Faca login novamente.')
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessao expirada. Faca login novamente.')
  }

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/pdf-generator/preview/aprovacao-interna/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  )

  if (!res.ok) {
    const body = await res.text()
    let message = 'Erro ao carregar preview'
    try {
      const json = JSON.parse(body)
      message = json?.error?.message || message
    } catch {
      // body nao e JSON — usar mensagem padrao
    }
    throw new Error(message)
  }

  return res.text()
}

export function ApprovalPdfButton({ jobId, jobCode, userRole }: ApprovalPdfButtonProps) {
  const [open, setOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [driveUrl, setDriveUrl] = useState<string | null>(null)
  const [lastVersion, setLastVersion] = useState<number | null>(null)
  // Controla aba ativa no dialog: 'documento' ou 'historico'
  const [activeTab, setActiveTab] = useState<'documento' | 'historico'>('documento')

  const { mutateAsync: generate, isPending: isGenerating } = useGenerateApprovalPdf()

  // Nao renderizar para roles sem permissao
  if (!APPROVAL_PDF_ROLES.includes(userRole as never)) {
    return null
  }

  function handleOpen() {
    setOpen(true)
    setPreviewHtml(null)
    setDriveUrl(null)
    setLastVersion(null)
    setActiveTab('documento')
  }

  function handleClose() {
    setOpen(false)
    setPreviewHtml(null)
    setDriveUrl(null)
    setLastVersion(null)
  }

  async function handleLoadPreview() {
    setIsLoadingPreview(true)
    try {
      const html = await fetchPreviewHtml(jobId)
      setPreviewHtml(html)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar preview'
      toast.error(msg)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  async function handleGenerate() {
    try {
      const result = await generate(jobId)
      const version = result?.version ?? 1
      const driveLink = result?.drive_url ?? null

      setLastVersion(version)
      if (driveLink) {
        setDriveUrl(driveLink)
      }

      // Toast com link clicavel quando ha URL do Drive
      if (driveLink) {
        toast.success(
          version > 1
            ? `Documento v${version} gerado e salvo no Drive.`
            : 'Documento gerado e salvo no Drive.',
          {
            action: {
              label: 'Abrir Drive',
              onClick: () => window.open(driveLink, '_blank', 'noopener,noreferrer'),
            },
            duration: 6000,
          },
        )
      } else {
        toast.success(
          version > 1
            ? `Documento de aprovacao v${version} gerado com sucesso.`
            : 'Documento de aprovacao gerado com sucesso.',
        )
      }
    } catch {
      // erro ja tratado pelo hook com toast.error
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
      >
        <FileCheck className="size-4" />
        Aprovacao Interna
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-5" />
              Aprovacao Interna
            </DialogTitle>
            <DialogDescription>
              Documento de aprovacao interna para o job{' '}
              <span className="font-medium text-foreground">{jobCode}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Abas: Documento e Historico de versoes */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'documento' | 'historico')}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
              <TabsTrigger
                value="documento"
                className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground"
              >
                <Eye className="size-4 mr-1.5" />
                Documento
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground"
              >
                <History className="size-4 mr-1.5" />
                Versoes
              </TabsTrigger>
            </TabsList>

            {/* Aba: Documento com preview */}
            <TabsContent value="documento" className="flex-1 min-h-0 mt-3 flex flex-col gap-3">
              {/* Area de preview */}
              <div className="flex-1 min-h-0 overflow-hidden rounded-md border border-border bg-muted/30">
                {!previewHtml && !isLoadingPreview && (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                    <Eye className="size-10 opacity-40" />
                    <p className="text-sm">
                      Clique em &ldquo;Ver Preview&rdquo; para visualizar o documento antes de gerar
                    </p>
                  </div>
                )}

                {isLoadingPreview && (
                  <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-sm">Carregando preview...</span>
                  </div>
                )}

                {previewHtml && !isLoadingPreview && (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[55vh] rounded-md"
                    title="Preview da aprovacao interna"
                    sandbox=""
                  />
                )}
              </div>

              {/* Link do Drive apos gerar */}
              {driveUrl && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {lastVersion && lastVersion > 1
                      ? `Documento v${lastVersion} salvo:`
                      : 'Documento salvo:'}
                  </span>
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Abrir no Drive
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}
            </TabsContent>

            {/* Aba: Historico de versoes com status de aprovacao */}
            <TabsContent value="historico" className="mt-3 overflow-y-auto">
              <div className="mb-3">
                <p className="text-sm text-muted-foreground">
                  Todas as versoes geradas do documento de aprovacao interna.
                  Versoes mais recentes aparecem primeiro.
                </p>
              </div>
              <ApprovalPdfHistory
                jobId={jobId}
                userRole={userRole}
                compact={false}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isLoadingPreview || isGenerating}
            >
              Fechar
            </Button>

            {/* Botao de preview visivel apenas na aba documento */}
            {activeTab === 'documento' && (
              <Button
                variant="outline"
                onClick={handleLoadPreview}
                disabled={isLoadingPreview || isGenerating}
              >
                {isLoadingPreview ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Eye className="size-4" />
                    Ver Preview
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingPreview}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileCheck className="size-4" />
                  Gerar e Salvar no Drive
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
