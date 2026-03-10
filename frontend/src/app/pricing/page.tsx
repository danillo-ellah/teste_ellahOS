'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Plan = {
  id: string
  name: string
  price: string
  priceNote: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  highlighted: boolean
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$399',
    priceNote: '/mes',
    description: 'Para produtoras que estao comecando a estruturar sua gestao.',
    features: [
      'Ate 5 usuarios',
      '20 jobs simultaneos',
      'Modulo Jobs + Equipe',
      'CRM (pipeline de oportunidades)',
      'Financeiro basico',
      'Suporte por email',
    ],
    cta: 'Testar 30 dias gratis',
    ctaHref: '/signup',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$899',
    priceNote: '/mes',
    description:
      'Para produtoras que precisam de controle total sobre toda a operacao.',
    features: [
      'Ate 15 usuarios',
      'Jobs ilimitados',
      'Todos os modulos: Jobs, CRM, Financeiro, Pos-producao, Relatorio de Set, Contratos',
      'Integracoes: Google Drive, WhatsApp, DocuSeal',
      'Importacao de dados (CSV/Excel)',
      'Suporte prioritario (resposta em 4h)',
    ],
    cta: 'Testar 30 dias gratis',
    ctaHref: '/signup',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'A partir de R$3.000',
    priceNote: '/mes',
    description:
      'Para produtoras com 20+ pessoas que precisam de suporte dedicado e migracao assistida.',
    features: [
      'Usuarios ilimitados',
      'Tudo do plano Pro',
      'Importacao e migracao de dados assistida',
      'Onboarding guiado com treinamento',
      'Suporte dedicado via WhatsApp',
      'Contrato customizado e NDA',
      'Piloto gratuito de 60 dias',
    ],
    cta: 'Falar com vendas',
    ctaHref: '/enterprise',
    highlighted: false,
  },
]

type FaqItem = { question: string; answer: string }

const faqItems: FaqItem[] = [
  {
    question: 'Ha periodo de teste gratuito?',
    answer:
      'Sim. Os planos Starter e Pro incluem 30 dias de teste gratuito, sem necessidade de cartao de credito. O plano Enterprise oferece um piloto de 60 dias com onboarding assistido.',
  },
  {
    question: 'Posso mudar de plano depois?',
    answer:
      'Sim. Voce pode fazer upgrade ou downgrade a qualquer momento. O valor e ajustado proporcionalmente no proximo ciclo de cobranca.',
  },
  {
    question: 'Como funciona o suporte?',
    answer:
      'O plano Starter recebe suporte por email com resposta em ate 2 dias uteis. O plano Pro tem suporte prioritario com resposta em ate 4 horas. O plano Enterprise inclui um gerente de conta dedicado.',
  },
  {
    question: 'Os dados da minha producao ficam seguros?',
    answer:
      'Sim. Todos os dados sao isolados por tenant (multi-tenant seguro), armazenados na regiao sa-east-1 (Sao Paulo), com criptografia em repouso e em transito. Fazemos backup diario automatico.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">ELLAHOS</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/landing">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Precos simples e transparentes
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Escolha o plano que se encaixa no tamanho da sua producao. Sem
            surpresas na fatura.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6">
          <Separator />
        </div>

        <section className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <FaqEntry key={index} item={item} />
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ainda com duvidas?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Nossa equipe esta pronta para ajudar a escolher o plano certo para
              a sua producao.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Comecar gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="mailto:comercial@ellahfilmes.com">Falar com vendas</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold tracking-tight">ELLAHOS</span>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ELLAHOS. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const isExternal = plan.ctaHref.startsWith('mailto:')

  return (
    <Card
      className={
        plan.highlighted
          ? 'relative border-2 border-primary shadow-lg'
          : 'relative border border-border/60'
      }
    >
      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="px-4 py-1 text-xs font-semibold">
            Mais popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="mt-1 leading-relaxed">
          {plan.description}
        </CardDescription>
        <div className="mt-4 flex items-end gap-1">
          {plan.priceNote ? (
            <>
              <span className="text-4xl font-extrabold tracking-tight">
                {plan.price}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">
                {plan.priceNote}
              </span>
            </>
          ) : (
            <span className="text-2xl font-extrabold tracking-tight">
              {plan.price}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm leading-relaxed text-foreground">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {isExternal ? (
          <Button
            asChild
            variant={plan.highlighted ? 'default' : 'outline'}
            size="lg"
            className="w-full"
          >
            <a href={plan.ctaHref}>{plan.cta}</a>
          </Button>
        ) : (
          <Button
            asChild
            variant={plan.highlighted ? 'default' : 'outline'}
            size="lg"
            className="w-full"
          >
            <Link href={plan.ctaHref}>{plan.cta}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function FaqEntry({ item }: { item: FaqItem }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-6 py-5">
      <p className="font-semibold leading-snug">{item.question}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {item.answer}
      </p>
    </div>
  )
}
