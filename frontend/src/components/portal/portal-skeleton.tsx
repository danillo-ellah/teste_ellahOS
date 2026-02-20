import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton da pagina do portal publico — exibido durante o carregamento inicial */
export function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto h-full px-4 flex items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 flex-1 max-w-xs" />
          <div className="flex gap-2 ml-auto">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>

      {/* Conteudo skeleton */}
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12 space-y-8">
        {/* Hero skeleton */}
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <div className="space-y-2 mt-2">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          {/* Pipeline skeleton */}
          <div className="flex gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-2 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-3.5 w-3.5 rounded-full mt-1 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentos skeleton */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-44" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Chat skeleton */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="h-64 p-4 space-y-4">
            {/* Mensagem da producao */}
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-48 rounded-lg" />
              </div>
            </div>
            {/* Mensagem do cliente */}
            <div className="flex gap-3 justify-end flex-row-reverse">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1 items-end flex flex-col">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-36 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
