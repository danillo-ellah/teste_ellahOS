'use client'

import { useState } from 'react'
import { FileText, Contact, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ContactsSection } from '@/components/shared/ContactsSection'
import type { Agency, UpdateAgencyPayload } from '@/types/clients'

type TabId = 'dados' | 'contatos' | 'jobs'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dados', label: 'Dados', icon: FileText },
  { id: 'contatos', label: 'Contatos', icon: Contact },
  { id: 'jobs', label: 'Jobs', icon: Clapperboard },
]

interface AgencyDetailTabsProps {
  agency: Agency
  isEditing: boolean
  editData: UpdateAgencyPayload
  onEditChange: (data: UpdateAgencyPayload) => void
}

export function AgencyDetailTabs({
  agency,
  isEditing,
  editData,
  onEditChange,
}: AgencyDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dados')

  function getField<K extends keyof Agency>(key: K): Agency[K] {
    if (isEditing && key in editData) {
      return (editData as Record<string, unknown>)[key as string] as Agency[K]
    }
    return agency[key]
  }

  return (
    <div className="mt-6">
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="py-6">
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Razao Social">
              {isEditing ? (
                <Input
                  value={(getField('name') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, name: e.target.value })}
                />
              ) : (
                <span className="text-sm">{agency.name}</span>
              )}
            </Field>

            <Field label="Nome Fantasia">
              {isEditing ? (
                <Input
                  value={(getField('trading_name') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, trading_name: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{agency.trading_name ?? '-'}</span>
              )}
            </Field>

            <Field label="CNPJ">
              {isEditing ? (
                <Input
                  value={(getField('cnpj') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, cnpj: e.target.value || null })}
                />
              ) : (
                <span className="text-sm tabular-nums">{agency.cnpj ?? '-'}</span>
              )}
            </Field>

            <Field label="Website">
              {isEditing ? (
                <Input
                  value={(getField('website') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, website: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">
                  {agency.website ? (
                    <a
                      href={agency.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {agency.website}
                    </a>
                  ) : '-'}
                </span>
              )}
            </Field>

            <Field label="Endereco">
              {isEditing ? (
                <Input
                  value={(getField('address') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, address: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{agency.address ?? '-'}</span>
              )}
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Cidade" className="col-span-2">
                {isEditing ? (
                  <Input
                    value={(getField('city') as string) ?? ''}
                    onChange={(e) => onEditChange({ ...editData, city: e.target.value || null })}
                  />
                ) : (
                  <span className="text-sm">{agency.city ?? '-'}</span>
                )}
              </Field>
              <Field label="UF">
                {isEditing ? (
                  <Input
                    value={(getField('state') as string) ?? ''}
                    onChange={(e) => onEditChange({ ...editData, state: e.target.value || null })}
                    maxLength={2}
                  />
                ) : (
                  <span className="text-sm">{agency.state ?? '-'}</span>
                )}
              </Field>
            </div>

            <Field label="CEP">
              {isEditing ? (
                <Input
                  value={(getField('cep') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, cep: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{agency.cep ?? '-'}</span>
              )}
            </Field>

            <Field label="Observacoes" className="md:col-span-2">
              {isEditing ? (
                <Textarea
                  value={(getField('notes') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, notes: e.target.value || null })}
                  rows={3}
                />
              ) : (
                <span className="text-sm whitespace-pre-wrap">{agency.notes ?? '-'}</span>
              )}
            </Field>
          </div>
        )}

        {activeTab === 'contatos' && (
          <ContactsSection agencyId={agency.id} />
        )}

        {activeTab === 'jobs' && (
          <div className="text-sm text-muted-foreground text-center py-12">
            Lista de jobs vinculados a esta agencia sera exibida aqui.
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  )
}
