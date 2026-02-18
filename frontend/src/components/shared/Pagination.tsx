'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  /** Singular do item (ex: "cliente", "job"). Plural e gerado automaticamente com +s */
  itemLabel?: string
  className?: string
}

const PER_PAGE_OPTIONS = [20, 50, 100] as const

function buildPageRange(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const visible = new Set<number>()
  visible.add(1)
  visible.add(total)
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) visible.add(i)
  }

  const sorted = Array.from(visible).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis'> = []

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i])
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) {
      result.push('ellipsis')
    }
  }

  return result
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  itemLabel = 'item',
  className,
}: PaginationProps) {
  const pageRange = buildPageRange(page, totalPages)
  const plural = total === 1 ? itemLabel : `${itemLabel}s`

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 mt-4', className)}>
      <p className="text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
        {totalPages <= 1 ? (
          <>{total} {plural}</>
        ) : (
          <>Pagina {page} de {totalPages} ({total} {plural})</>
        )}
      </p>

      <div className="flex items-center gap-3 order-1 sm:order-2">
        <Select
          value={String(perPage)}
          onValueChange={(v) => onPerPageChange(Number(v))}
        >
          <SelectTrigger
            className="h-8 w-16 text-xs"
            aria-label="Itens por pagina"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)} className="text-xs">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pageRange.map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground select-none"
                  aria-hidden
                >
                  ...
                </span>
              )
            }

            const isActive = item === page
            return (
              <Button
                key={item}
                variant={isActive ? 'default' : 'outline'}
                className={cn('h-8 w-8 p-0 text-xs', isActive && 'pointer-events-none')}
                onClick={() => !isActive && onPageChange(item)}
                aria-label={`Pagina ${item}`}
                aria-current={isActive ? 'page' : undefined}
                disabled={isActive}
              >
                {item}
              </Button>
            )
          })}

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Proxima pagina"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
