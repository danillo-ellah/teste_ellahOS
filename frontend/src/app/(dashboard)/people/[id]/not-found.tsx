import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PersonNotFound() {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
      <span className="text-5xl select-none" aria-hidden="true">
        {'\uD83C\uDFA5'}
      </span>
      <h2 className="text-lg font-semibold">Pessoa nao encontrada</h2>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        Esta pessoa nao existe ou voce nao tem permissao para acessa-la.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/people">Voltar para Equipe</Link>
      </Button>
    </div>
  )
}
