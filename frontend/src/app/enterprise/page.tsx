'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  Shield,
  Upload,
  Plug,
  Clock,
  Users,
  Headphones,
  Building2,
  Send,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const benefits = [
  {
    icon: Upload,
    title: 'Importacao de dados',
    description:
      'Migracao assistida do seu historico de projetos, clientes e financeiro. Importacao via CSV/Excel e acompanhamento dedicado na transicao.',
  },
  {
    icon: Plug,
    title: 'Integracao contabil (roadmap)',
    description:
      'Integracoes com Omie e Conta Azul estao no roadmap. O ELLAHOS funciona como companion do seu ERP — inteligencia de producao sem substituir seu sistema fiscal.',
  },
  {
    icon: Shield,
    title: 'Seguranca e isolamento',
    description:
      'Multi-tenant com RLS (Row-Level Security), dados isolados por organizacao, criptografia em transito e em repouso, backup diario automatico.',
  },
  {
    icon: Headphones,
    title: 'Suporte dedicado + onboarding assistido',
    description:
      'Gerente de conta exclusivo com acesso direto via WhatsApp. Onboarding guiado com sessoes de treinamento para toda a sua equipe.',
  },
  {
    icon: Users,
    title: 'Usuarios ilimitados',
    description:
      'Sem limite de assentos. Adicione toda a sua equipe interna, freelas recorrentes e parceiros sem custo adicional por usuario.',
  },
  {
    icon: Clock,
    title: 'Piloto gratuito de 60 dias',
    description:
      'Teste o ELLAHOS com sua equipe real, em jobs reais, por 60 dias sem compromisso. Inclui onboarding assistido e migracao de dados.',
  },
]

const included = [
  'Tudo do plano Pro',
  'Usuarios ilimitados',
  'Importacao de dados assistida (CSV/Excel)',
  'Backup diario com retencao de 90 dias',
  'Contrato customizado e NDA',
  'Treinamento presencial ou remoto para toda a equipe',
  'Suporte prioritario via WhatsApp (resposta em ate 4h)',
]

type FormState = {
  name: string
  email: string
  company: string
  phone: string
  message: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  company: '',
  phone: '',
  message: '',
}

export default function EnterprisePage() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const submittingRef = useRef(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function buildMailtoHref(): string {
    const subject = encodeURIComponent(
      `Interesse Enterprise — ${form.company || form.name}`,
    )
    const body = encodeURIComponent(
      [
        `Nome: ${form.name}`,
        `Email: ${form.email}`,
        `Empresa: ${form.company}`,
        `Telefone: ${form.phone}`,
        '',
        `Mensagem:`,
        form.message,
      ].join('\n'),
    )
    return `mailto:comercial@ellahfilmes.com?subject=${subject}&body=${body}`
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true

    const href = buildMailtoHref()
    window.location.href = href

    // Libera o mutex apos um breve delay para evitar duplo envio por clique rapido
    setTimeout(() => {
      submittingRef.current = false
    }, 2000)
  }

  const isValid =
    form.name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.company.trim() !== ''

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">ELLAHOS</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar para planos
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Para grandes producoes e grupos audiovisuais
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              ELLAHOS{' '}
              <span className="text-primary">Enterprise</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Para produtoras que precisam de suporte dedicado, migracao de dados
              assistida e treinamento para toda a equipe. Piloto gratuito de 60 dias.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  const el = document.getElementById('contact-form')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Falar com vendas
                <Send className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/pricing">Comparar planos</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section className="bg-muted/20 border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo que operacoes de grande escala precisam
              </h2>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                Recursos exclusivos que vao alem do plano Pro.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon
                return (
                  <Card
                    key={benefit.title}
                    className="border-border/60 transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* O que esta incluso */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <Badge variant="secondary" className="mb-4">
                Incluso no Enterprise
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Uma plataforma completa, sem limites
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tudo do plano Pro mais os recursos exclusivos para operacoes avancadas.
              </p>
            </div>

            <ul className="space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm leading-relaxed text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6">
          <Separator />
        </div>

        {/* Formulario de contato */}
        <section id="contact-form" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Fale com nossa equipe
              </h2>
              <p className="mt-4 text-muted-foreground">
                Preencha o formulario e entraremos em contato em ate 1 dia util.
              </p>
            </div>

            <Card className="border-border/60">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Seu nome completo"
                      value={form.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="voce@suaempresa.com.br"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                    />
                  </div>

                  {/* Empresa */}
                  <div className="space-y-2">
                    <Label htmlFor="company">
                      Empresa <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Nome da sua producao"
                      value={form.company}
                      onChange={handleChange}
                      required
                      autoComplete="organization"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                  </div>

                  {/* Mensagem */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Conte um pouco sobre sua operacao, numero de usuarios, integrações de interesse..."
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!isValid}
                  >
                    Enviar mensagem
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* CTA alternativo */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Prefere falar agora?{' '}
                <a
                  href="tel:+551100000000"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Ligue para (11) XXXX-XXXX
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold tracking-tight">ELLAHOS</span>
            <Separator className="sm:hidden" />
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link
                href="/landing"
                className="hover:text-foreground transition-colors"
              >
                Inicio
              </Link>
              <Link
                href="/pricing"
                className="hover:text-foreground transition-colors"
              >
                Planos
              </Link>
              <Link
                href="/login"
                className="hover:text-foreground transition-colors"
              >
                Entrar
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
