'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  FileDown,
  Image,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiGet, apiMutate, ApiRequestError, safeErrorMessage } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'
import { AncineSection } from '@/components/job-detail/tabs/AncineSection'

// Tipos da claquete
interface Claquete {
  id: string
  job_id: string
  version: number
  title: string
  duration: string
  product: string
  advertiser: string
  agency: string
  director: string
  type: string
  segment: string
  crt: string
  production_company: string
  cnpj: string
  audio_company: string
  production_year: number
  closed_caption: boolean
  sap_key: boolean
  libras: boolean
  audio_description: boolean
  pdf_url: string | null
  png_url: string | null
  created_at: string
}

interface ClaqueteFormData {
  title: string
  duration: string
  product: string
  advertiser: string
  agency: string
  director: string
  type: string
  segment: string
  crt: string
  production_company: string
  cnpj: string
  audio_company: string
  production_year: number
  closed_caption: boolean
  sap_key: boolean
  libras: boolean
  audio_description: boolean
}

const CLAQUETE_TYPES = ['COMUM', 'ANIMACAO', 'DOCUMENTARIO', 'FICCAO', 'MUSICAL', 'OUTRO']

interface TabClaqueteProps {
  job: JobDetail
}

// Helper: preencher form com dados do job
function defaultFormFromJob(job: JobDetail): ClaqueteFormData {
  return {
    title: job.title ?? '',
    duration: '',
    product: '',
    advertiser: job.clients?.name ?? '',
    agency: job.agencies?.name ?? '',
    director: '',
    type: 'COMUM',
    segment: 'TODOS OS SEGMENTOS DE MERCADO',
    crt: '',
    production_company: '',
    cnpj: '',
    audio_company: '',
    production_year: new Date().getFullYear(),
    closed_caption: false,
    sap_key: false,
    libras: false,
    audio_description: false,
  }
}

export function TabClaquete({ job }: TabClaqueteProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ClaqueteFormData>(() => defaultFormFromJob(job))

  // Buscar claquetes do job
  const { data: claquetes, isLoading } = useQuery({
    queryKey: ['claquetes', job.id],
    queryFn: async () => {
      const res = await apiGet<Claquete[]>('claquete-generator', { job_id: job.id }, 'list')
      return res.data
    },
  })

  // Criar claquete
  const createMutation = useMutation({
    mutationFn: async (data: ClaqueteFormData) => {
      const res = await apiMutate<Claquete & { _preview_html: string }>(
        'claquete-generator',
        'POST',
        { ...data, job_id: job.id },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claquetes', job.id] })
      toast.success('Claquete criada com sucesso')
      setShowForm(false)
      setForm(defaultFormFromJob(job))
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Deletar claquete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiMutate('claquete-generator', 'DELETE', undefined, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claquetes', job.id] })
      toast.success('Claquete removida')
      setDeleteId(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Preview HTML
  const handlePreview = useCallback(async (claqueteId: string) => {
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch(`${SUPABASE_URL}/functions/v1/claquete-generator/preview/${claqueteId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar preview')
      const html = await res.text()
      setPreviewHtml(html)
    } catch (err) {
      toast.error('Erro ao carregar preview da claquete')
    }
  }, [])

  const updateField = <K extends keyof ClaqueteFormData>(key: K, value: ClaqueteFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Secao ANCINE (registro, CRT, checklist) */}
      <AncineSection job={job} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Claquetes ANCINE</h3>
          <p className="text-sm text-muted-foreground">
            Documento regulatorio obrigatorio para obras veiculadas em TV aberta
          </p>
        </div>
        <Button onClick={() => { setForm(defaultFormFromJob(job)); setShowForm(true) }}>
          <Plus className="size-4 mr-2" />
          Nova Claquete
        </Button>
      </div>

      {/* Lista de claquetes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !claquetes?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Nenhuma claquete criada para este job</p>
            <Button variant="outline" className="mt-4" onClick={() => { setForm(defaultFormFromJob(job)); setShowForm(true) }}>
              <Plus className="size-4 mr-2" />
              Criar primeira claquete
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {claquetes.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <Badge variant="secondary">v{c.version}</Badge>
                    <Badge variant="outline">{c.duration}</Badge>
                    {c.crt && <Badge variant="outline" className="font-mono text-xs">CRT: {c.crt}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(c.id)}>
                      <Eye className="size-4 mr-1" /> Preview
                    </Button>
                    {c.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileDown className="size-4 mr-1" /> PDF
                        </a>
                      </Button>
                    )}
                    {c.png_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={c.png_url} target="_blank" rel="noopener noreferrer">
                          <Image className="size-4 mr-1" /> PNG
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Anunciante:</span> {c.advertiser || '—'}</div>
                  <div><span className="text-muted-foreground">Agencia:</span> {c.agency || '—'}</div>
                  <div><span className="text-muted-foreground">Diretor:</span> {c.director || '—'}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {c.type}</div>
                  <div><span className="text-muted-foreground">Produtora:</span> {c.production_company || '—'}</div>
                  <div><span className="text-muted-foreground">Audio:</span> {c.audio_company || '—'}</div>
                  <div><span className="text-muted-foreground">Ano:</span> {c.production_year}</div>
                  <div>
                    <span className="text-muted-foreground">Acessibilidade:</span>{' '}
                    {[
                      c.closed_caption && 'CC',
                      c.sap_key && 'SAP',
                      c.libras && 'LIBRAS',
                      c.audio_description && 'AD',
                    ].filter(Boolean).join(', ') || 'Nenhuma'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criacao */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Claquete</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titulo da peca *</Label>
              <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Ex: CHA REPARACAO" />
            </div>

            <div>
              <Label>Duracao *</Label>
              <Input value={form.duration} onChange={e => updateField('duration', e.target.value)} placeholder='Ex: 30"' />
            </div>

            <div>
              <Label>Produto</Label>
              <Input value={form.product} onChange={e => updateField('product', e.target.value)} placeholder="Ex: INSTITUCIONAL" />
            </div>

            <div>
              <Label>Anunciante</Label>
              <Input value={form.advertiser} onChange={e => updateField('advertiser', e.target.value)} />
            </div>

            <div>
              <Label>Agencia</Label>
              <Input value={form.agency} onChange={e => updateField('agency', e.target.value)} />
            </div>

            <div>
              <Label>Diretor de Cena</Label>
              <Input value={form.director} onChange={e => updateField('director', e.target.value)} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => updateField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAQUETE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Segmento</Label>
              <Input value={form.segment} onChange={e => updateField('segment', e.target.value)} />
            </div>

            <div>
              <Label>Numero CRT (ANCINE)</Label>
              <Input value={form.crt} onChange={e => updateField('crt', e.target.value)} placeholder="Ex: 20250044600006" className="font-mono" />
            </div>

            <div>
              <Label>Produtora de Audio</Label>
              <Input value={form.audio_company} onChange={e => updateField('audio_company', e.target.value)} placeholder="Ex: IELOW SOUND" />
            </div>

            <div>
              <Label>Produtora</Label>
              <Input value={form.production_company} onChange={e => updateField('production_company', e.target.value)} placeholder="Preenchido automaticamente do tenant" />
            </div>

            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => updateField('cnpj', e.target.value)} placeholder="Preenchido automaticamente do tenant" />
            </div>

            <div>
              <Label>Ano de Producao</Label>
              <Input type="number" value={form.production_year} onChange={e => updateField('production_year', Number(e.target.value))} />
            </div>

            {/* Flags de acessibilidade */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Acessibilidade</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="closed_caption" className="cursor-pointer">Closed Caption</Label>
                  <Switch id="closed_caption" checked={form.closed_caption} onCheckedChange={v => updateField('closed_caption', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sap_key" className="cursor-pointer">Tecla SAP</Label>
                  <Switch id="sap_key" checked={form.sap_key} onCheckedChange={v => updateField('sap_key', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="libras" className="cursor-pointer">LIBRAS</Label>
                  <Switch id="libras" checked={form.libras} onCheckedChange={v => updateField('libras', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="audio_description" className="cursor-pointer">Audiodescricao</Label>
                  <Switch id="audio_description" checked={form.audio_description} onCheckedChange={v => updateField('audio_description', v)} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.title || !form.duration}
            >
              {createMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Criar Claquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-[1360px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview da Claquete</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <iframe
              sandbox=""
              srcDoc={previewHtml}
              className="w-full border rounded-lg bg-white"
              style={{ height: '720px', maxHeight: '70vh' }}
              title="Preview Claquete"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmacao de delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover claquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A claquete sera marcada como removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
