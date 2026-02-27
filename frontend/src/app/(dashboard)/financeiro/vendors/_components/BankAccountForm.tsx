'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBrazilianBanks } from '@/hooks/useVendors'
import type { BankAccount, AccountType, PixKeyType } from '@/types/cost-management'

export interface BankAccountFormData {
  bank_name: string
  bank_code: string
  agency: string
  account_number: string
  account_type: AccountType | ''
  pix_key: string
  pix_key_type: PixKeyType | ''
  is_primary: boolean
  account_holder: string
}

interface BankAccountFormProps {
  value: BankAccountFormData
  onChange: (value: BankAccountFormData) => void
  disabled?: boolean
}

const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatoria',
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupanca',
}

export function getEmptyBankAccountForm(): BankAccountFormData {
  return {
    bank_name: '',
    bank_code: '',
    agency: '',
    account_number: '',
    account_type: '',
    pix_key: '',
    pix_key_type: '',
    is_primary: false,
    account_holder: '',
  }
}

export function bankAccountToFormData(ba: BankAccount): BankAccountFormData {
  return {
    bank_name: ba.bank_name ?? '',
    bank_code: ba.bank_code ?? '',
    agency: ba.agency ?? '',
    account_number: ba.account_number ?? '',
    account_type: ba.account_type ?? '',
    pix_key: ba.pix_key ?? '',
    pix_key_type: ba.pix_key_type ?? '',
    is_primary: ba.is_primary,
    account_holder: ba.account_holder ?? '',
  }
}

export function BankAccountForm({ value, onChange, disabled }: BankAccountFormProps) {
  const { data: banksData, isLoading: banksLoading } = useBrazilianBanks()
  const banks = banksData?.data ?? []
  const [customBank, setCustomBank] = useState(false)

  function set(field: keyof BankAccountFormData, val: unknown) {
    onChange({ ...value, [field]: val })
  }

  function handleBankSelect(bankName: string) {
    if (bankName === '__outro__') {
      setCustomBank(true)
      onChange({ ...value, bank_name: '', bank_code: '' })
      return
    }
    const found = banks.find((b) => b.name === bankName)
    setCustomBank(false)
    onChange({
      ...value,
      bank_name: found?.name ?? bankName,
      bank_code: found?.code ?? '',
    })
  }

  const selectedBankValue = customBank
    ? '__outro__'
    : banks.find((b) => b.name === value.bank_name)?.name ?? (value.bank_name ? '__outro__' : '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Banco */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Banco</Label>
          <Select
            value={selectedBankValue}
            onValueChange={handleBankSelect}
            disabled={disabled || banksLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.code} value={bank.name}>
                  {bank.code} - {bank.name}
                </SelectItem>
              ))}
              <SelectItem value="__outro__">Outro</SelectItem>
            </SelectContent>
          </Select>
          {customBank && (
            <Input
              placeholder="Nome do banco"
              value={value.bank_name}
              onChange={(e) => set('bank_name', e.target.value)}
              disabled={disabled}
            />
          )}
        </div>

        {/* Titular */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Titular da Conta</Label>
          <Input
            placeholder="Nome do titular"
            value={value.account_holder}
            onChange={(e) => set('account_holder', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Agencia */}
        <div className="space-y-1.5">
          <Label>Agencia</Label>
          <Input
            placeholder="0000"
            value={value.agency}
            onChange={(e) => set('agency', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Numero da Conta */}
        <div className="space-y-1.5">
          <Label>Numero da Conta</Label>
          <Input
            placeholder="00000-0"
            value={value.account_number}
            onChange={(e) => set('account_number', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Tipo de Conta */}
        <div className="space-y-1.5">
          <Label>Tipo de Conta</Label>
          <Select
            value={value.account_type}
            onValueChange={(v) => set('account_type', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Chave PIX */}
        <div className="space-y-1.5">
          <Label>Tipo de Chave PIX</Label>
          <Select
            value={value.pix_key_type}
            onValueChange={(v) => set('pix_key_type', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PIX_KEY_TYPE_LABELS) as [PixKeyType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chave PIX */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Chave PIX</Label>
          <Input
            placeholder="Chave PIX"
            value={value.pix_key}
            onChange={(e) => set('pix_key', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Conta Principal */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="is_primary"
          checked={value.is_primary}
          onCheckedChange={(checked) => set('is_primary', !!checked)}
          disabled={disabled}
        />
        <Label htmlFor="is_primary" className="font-normal cursor-pointer">
          Definir como conta principal
        </Label>
      </div>
    </div>
  )
}
