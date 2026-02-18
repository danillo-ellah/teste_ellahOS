'use client'

import { useState } from 'react'
import { FileText, Briefcase, Landmark, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TEAM_ROLE_LABELS } from '@/lib/constants'
import { TEAM_ROLES } from '@/types/jobs'
import { formatCurrency } from '@/lib/format'
import type { Person, UpdatePersonPayload, BankInfo } from '@/types/people'
import type { TeamRole } from '@/types/jobs'

type TabId = 'dados' | 'profissional' | 'bancarios' | 'jobs'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dados', label: 'Dados', icon: FileText },
  { id: 'profissional', label: 'Profissional', icon: Briefcase },
  { id: 'bancarios', label: 'Bancarios', icon: Landmark },
  { id: 'jobs', label: 'Jobs', icon: Clapperboard },
]

interface PersonDetailTabsProps {
  person: Person
  isEditing: boolean
  editData: UpdatePersonPayload
  onEditChange: (data: UpdatePersonPayload) => void
}

export function PersonDetailTabs({
  person,
  isEditing,
  editData,
  onEditChange,
}: PersonDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dados')

  function getField<K extends keyof Person>(key: K): Person[K] {
    if (isEditing && key in editData) {
      return (editData as Record<string, unknown>)[key as string] as Person[K]
    }
    return person[key]
  }

  const bankInfo: BankInfo = (isEditing ? editData.bank_info : person.bank_info) ?? {}

  function updateBank(partial: Partial<BankInfo>) {
    onEditChange({
      ...editData,
      bank_info: { ...bankInfo, ...partial },
    })
  }

  return (
    <div className="mt-6">
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px overflow-x-auto" role="tablist">
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
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
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
        {/* Tab Dados */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Nome completo">
              {isEditing ? (
                <Input
                  value={(getField('full_name') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, full_name: e.target.value })}
                />
              ) : (
                <span className="text-sm">{person.full_name}</span>
              )}
            </Field>

            <Field label="CPF">
              {isEditing ? (
                <Input
                  value={(getField('cpf') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, cpf: e.target.value || null })}
                />
              ) : (
                <span className="text-sm tabular-nums">{person.cpf ?? '-'}</span>
              )}
            </Field>

            <Field label="RG">
              {isEditing ? (
                <Input
                  value={(getField('rg') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, rg: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.rg ?? '-'}</span>
              )}
            </Field>

            <Field label="Data de nascimento">
              {isEditing ? (
                <Input
                  type="date"
                  value={(getField('birth_date') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, birth_date: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.birth_date ?? '-'}</span>
              )}
            </Field>

            <Field label="DRT">
              {isEditing ? (
                <Input
                  value={(getField('drt') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, drt: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.drt ?? '-'}</span>
              )}
            </Field>

            <Field label="CTPS (numero)">
              {isEditing ? (
                <Input
                  value={(getField('ctps_number') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, ctps_number: e.target.value || null })}
                  placeholder="Numero da carteira"
                />
              ) : (
                <span className="text-sm tabular-nums">{person.ctps_number ?? '-'}</span>
              )}
            </Field>

            <Field label="CTPS (serie)">
              {isEditing ? (
                <Input
                  value={(getField('ctps_series') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, ctps_series: e.target.value || null })}
                  placeholder="Serie"
                />
              ) : (
                <span className="text-sm tabular-nums">{person.ctps_series ?? '-'}</span>
              )}
            </Field>

            <Field label="Email">
              {isEditing ? (
                <Input
                  type="email"
                  value={(getField('email') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, email: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.email ?? '-'}</span>
              )}
            </Field>

            <Field label="Telefone">
              {isEditing ? (
                <Input
                  value={(getField('phone') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, phone: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.phone ?? '-'}</span>
              )}
            </Field>

            <Field label="Endereco" className="md:col-span-2">
              {isEditing ? (
                <Input
                  value={(getField('address') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, address: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.address ?? '-'}</span>
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
                  <span className="text-sm">{person.city ?? '-'}</span>
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
                  <span className="text-sm">{person.state ?? '-'}</span>
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
                <span className="text-sm">{person.cep ?? '-'}</span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Profissional */}
        {activeTab === 'profissional' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Profissao">
              {isEditing ? (
                <Input
                  value={(getField('profession') as string) ?? ''}
                  onChange={(e) => onEditChange({ ...editData, profession: e.target.value || null })}
                />
              ) : (
                <span className="text-sm">{person.profession ?? '-'}</span>
              )}
            </Field>

            <Field label="Funcao padrao">
              {isEditing ? (
                <Select
                  value={(getField('default_role') as string) ?? ''}
                  onValueChange={(v) => onEditChange({ ...editData, default_role: (v || null) as TeamRole | null })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {person.default_role ? TEAM_ROLE_LABELS[person.default_role] : '-'}
                </span>
              )}
            </Field>

            <Field label="Cache padrao (diaria)">
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editData.default_rate ?? person.default_rate ?? ''}
                  onChange={(e) => onEditChange({
                    ...editData,
                    default_rate: e.target.value ? Number(e.target.value) : null,
                  })}
                />
              ) : (
                <span className="text-sm tabular-nums">
                  {person.default_rate ? formatCurrency(person.default_rate) : '-'}
                </span>
              )}
            </Field>

            <Field label="Tipo">
              {isEditing ? (
                <label className="flex items-center gap-3 cursor-pointer select-none h-9">
                  <Switch
                    checked={getField('is_internal') as boolean}
                    onCheckedChange={(checked) => onEditChange({ ...editData, is_internal: !!checked })}
                  />
                  <span className="text-sm">
                    {(getField('is_internal') as boolean) ? 'Interno' : 'Freelancer'}
                  </span>
                </label>
              ) : (
                <span className="text-sm">
                  {person.is_internal ? 'Interno' : 'Freelancer'}
                </span>
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
                <span className="text-sm whitespace-pre-wrap">{person.notes ?? '-'}</span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Bancarios */}
        {activeTab === 'bancarios' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
            <Field label="Banco">
              {isEditing ? (
                <Input
                  value={bankInfo.bank_name ?? ''}
                  onChange={(e) => updateBank({ bank_name: e.target.value || undefined })}
                  placeholder="Ex: Itau, Nubank..."
                />
              ) : (
                <span className="text-sm">{bankInfo.bank_name ?? '-'}</span>
              )}
            </Field>

            <Field label="Agencia">
              {isEditing ? (
                <Input
                  value={bankInfo.agency ?? ''}
                  onChange={(e) => updateBank({ agency: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm tabular-nums">{bankInfo.agency ?? '-'}</span>
              )}
            </Field>

            <Field label="Conta">
              {isEditing ? (
                <Input
                  value={bankInfo.account ?? ''}
                  onChange={(e) => updateBank({ account: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm tabular-nums">{bankInfo.account ?? '-'}</span>
              )}
            </Field>

            <Field label="Tipo de conta">
              {isEditing ? (
                <Select
                  value={bankInfo.account_type ?? ''}
                  onValueChange={(v) => updateBank({ account_type: (v || undefined) as BankInfo['account_type'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupanca</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {bankInfo.account_type === 'corrente' ? 'Corrente'
                    : bankInfo.account_type === 'poupanca' ? 'Poupanca'
                    : '-'}
                </span>
              )}
            </Field>

            <Field label="Chave PIX">
              {isEditing ? (
                <Input
                  value={bankInfo.pix_key ?? ''}
                  onChange={(e) => updateBank({ pix_key: e.target.value || undefined })}
                />
              ) : (
                <span className="text-sm">{bankInfo.pix_key ?? '-'}</span>
              )}
            </Field>

            <Field label="Tipo do PIX">
              {isEditing ? (
                <Select
                  value={bankInfo.pix_type ?? ''}
                  onValueChange={(v) => updateBank({ pix_type: (v || undefined) as BankInfo['pix_type'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="chave_aleatoria">Chave aleatoria</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {bankInfo.pix_type === 'cpf' ? 'CPF'
                    : bankInfo.pix_type === 'email' ? 'Email'
                    : bankInfo.pix_type === 'telefone' ? 'Telefone'
                    : bankInfo.pix_type === 'chave_aleatoria' ? 'Chave aleatoria'
                    : '-'}
                </span>
              )}
            </Field>
          </div>
        )}

        {/* Tab Jobs */}
        {activeTab === 'jobs' && (
          <div className="text-sm text-muted-foreground text-center py-12">
            Historico de participacoes em jobs sera exibido aqui.
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
