import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  error?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  required,
  optional,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {optional && (
          <span className="text-muted-foreground font-normal ml-1">
            (opcional)
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
