import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ClientsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="min-w-[200px]">
              <Skeleton className="h-3 w-16" />
            </TableHead>
            <TableHead className="w-36">
              <Skeleton className="h-3 w-12" />
            </TableHead>
            <TableHead className="w-32">
              <Skeleton className="h-3 w-20" />
            </TableHead>
            <TableHead className="w-36">
              <Skeleton className="h-3 w-14" />
            </TableHead>
            <TableHead className="w-20">
              <Skeleton className="h-3 w-14" />
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow
              key={i}
              className="h-[52px] hover:bg-transparent border-b border-border"
            >
              <TableCell className="min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell className="w-36">
                <Skeleton className="h-3 w-28" />
              </TableCell>
              <TableCell className="w-32">
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="w-36">
                <Skeleton className="h-3 w-24" />
              </TableCell>
              <TableCell className="w-20">
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
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
