import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function JobsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="w-10">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            <TableHead className="min-w-[240px]">
              <Skeleton className="h-3 w-12" />
            </TableHead>
            <TableHead className="w-48">
              <Skeleton className="h-3 w-16" />
            </TableHead>
            <TableHead className="w-40">
              <Skeleton className="h-3 w-20" />
            </TableHead>
            <TableHead className="w-20">
              <Skeleton className="h-3 w-10" />
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow
              key={i}
              className="h-[64px] hover:bg-transparent border-b border-border"
            >
              {/* Checkbox */}
              <TableCell className="w-10">
                <Skeleton className="h-4 w-4" />
              </TableCell>
              {/* Job + Cliente + Agencia */}
              <TableCell className="min-w-[240px]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              {/* Status + Tipo + Entrega */}
              <TableCell className="w-48">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-[22px] w-28 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              {/* Financeiro */}
              <TableCell className="w-40">
                <div className="flex flex-col gap-1.5 items-end">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14 rounded-sm" />
                </div>
              </TableCell>
              {/* Health */}
              <TableCell className="w-20">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-2 w-10 rounded-full" />
                </div>
              </TableCell>
              {/* Acoes */}
              <TableCell className="w-12">
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
