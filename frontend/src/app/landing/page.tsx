'use client'

import Link from 'next/link'
import {
  Clapperboard,
  DollarSign,
  Users,
  Scissors,
  Target,
  Plug,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const features = [
  {
    icon: Clapperboard,
    title: 'Jobs & Projetos',
    description:
      'Gerencie do orcamento a entrega. Controle cronogramas, equipes e entregas em um so lugar.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro',
    description:
      'Contas a pagar e receber, fluxo de caixa projetado, emissao e vinculacao de notas fiscais.',
  },
  {
    icon: Users,
    title: 'Equipe & Freelancers',
    description:
      'Casting, contratos digitais, controle de diarias e historico de colaboracoes.',
  },
  {
    icon: Scissors,
    title: 'Pos-Producao',
    description:
      'Pipeline de cortes com versionamento, aprovacoes internas e externas e entrega ao cliente.',
  },
  {
    icon: Target,
    title: 'CRM',
    description:
      'Pipeline de oportunidades, acompanhamento de orcamentos e gestao de atendimento.',
  },
  {
    icon: Plug,
    title: 'Integracoes',
    description:
      'Google Drive, WhatsApp, DocuSeal e muito mais. Sua producao conectada ao seu ecossistema.',
  },
]

const stats = [
  { value: '50+', label: 'funcionalidades' },
  { value: '6', label: 'integracoes' },
  { value: '1', label: 'plataforma' },
]

export default function LandingPage() {
  const handleScrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const el = document.getElementById('features')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">ELLAHOS</span>
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Feito para produtoras audiovisuais brasileiras
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Gestao inteligente para{' '}
            <span className="text-primary">produtoras audiovisuais</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Gerencie jobs, financeiro, equipe e clientes em um so lugar.
            Menos planilha, mais producao.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Comecar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <a href="#features" onClick={handleScrollToFeatures}>
                Conhecer recursos
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-3 divide-x divide-border">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 text-center">
                <p className="text-3xl font-extrabold text-primary sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que sua producao precisa
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Modulos integrados que cobrem todo o ciclo da sua producao.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="border-border/60 transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary/5 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pronto para organizar sua producao?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            Comece agora e tenha controle total dos seus projetos, equipe e
            financeiro.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">
              Comecar gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold tracking-tight">
              ELLAHOS
            </span>
            <Separator className="sm:hidden" />
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ELLAHOS. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
