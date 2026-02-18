import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function JobNotFound() {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
      <span className="text-5xl select-none" aria-hidden="true">
        {'\uD83D\uDD75\uFE0F'}
      </span>
      <h2 className="text-lg font-semibold">Job nao encontrado</h2>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        Este job nao existe ou voce nao tem permissao para acessa-lo.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/jobs">Voltar para Jobs</Link>
      </Button>
    </div>
  )
}
