'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Copy, ShieldAlert } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { CategoriesTable } from './_components/CategoriesTable'
import { CategoryDialog } from './_components/CategoryDialog'
import { DuplicateTemplateDialog } from './_components/DuplicateTemplateDialog'
import type { CostCategory } from '@/types/cost-management'

const PRODUCTION_TYPE_LABELS: Record<string, string> = {
  all: 'Todos os Tipos',
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
}

const PRODUCTION_TYPES = Object.keys(PRODUCTION_TYPE_LABELS)
const ADMIN_ROLES = ['admin', 'ceo']

export default function CostCategoriesAdminPage() {
  const { role, isLoading: roleLoading } = useUserRole()
  const [activeType, setActiveType] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CostCategory | null>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)

  // Garante que o tipo selecionado nao fica como 'all' ao abrir dialog de criacao
  const defaultProductionType =
    activeType !== 'all' ? activeType : 'filme_publicitario'

  // Guarda de acesso
  if (roleLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Verificando permissoes...
      </div>
    )
  }

  if (!role || !ADMIN_ROLES.includes(role)) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Acesso restrito. Somente administradores podem gerenciar categorias.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Templates de Categorias de Custo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os templates de categorias por tipo de producao
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="default"
            className="h-9 px-4"
            onClick={() => setDuplicateOpen(true)}
          >
            <Copy className="size-4 mr-1.5" />
            Duplicar Template
          </Button>
          <Button
            size="default"
            className="h-9 px-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 mr-1.5" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Tabs de tipo de producao */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList className="flex-wrap h-auto gap-1">
          {PRODUCTION_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
              {PRODUCTION_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tabela de categorias */}
      <CategoriesTable
        productionType={activeType}
        onEdit={(category) => setEditCategory(category)}
      />

      {/* Dialog de criacao — key muda a cada abertura para reinicializar o formulario */}
      <CategoryDialog
        key={createOpen ? `create-${defaultProductionType}` : 'create-closed'}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProductionType={defaultProductionType}
      />

      {/* Dialog de edicao — key muda por id da categoria editada */}
      <CategoryDialog
        key={editCategory ? `edit-${editCategory.id}` : 'edit-closed'}
        open={!!editCategory}
        onOpenChange={(o) => {
          if (!o) setEditCategory(null)
        }}
        category={editCategory}
      />

      {/* Dialog de duplicacao — key muda a cada abertura */}
      <DuplicateTemplateDialog
        key={duplicateOpen ? 'dup-open' : 'dup-closed'}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />
    </div>
  )
}
