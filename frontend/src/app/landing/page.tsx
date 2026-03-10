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
  Monitor,
  LayoutDashboard,
  KanbanSquare,
  Quote,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

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

const screenshots = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard CEO',
    description:
      'Visao 360 da operacao: faturamento do mes, jobs ativos, margem e alertas em tempo real.',
    tag: 'Visao geral',
    bg: 'from-primary/10 to-primary/5',
  },
  {
    icon: KanbanSquare,
    label: 'CRM Kanban',
    description:
      'Pipeline visual de oportunidades com drag-and-drop. Acompanhe cada orcamento do contato a aprovacao.',
    tag: 'CRM',
    bg: 'from-violet-500/10 to-violet-500/5',
  },
  {
    icon: Monitor,
    label: 'Pos-Producao',
    description:
      'Pipeline de 11 etapas do ingest ao material entregue, com versoes de corte e aprovacao integrada.',
    tag: 'Pos-producao',
    bg: 'from-amber-500/10 to-amber-500/5',
  },
]

const testimonials = [
  {
    name: 'Mariana Torres',
    role: 'Produtora Executiva',
    company: 'Frame House Producoes',
    text: 'Antes do ELLAHOS a gente vivia em planilha. Hoje eu abro o dashboard e em 30 segundos sei exatamente onde cada job esta, quanto vai entrar e o que esta atrasado.',
    stars: 5,
  },
  {
    name: 'Rafael Souza',
    role: 'Socio-Diretor',
    company: 'Mira Filmes',
    text: 'O modulo financeiro mudou completamente nossa visibilidade de caixa. Fluxo projetado com real lado a lado — coisa que a gente nunca conseguiu fazer em planilha.',
    stars: 5,
  },
  {
    name: 'Camila Neves',
    role: 'Head de Atendimento',
    company: 'Estudio Paralelo',
    text: 'O CRM integrado com a abertura de job foi o maior ganho. Aprovei o orcamento, cliquei em converter e o job ja nasceu com todas as informacoes preenchidas.',
    stars: 5,
  },
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

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a
              href="#features"
              onClick={handleScrollToFeatures}
              className="hover:text-foreground transition-colors"
            >
              Recursos
            </a>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Planos
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">
                Comecar gratis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
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

      {/* Screenshots */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O produto na pratica
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Cada modulo foi desenhado para o dia a dia de uma producao brasileira.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((screen) => {
            const Icon = screen.icon
            return (
              <div
                key={screen.label}
                className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Placeholder visual */}
                <div
                  className={`relative flex h-48 items-center justify-center bg-gradient-to-br ${screen.bg} border-b border-border/40`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground/70">
                      {screen.label}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="absolute right-3 top-3 text-xs"
                  >
                    {screen.tag}
                  </Badge>
                </div>

                {/* Descricao */}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {screen.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-muted/20 border-y border-border"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
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
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O que dizem as producoes
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Produtoras que trocaram planilhas pelo ELLAHOS.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card
              key={t.name}
              className="flex flex-col border-border/60"
            >
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative flex-1">
                  <Quote className="absolute -left-1 -top-1 h-5 w-5 text-primary/20" />
                  <p className="pl-4 text-sm leading-relaxed text-muted-foreground">
                    {t.text}
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{t.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.role} &middot; {t.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Comecar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">Ver planos e precos</Link>
            </Button>
          </div>
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
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Planos
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Entrar
              </Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">
                Cadastro
              </Link>
            </div>
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
