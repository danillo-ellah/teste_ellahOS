# Revisao UX — Fluxo Multi-Tenant Signup + Onboarding
**Data:** 2026-03-10
**Revisor:** UI/UX Designer — ELLAHOS Design System v1.0
**Escopo:** Landing Page, Signup, Onboarding Wizard, Invite

---

## Resumo Executivo

O fluxo esta funcionalmente solido e demonstra boas praticas em varios pontos (mutex anti-double-submit, mapeamento de erros auth, mascaras de CNPJ/telefone, aria-labels no stepper). Porem, existem falhas estruturais que afetam diretamente a taxa de conversao e a confianca do usuario. Os problemas mais criticos estao na Landing Page (CTA de cabecalho errado, ausencia de social proof real, stats fracos) e no Onboarding (campo URL de logo inadequado para o publico, passo de integracoes confuso, tela de conclusao sem CTA principal claro).

**Nota geral: 6.1 / 10**

---

## Notas por Tela

### 1. Landing Page (`/landing`)

**Nota: 6.0 / 10**

#### O que funciona bem
- Estrutura Hero → Stats → Features → CTA → Footer e classica e comprovada.
- Sticky header com backdrop-blur e correto — desaparece sem abafar o conteudo.
- Grid de features responsivo (1 col mobile, 2 col tablet, 3 col desktop) e adequado.
- Copy do hero e direto: "Menos planilha, mais producao." e uma boa tagline.
- Botao primario aponta para `/signup` — correto no hero.

#### Problemas encontrados

**[CRITICO] CTA do header aponta para `/login`, nao `/signup`**
O botao "Entrar" no `<header>` (linha 79) usa `href="/login"`. Para um visitante novo que ainda nao tem conta, o CTA de header deveria ser "Comecar gratis" apontando para `/signup`. "Entrar" no header so faz sentido como link ghost secundario ao lado de um CTA de signup. Isso mata conversao de novos visitantes que leram o texto e clicaram no botao mais visivel da pagina.

**[ALTO] Stats sem credibilidade — numeros parecem marketing vazio**
Os tres stats sao "50+ funcionalidades", "6 integracoes", "1 plataforma". O numero "1" como stat de uma unica plataforma e fraco ao ponto de prejudicar credibilidade — parece placeholder. Stats que convertem em SaaS sao sobre o usuario: clientes ativos, horas economizadas, projetos gerenciados, etc. Para um produto novo, alternativas honnestas seriam: "R$ X mi gerenciados", "X produtoras", ou simplesmente remover esta secao.

**[ALTO] Ausencia de social proof**
Nenhum depoimento, logo de cliente, nome de produtora conhecida, ou qualquer indicativo de que alguem usa o sistema. Para o publico-alvo (produtores executivos experientes, pessoas que avaliam ferramentas pelo historico de uso), a ausencia total de social proof e uma barreira significativa.

**[MEDIO] Copy das features usa jargao sem beneficio claro**
"Casting, contratos digitais, controle de diarias e historico de colaboracoes" descreve o que o sistema faz, nao o beneficio para o usuario. A referencia de mercado (Linear, Notion) sempre posiciona beneficio: nao "versionamento de cortes" mas "nunca perca uma versao aprovada". Para o publico audiovisual, o beneficio e emocional (menos stress no set, cliente nao te liga mais), nao funcional.

**[MEDIO] Footer minimalista demais — sem links de suporte**
O footer tem apenas logo + copyright. Para um SaaS que exige cadastro, o usuario precisa ver pelo menos: Politica de Privacidade, Termos de Uso, Contato/Suporte. A ausencia desses links levanta desconfianca, especialmente em ambiente B2B brasileiro (LGPD).

**[MEDIO] Falta de logotipo visual — apenas texto "ELLAHOS"**
O header renderiza apenas texto `ELLAHOS` sem o logo da Ellah Filmes. O design system define o rosa blush (#F472B6) como identidade da marca. A landing deveria usar o logomark para criar associacao visual com materiais off-line da empresa.

**[BAIXO] Scroll suave funciona com JS — sem fallback**
`handleScrollToFeatures` usa `scrollIntoView({ behavior: 'smooth' })` via JavaScript. Se o JS nao carregou ainda (conexao lenta no set), o botao "Conhecer recursos" nao faz nada. A solucao e usar `href="#features"` como href real no `<a>` e o JS como enhancement (o que ja e feito), mas o `e.preventDefault()` elimina o fallback nativo. Remover o preventDefault e deixar o comportamento nativo como fallback.

**[BAIXO] Nao ha dark mode diferenciado na landing**
A landing usa `bg-background` que responde ao dark mode do sistema, o que e correto. Porem o gradiente do hero (`from-primary/5`) pode ter contraste baixo no dark mode dependendo da cor de fundo. Nao foi possivel verificar sem renderizar, mas e um ponto de atencao.

---

### 2. Pagina de Signup (`/(auth)/signup`)

**Nota: 7.0 / 10**

#### O que funciona bem
- Todos os 5 campos tem `<label>` com `htmlFor` associado ao `id` do input — correto para acessibilidade.
- `autoComplete` correto em todos os campos (organization, name, email, new-password).
- Mutex com `useRef` anti-double-submit implementado — raro e correto.
- Mapeamento de erros do Supabase Auth para portugues simples e claro.
- Validacao inline que limpa o erro do campo especifico ao digitar — boa UX.
- Estado de confirmacao de email separado e bem construido.
- Campos de senha usam `type="password"` com `autoComplete="new-password"` — previne autofill incorreto.

#### Problemas encontrados

**[ALTO] Inputs sao elementos `<input>` nativos, nao o componente `<Input>` do shadcn/ui**
O signup usa `<input className="flex h-9 w-full rounded-md border border-input...">` inline, enquanto o onboarding usa `<Input>` do shadcn. Isso cria inconsistencia de componentes no mesmo fluxo. O design system determina shadcn/ui como base. Alem da inconsistencia visual (sutil mas presente), o componente Input do shadcn ja tem os estilos corretos e e mais facil de manter.

**[ALTO] Botao de submit e `<button>` nativo, nao `<Button>` do shadcn/ui**
Mesmo problema: `<button className="inline-flex h-9 w-full...">` em vez de `<Button>`. O loading state e implementado manualmente com texto "Criando conta..." mas sem spinner visual (Loader2 do Lucide), diferente do padrao do design system que exige o icone animado.

**[ALTO] Campo "Nome da produtora" duplica o campo de mesmo nome no Passo 1 do Onboarding**
O usuario digita o nome da produtora no signup, e depois volta a ver o mesmo campo no Passo 1 do onboarding (pre-preenchido). A duplicacao e confusa — o usuario se pergunta "ja nao informei isso?". Solucao: remover o campo `companyName` do signup e captura-lo apenas no onboarding, ou remover do onboarding e usar o que foi digitado no signup diretamente.

**[MEDIO] Ausencia de indicador de forca de senha**
O campo senha exige minimo 8 caracteres mas nao da feedback visual de forca. Para usuarios nao-tecnicos (o publico-alvo), um indicador simples (fraca/media/forte com cores) reduz frustracoes com senhas rejeitadas na criacao de conta. O design system tem as cores semanticas adequadas (red/yellow/green).

**[MEDIO] Layout do auth usa `max-w-md` — largo demais para 5 campos simples**
O `AuthLayout` define `max-w-md` (448px). Para o signup com 5 campos empilhados, o card parece "esticado" horizontalmente em desktop. Formularios simples de auth funcionam melhor em `max-w-sm` (384px), com os inputs mais compactos. O onboarding usa `max-w-2xl` separado, o que e correto para um wizard.

**[MEDIO] Erro de "User already registered" tem copy confuso**
A mensagem mapeada e: "Verifique seus dados e tente novamente, ou faca login." Para um email ja cadastrado, o usuario nao precisa "verificar dados" — ele precisa fazer login ou resetar a senha. Copy mais direto: "Este email ja esta cadastrado. Faca login ou redefina sua senha." com links para `/login` e `/forgot-password`.

**[BAIXO] Sem `required` nos inputs — validacao e 100% client-side via JS**
Se o JS falhar ou o usuario desabilitar, o formulario pode ser enviado vazio. Adicionar `required` nos inputs obrigatorios como camada extra de defesa (o validate() ja faz o trabalho pesado, mas o required e uma net de seguranca e melhora a semantica do formulario).

**[BAIXO] Sem link de "Politica de Privacidade" antes do cadastro**
Em contexto B2B com LGPD, e boa pratica ter texto como "Ao criar sua conta, voce concorda com os Termos de Uso e Politica de Privacidade" antes do botao de submit. Ausente aqui.

---

### 3. Wizard de Onboarding (`/onboarding`)

**Nota: 6.5 / 10**

#### O que funciona bem
- `StepperBar` com navegacao por teclado (focus-visible ring) e aria-labels e correto.
- Passos opcionais (3 e 4) tem botao "Pular" claramente disponivel.
- Botao "Anterior" desabilitado no passo 1 — comportamento correto.
- Guard de redirecionamento se onboarding ja foi concluido (via `useEffect`).
- Pre-preenchimento com dados salvos e restauracao do passo (`onboarding_step`) funcionam.
- Mutex `submittingRef` no handleNext — anti-double-submit.
- Mascaras de CNPJ e telefone com validacao de digitos verificadores — producao-ready.
- Labels do shadcn/ui com asterisco vermelho nos campos obrigatorios.
- Spinner no botao durante submit e correto.

#### Problemas encontrados

**[CRITICO] Passo 1: Campo "URL do logo" e inadequado para o publico-alvo**
O campo `logoUrl` pede uma URL (`https://exemplo.com/logo.png`). Produtores executivos e coordenadores nao sabem onde esta a URL publica do logo da empresa. Esse campo exigiria que o usuario subisse o logo em algum lugar, copiasse a URL e colasse — uma jornada de 5+ passos para algo que deveria ser drag-and-drop. O proprio helper text diz "Voce pode configurar o upload do logo depois em Configuracoes" — o que confirma que esse campo nao deveria estar aqui. **Recomendacao:** remover o campo de logo do onboarding completamente. O Passo 1 fica mais limpo e focado no essencial (nome + CNPJ + cidade/estado).

**[CRITICO] Passo 5 (Conclusao): CTA principal esta ausente ou enterrado**
A tela de conclusao mostra: icone Rocket + titulo "Bem-vindo!" + resumo de passos + grid de atalhos. O botao "Comecar" (que executa `completeOnboarding` e redireciona) fica na barra de navegacao fora do card, com label "Comecar" sem contexto visual — o usuario nao entende que clicar ali finaliza o setup. O momento de conclusao de onboarding e emocionalmente importante — merece um CTA prominente dentro do card, como "Entrar no ELLAHOS" com estilo primary e tamanho lg, imediatamente abaixo do Rocket.

**[ALTO] Passo 4 (Integracoes): conceito de "Ja configurei" e confuso**
Os checkboxes dizem "Ja configurei o Google Drive" e "Ja configurei o WhatsApp". Mas o usuario acabou de criar a conta — nao teve tempo de configurar nada. O link "Configurar" abre `href="/settings/integrations"` em nova aba (`target="_blank"`), o que tira o usuario do onboarding no meio do fluxo. A mensagem de contexto diz "Voce pode pular agora e configurar depois em Configuracoes" — o que e a instrucao correta, mas sugere que o passo inteiro deveria ser pulado, tornando-o redundante. **Recomendacao:** reformular o passo 4 como "Saiba o que voce pode integrar" com cards informativos (sem checkbox), e um unico CTA "Configurar depois". O checkbox de "Ja configurei" cria uma falsa sensacao de completude sem beneficio real.

**[ALTO] StepperBar: labels ficam ocultos em mobile (`hidden sm:block`)**
No mobile, os labels dos passos (Empresa, Perfil, Equipe, etc.) sao ocultados com `hidden sm:block`. O usuario ve apenas os circulos numerados 1-5 sem saber o que cada um representa. Em um wizard de 5 passos, perder os labels em mobile e um problema de orientacao significativo. **Alternativa:** usar labels abreviados em mobile (2-3 chars) ou exibir o label do passo atual em texto abaixo do stepper.

**[ALTO] Passo 3 (Equipe): row de inputs email + select + botao tem toque insuficiente em mobile**
O `<div className="flex gap-2">` contem Input + Select de `w-44` + Button icon-only. Em mobile (320-375px), os tres elementos disputam espaco horizontal. O Input "flex-1" fica com largura minima que pode ser menor que 120px, o Select de `w-44` (176px) nao vai caber, e o botao icon-only de 36px pode ser menor que o touch target de 44px recomendado pelo design system. **Recomendacao:** em mobile, empilhar o Input em linha propria e o Select + Botao em linha abaixo.

**[MEDIO] Passo 2 (Perfil): campo "Nome completo" pode ser pre-preenchido do signup mas o usuario nao sabe**
O `useEffect` pre-preenche `fullName` de `status.profile.full_name`. Se o usuario ja digitou no signup, o campo chega preenchido. Se o campo esta preenchido mas o usuario nao percebe (scroll rapido), ele pode clicar "Proximo" sem confirmar. Adicionar um texto de contexto: "Importado do cadastro — confirme ou edite." quando o campo ja estiver preenchido.

**[MEDIO] Loading state do wizard e um skeleton generico sem forma**
O estado de carregamento (linhas 858-865) exibe dois retangulos `animate-pulse` sem relacao com o conteudo real: um `h-12` para o stepper e um `h-64` para o card. O design system especifica skeleton que imita a estrutura do conteudo real. O stepper deveria ter 5 circulos skeleton, e o card deveria ter o formato aproximado do CardHeader + CardContent.

**[MEDIO] Passo 3 (Equipe): erro de convite aparece via toast, nao inline**
`toast.error('Informe o e-mail para adicionar')` — toasts sao efemeros (4s por padrao do design system). Para erros de validacao de campo (email vazio, email invalido), a mensagem deveria aparecer inline abaixo do campo, nao em toast. Toasts sao para feedback de acoes assincronas (convite enviado, falhou no servidor).

**[MEDIO] Passo 5: "Integracoes reconhecidas" como item de resumo e confuso**
No resumo do passo 5, o label do passo 4 e "Integracoes reconhecidas". O usuario que nao marcou nenhum checkbox (pulo o passo) ve o item com strikethrough — parece que ele errou algo. O STEP_LABELS deveria ser "Integracoes revisadas" ou simplesmente remover o passo 4 do resumo (ja que e opcional e nao configura nada de fato).

**[BAIXO] Sem transicao entre passos**
A troca de passo e instantanea — o conteudo simplesmente substitui. O design system menciona Framer Motion para animacoes sutis. Uma transicao de fade-in (150ms ease-out) ao trocar de passo melhoraria a percepcao de progresso sem adicionar complexidade.

**[BAIXO] Logo no layout do onboarding diz "ELLAOS" (sem H)**
O `OnboardingLayout` (linha 12) renderiza: `ELLA<span>OS</span>`. Falta o "H" — deveria ser `ELLAH<span>OS</span>`. O `AuthLayout` tambem nao e consistente: renderiza `ELLAH<span>OS</span>` mas com o H antes do OS highlighted (linha 11 de layout.tsx), enquanto o onboarding coloca o highlight no "OS". A regra do design system e clara: a cor primaria (rosa) e usada como accent, mas a convencao de qual parte do nome recebe a cor deve ser consistente entre layouts.

---

### 4. Pagina de Convite (`/(auth)/invite/[token]`)

**Nota: 6.0 / 10**

#### O que funciona bem
- Estados bem definidos: loading, erro de convite invalido, aceito com sucesso, e o estado principal.
- Loader2 animado no loading state — correto.
- XCircle para erro e CheckCircle2 para sucesso — semantica correta do design system.
- ROLE_LABELS mapeando os valores do banco para portugues legivel.
- Redirecionamento automatico apos 2s no sucesso — boa UX.
- `returnUrl` preservado no link de login (`/login?returnUrl=/invite/${token}`) — correto.
- Box amber para "precisa estar logado" — usa a cor semantica correta (warning, nao erro).

#### Problemas encontrados

**[CRITICO] Usuario nao logado sem opcao de criar conta**
Quando o usuario nao esta logado, o card mostra apenas "Fazer login primeiro". Mas e muito comum receber um convite por email sem ter conta no ELLAHOS — especialmente freelancers sendo convidados por uma produtora. O fluxo atual exige que o usuario: va para login, perceba que nao tem conta, navegue para signup, crie conta, volte para o link do convite. Isso e friccao extrema. **Recomendacao:** oferecer dois CTAs: "Ja tenho conta — Fazer login" (primary) e "Criar conta gratis" (secondary/outline), ambos preservando o `returnUrl`.

**[ALTO] Link do botao de erro usa classe manual em vez de `<Button>`**
No estado de erro (linha 163), o link "Ir para o login" usa `className="inline-flex h-9 items-center..."` manual em vez de `<Button asChild>`. Inconsistencia com o design system.

**[ALTO] Ausencia de contexto sobre o que e o ELLAHOS para novos usuarios**
Um freelancer que recebe o convite pode nunca ter ouvido falar do ELLAHOS. A pagina do convite mostra nome da empresa convidante e cargo, mas nao explica o que o sistema faz. Adicionar uma linha de contexto: "ELLAHOS e a plataforma de gestao de producao audiovisual da [Empresa]." abaixo do titulo do card.

**[ALTO] Exibicao de "Email convidado" e redundante — o usuario ja sabe seu email**
O card de detalhes do convite exibe `details.email` — o email para o qual o convite foi enviado. Do ponto de vista do usuario que abriu o link do proprio email, ver seu proprio email exibido e redundante. Do ponto de vista de seguranca, pode criar confusao se o link for encaminhado para outra pessoa. O campo de email no card nao agrega valor — o campo "Cargo" e o unico dado realmente relevante.

**[MEDIO] Botao "Aceitar Convite" sem contexto de consequencias**
O usuario logado ve apenas o botao "Aceitar Convite" sem entender o que acontece ao aceitar: ele entra na organizacao, seu perfil fica visivel para outros membros, etc. Um texto de apoio: "Ao aceitar, voce ingresa como [Cargo] na equipe de [Empresa]." abaixo do botao fornece o contexto necessario para uma acao irreversivel.

**[MEDIO] Data de expiracao exibida sem urgencia quando proxima**
`expiresDate` mostra a data de expiracao em formato `dd/mm/aaaa` sem qualquer indicacao de urgencia quando a data esta proxima. Se o convite expira em 2 dias, o usuario deveria ver um aviso em amarelo: "Este convite expira em 2 dias." Calcular `daysUntilExpiry` e exibir badge warning se <= 3 dias.

**[MEDIO] Estado de sucesso nao tem CTA imediato — so texto "Redirecionando..."**
O estado de sucesso (aceite do convite) exibe CheckCircle2 + "Convite aceito!" + "Redirecionando..." sem botao. Se o redirecionamento falhar (problema de rede), o usuario fica preso nesta tela sem forma de prosseguir. Adicionar `<Button asChild><Link href="/">Ir para o dashboard</Link></Button>` como fallback visivel.

**[BAIXO] Nenhum indicador do numero de membros existentes na equipe**
Mostrar "Voce se juntara a uma equipe de X membros" na tela do convite cria senso de pertencimento e reduz ansiedade ("sera que e uma empresa real?"). Dados publicos limitados (count de membros, nao nomes) poderiam ser retornados pelo endpoint de detalhes do convite.

---

## Top 10 Problemas Consolidados

| # | Problema | Tela | Severidade | Correcao Sugerida |
|---|----------|------|------------|-------------------|
| 1 | CTA do header da landing aponta para `/login` em vez de `/signup` | Landing | **CRITICO** | Trocar Link para `/signup`, texto "Comecar gratis"; adicionar link ghost "Entrar" secundario |
| 2 | Campo URL do logo no onboarding e inacessivel para o publico-alvo | Onboarding P1 | **CRITICO** | Remover o campo do onboarding; manter apenas em Configuracoes com upload real |
| 3 | Tela de conclusao do onboarding (P5) sem CTA principal claro dentro do card | Onboarding P5 | **CRITICO** | Adicionar `<Button size="lg" className="w-full">Entrar no ELLAHOS</Button>` dentro do `StepDone` |
| 4 | Pagina de convite nao oferece opcao de criar conta para novos usuarios | Invite | **CRITICO** | Adicionar CTA "Criar conta gratis" paralelo ao "Fazer login" |
| 5 | Inputs do signup usam `<input>` e `<button>` nativos em vez de componentes shadcn/ui | Signup | **ALTO** | Substituir por `<Input>` e `<Button>` do shadcn; adicionar `<Loader2>` no loading state |
| 6 | Stats da landing (especialmente "1 plataforma") prejudicam credibilidade | Landing | **ALTO** | Substituir por metricas reais de uso ou remover a secao; adicionar social proof |
| 7 | Passo 4 (Integracoes) com checkboxes "Ja configurei" cria confusao — usuario nao teve tempo de configurar | Onboarding P4 | **ALTO** | Reformular como tela informativa sem checkboxes; CTA unico "Configurar depois" |
| 8 | Labels do stepper ocultos em mobile (`hidden sm:block`) — usuario perde orientacao | Onboarding | **ALTO** | Exibir label do passo atual em texto abaixo do stepper; ou usar abreviacoes |
| 9 | Logo inconsistente entre layouts: onboarding exibe "ELLAOS" (sem H) | Onboarding Layout | **MEDIO** | Corrigir para `ELLAH<span className="text-primary">OS</span>` consistente com AuthLayout |
| 10 | Footer da landing sem Termos de Uso e Politica de Privacidade | Landing | **MEDIO** | Adicionar links de rodape (Termos, Privacidade, Contato) — necessario para LGPD |

---

## Analise de Consistencia com o Design System

### Conformidades
- Paleta de cores: `text-primary`, `bg-primary/10`, `text-muted-foreground` usados corretamente.
- Icones: 100% Lucide Icons. Nenhum set externo misturado (os SVGs inline do Drive/WhatsApp sao logos de marca, aceitos como excecao).
- Cards shadcn/ui com `border-border/60`, `rounded-lg`, `shadow-sm` — dentro do spec.
- Toasts usando `sonner` — correto.
- Dark mode: uso de `dark:` variants nos cards de integracao do onboarding.
- Focus states: `focus-visible:ring-1 focus-visible:ring-ring` nos inputs — correto.
- Separador `<Separator>` usado no footer da landing — correto.

### Nao-conformidades
- **Inputs nativos no signup** em vez de `<Input>` shadcn (inconsistencia de componente).
- **Botao nativo no signup** em vez de `<Button>` shadcn (inconsistencia de componente).
- **Link estilizado manualmente no invite** (estado de erro) em vez de `<Button asChild>`.
- **Spinner custom** no onboarding (`border-2 border-primary-foreground/30 ... animate-spin`) em vez de `<Loader2 className="animate-spin">` do design system.
- **Texto `text-[10px]`** no label do stepper (linha 192) — o design system nao tem um token de 10px; o menor e `caption` (12px / text-xs). Usar `text-xs` em vez de valor arbitrario.
- **`w-9 h-9`** nos circulos do stepper resulta em 36px — abaixo do minimo de 44px de touch target para mobile. Aumentar para `w-11 h-11` (44px) em mobile.

---

## Analise de Acessibilidade

### Conformidades
- Todos os `<input>` tem `<label>` com `htmlFor` correspondente — correto.
- Botoes de icone tem `aria-label` (ex: "Adicionar convite", "Remover {email}").
- StepperBar tem `aria-label` em cada botao de passo.
- `autoComplete` correto em todos os campos de autenticacao.
- `inputMode="numeric"` no CNPJ e `inputMode="tel"` no telefone — correto para mobile keyboard.

### Falhas de Acessibilidade
- **Circulos do stepper (36px)** estao abaixo do touch target minimo de 44px definido no design system.
- **Botao de remover convite** no passo 3 (`<button onClick={removeInvite}>`) tem apenas 16px de icone visivel. A area clicavel e maior, mas sem `min-w-[44px] min-h-[44px]` garantido.
- **Sem `aria-live` region** para anunciar erros dinamicos de validacao no signup (o `<FieldError>` aparece mas nao e anunciado por leitores de tela automaticamente). Adicionar `role="alert"` ou `aria-live="polite"` no componente `FieldError`.
- **Sem `aria-describedby`** ligando as mensagens de erro aos inputs correspondentes.
- **Gradient e transicoes de cor** na landing nao foram testados para contraste em dark mode — ponto de risco para WCAG AA.

---

## Analise de Responsividade Mobile

| Componente | Mobile (<768px) | Problema |
|-----------|----------------|---------|
| Landing hero | OK — `flex-col` no CTA | - |
| Landing stats | Dividido em 3 colunas com `divide-x` | Em 320px, cada coluna tem ~100px — apertado mas funcional |
| Landing features | 1 coluna — correto | - |
| Auth layout | `max-w-md px-4` — adequado | - |
| Signup form | 1 coluna, funcional | Sem indicador de forca de senha |
| Onboarding stepper | Circulos visiveis, labels ocultos | Perde orientacao no fluxo |
| Onboarding P1 | Grid 2col para cidade/estado | Em 320px fica apertado (mas aceitavel) |
| Onboarding P3 | Row email + select + botao | **Quebra em mobile** — select de 176px nao cabe |
| Onboarding nav | Row com botoes — funcional | Botao "Pular" pode ficar pequeno |
| Invite card | 1 coluna, funcional | Grid 2col dos detalhes ok |

---

## Recomendacoes de Curto Prazo (Quick Wins)

Estas correcoes podem ser feitas rapidamente e tem alto impacto:

1. **Landing header CTA:** `href="/login"` → `href="/signup"`, texto "Comecar gratis". (1 linha)
2. **Logo onboarding layout:** `ELLA<span>OS</span>` → `ELLAH<span>OS</span>`. (1 caracter)
3. **FieldError acessivel:** Adicionar `role="alert"` no componente `FieldError` do signup. (1 prop)
4. **StepDone CTA:** Adicionar Button primario "Entrar no ELLAHOS" dentro do card, acima dos atalhos rapidos. (5-8 linhas)
5. **Invite — opcao de criar conta:** Adicionar `<Button variant="outline" asChild><Link href={`/signup?returnUrl=/invite/${token}`}>Criar conta</Link></Button>` abaixo do link de login. (3-5 linhas)
6. **Remover campo logoUrl do onboarding:** Limpa o Passo 1 e elimina confusao. (remover 10 linhas)
7. **Footer da landing:** Adicionar links de Termos e Privacidade. (5-10 linhas)

---

## Recomendacoes de Medio Prazo

1. **Substituir inputs/button nativos do signup** pelos componentes shadcn/ui (`<Input>`, `<Button>`) para consistencia total com o design system.
2. **Refatorar Passo 4 (Integracoes)** de checkboxes para cards informativos — reformular o conceito do passo.
3. **Adicionar indicador de forca de senha** no signup.
4. **Corrigir touch targets do stepper** para 44px minimo.
5. **Adicionar `aria-describedby`** ligando erros aos inputs no signup.
6. **Adicionar social proof na landing** — mesmo que seja "Usado por produtoras de Sao Paulo" ou nomes ficticios/genericos ate ter clientes reais.
7. **Refatorar stats da landing** com metricas reais ou remover a secao.
8. **Corrigir layout mobile do Passo 3** (empilhar input de email + select/botao em linhas separadas).

---

*Revisao baseada na leitura estatica do codigo fonte. Alguns problemas de contraste e comportamento de animacao requerem validacao em browser renderizado.*
