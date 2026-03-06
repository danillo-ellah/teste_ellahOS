'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ExternalLink,
  FolderOpen,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useDriveFolders,
  useCreateDriveStructure,
  useRecreateDriveStructure,
  useDeleteDriveStructure,
} from '@/hooks/useDriveFolders'
import { ApiRequestError } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'
import type { DriveFolderRow } from '@/types/drive'

interface DriveSectionProps {
  job: JobDetail
}

// Labels amigaveis para folder_key (v4 + legado para jobs antigos)
const FOLDER_LABELS: Record<string, string> = {
  root: 'Pasta raiz',
  // v4 — nivel 1 (30 pastas)
  roteiro_briefing: '01A Roteiro/Briefing',
  docs_produtora: '01B Docs Produtora',
  fin_orcamento: '02A Orcamento/Carta',
  fin_decupado: '02B Decupado',
  fin_gastos_gerais: '02C Gastos Gerais',
  fin_nf_recebimento: '02D NFs Recebimento',
  fin_comprovantes: '02E Comprovantes',
  fin_notinhas: '02F Notinhas Producao',
  fin_nf_final: '02G NF Final',
  fin_fechamento: '02H Fechamento P&L',
  monstro_pesquisa: '03 Monstro/Pesquisa/Artes',
  monstro: 'Monstro',
  pesquisa_artes: 'Pesquisa',
  decupagem: 'Decupagem',
  artes: 'Artes',
  cronograma: '04 Cronograma',
  contrato_producao: '05A Contrato Producao',
  contrato_equipe: '05B Contrato Equipe',
  contrato_elenco: '05C Contrato Elenco',
  alvara: '05D Alvara',
  forn_producao: '06A Producao/Pre',
  forn_arte: '06B Arte/Pre',
  forn_figurino: '06C Figurino/Pre',
  forn_direcao: '06D Direcao',
  clientes: '07 Clientes',
  cli_passagens: 'Passagens Aereas',
  cli_hoteis: 'Hoteis',
  cli_notinhas: 'Notinha com Cliente',
  cli_avaliacao: 'Avaliacao Cliente',
  pos_material_bruto: '08A Material Bruto',
  pos_material_limpo: '08B Material Limpo',
  pos_pesquisa: '08C Pesquisa',
  pos_storyboard: '08D Storyboard',
  pos_montagem: '08E Montagem',
  atendimento: '09 Atendimento',
  vendas: '10 Vendas/PE',
  // Legado (jobs criados com template antigo)
  documentos: '01 Documentos',
  doc_roteiro: 'Roteiro',
  doc_briefing: 'Briefing',
  doc_relatorio_gravacao: 'Relatorio Gravacao',
  doc_retorno_cliente: 'Retorno Cliente',
  doc_isencao: 'Isencao Responsabilidade',
  financeiro: '02 Financeiro',
  fin_carta_orcamento: 'Carta Orcamento',
  fin_comprovantes_pg: 'Comprovantes PG',
  fin_notinhas_producao: 'Notinhas Producao',
  contratos: '05 Contratos',
  fornecedores: '06 Fornecedores',
  pos_producao: '08 Pos-Producao',
  pos_color: 'Color',
  pos_finalizacao: 'Finalizacao',
  pos_copias: 'Copias',
  atend_pre_producao: 'Pre-Producao',
  atend_producao: 'Producao',
  atend_pos_producao: 'Pos-Producao',
  atend_ancine: 'Contrato ANCINE',
  atend_claquete: 'Claquete',
  atend_ficha_tecnica: 'Ficha Tecnica',
  vendas_inicio: 'Inicio do Projeto',
}

// Folders que possuem subpastas (nivel-1 com filhos). Inclui v4 + legado
const PARENT_KEYS = [
  'monstro_pesquisa', 'clientes',
  // Legado
  'documentos', 'financeiro', 'contratos',
  'fornecedores', 'pos_producao', 'atendimento', 'vendas',
]

export function DriveSection({ job }: DriveSectionProps) {
  const { data: folders, total, isLoading } = useDriveFolders(job.id)
  const { mutateAsync: createStructure, isPending: isCreating } =
    useCreateDriveStructure()
  const { mutateAsync: recreateStructure, isPending: isRecreating } =
    useRecreateDriveStructure()
  const { mutateAsync: deleteStructure, isPending: isDeleting } =
    useDeleteDriveStructure()

  const hasFolders = total > 0
  const rootFolder = folders.find((f) => f.folder_key === 'root')
  const rootUrl = rootFolder?.url || job.drive_folder_url

  // Agrupar: nivel-1 (parent_folder_id = root.id ou null sem ser root)
  const level1 = folders.filter(
    (f) =>
      f.folder_key !== 'root' &&
      (f.parent_folder_id === rootFolder?.id || !f.parent_folder_id),
  )

  // Filhos de cada nivel-1
  const childrenOf = (parentId: string) =>
    folders.filter((f) => f.parent_folder_id === parentId)

  const handleCreate = async () => {
    try {
      const result = await createStructure(job.id)
      const created = result.data?.folders_created ?? 0
      toast.success(`${created} pasta(s) criada(s) no Google Drive`)
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : 'Erro ao criar pastas'
      toast.error(msg)
    }
  }

  const handleRecreate = async () => {
    try {
      const result = await recreateStructure(job.id)
      const created = result.data?.folders_created ?? 0
      toast.success(`Estrutura recriada: ${created} pasta(s)`)
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : 'Erro ao recriar pastas'
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    try {
      const result = await deleteStructure(job.id)
      const deleted = result.data?.deleted ?? 0
      toast.success(`${deleted} pasta(s) movida(s) para a lixeira do Drive`)
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : 'Erro ao excluir pastas'
      toast.error(msg)
    }
  }

  return (
    <section className="rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Google Drive</h3>
          {hasFolders ? (
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              Criado ({total})
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              Pendente
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {rootUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={rootUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                Abrir pasta
              </a>
            </Button>
          )}

          {!hasFolders && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <FolderPlus className="size-3.5 mr-1.5" />
              )}
              Criar pastas
            </Button>
          )}

          {hasFolders && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRecreating || isDeleting}
                  >
                    {isRecreating ? (
                      <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5 mr-1.5" />
                    )}
                    Recriar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recriar pastas do Drive?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os registros locais serao apagados e novas pastas serao
                      criadas no Google Drive. As pastas antigas no Drive NAO serao
                      deletadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRecreate}>
                      Recriar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting || isRecreating}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeleting ? (
                      <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5 mr-1.5" />
                    )}
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir pastas do Drive?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todas as {total} pastas deste job serao movidas para a lixeira
                      do Google Drive. Voce pode restaura-las na lixeira do Drive em
                      ate 30 dias.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir pastas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Estado vazio */}
      {!hasFolders && !isLoading && (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <FolderOpen className="size-8 text-muted-foreground/30 shrink-0" />
          <div>
            <p className="font-medium text-foreground/70">Nenhuma pasta criada</p>
            <p className="text-xs mt-0.5">
              Pastas serao criadas automaticamente no Google Drive apos aprovacao do job, ou clique em &quot;Criar pastas&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando pastas...</p>
      )}

      {/* Grid de pastas */}
      {hasFolders && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
          {level1.map((folder) => {
            const isParent = PARENT_KEYS.includes(folder.folder_key)
            const children = isParent ? childrenOf(folder.id) : []

            if (isParent && children.length > 0) {
              return (
                <FolderWithChildren
                  key={folder.id}
                  folder={folder}
                  subFolders={children}
                />
              )
            }

            return <FolderItem key={folder.id} folder={folder} />
          })}
        </div>
      )}
    </section>
  )
}

// --- Componentes auxiliares ---

function FolderItem({
  folder,
  indent = false,
}: {
  folder: DriveFolderRow
  indent?: boolean
}) {
  const label = FOLDER_LABELS[folder.folder_key] || folder.folder_key

  return (
    <div
      className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 text-sm ${
        indent ? 'ml-5' : ''
      }`}
    >
      <FolderOpen className="size-3.5 text-muted-foreground shrink-0" />
      {folder.url ? (
        <a
          href={folder.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate"
        >
          {label}
        </a>
      ) : (
        <span className="text-muted-foreground truncate">{label}</span>
      )}
    </div>
  )
}

function FolderWithChildren({
  folder,
  subFolders,
}: {
  folder: DriveFolderRow
  subFolders: DriveFolderRow[]
}) {
  const [open, setOpen] = useState(false)
  const label = FOLDER_LABELS[folder.folder_key] || folder.folder_key

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="col-span-full">
      <CollapsibleTrigger className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 text-sm w-full text-left">
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <FolderOpen className="size-3.5 text-muted-foreground shrink-0" />
        {folder.url ? (
          <a
            href={folder.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        ) : (
          <span className="truncate">{label}</span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {subFolders.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
          {subFolders.map((child) => (
            <FolderItem key={child.id} folder={child} indent />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
