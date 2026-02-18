'use client'

import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function JobDetailError({ reset }: ErrorProps) {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
      <span className="text-5xl select-none" aria-hidden="true">
        {'\u26A0\uFE0F'}
      </span>
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        Ocorreu um erro ao carregar os detalhes do job. Tente novamente.
      </p>
      <Button onClick={reset} variant="outline" className="mt-4">
        Tentar novamente
      </Button>
    </div>
  )
}
