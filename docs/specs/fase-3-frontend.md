# Spec: Fase 3 - Frontend

**Data:** 2026-02-18
**Status:** Rascunho
**Autor:** Product Manager - ELLAHOS
**Dependencias:** Fase 1 (banco) CONCLUIDA + Fase 2 (API/Edge Functions) CONCLUIDA

---

## 1. Objetivo

Implementar a interface web do ELLAHOS para o modulo Jobs, transformando a API e o banco de dados ja prontos em um produto utilizavel pelas equipes de producao audiovisual.

O frontend deve permitir que qualquer pessoa da produtora (Produtor Executivo, Coordenador, Atendimento, Financeiro, Diretor) gerencie o ciclo completo de um job - desde o briefing ate a entrega - sem depender de planilhas Excel, e-mails ou WhatsApp para trocar informacoes criticas.

### O que ja esta pronto (backend 100%)

- 14 tabelas no banco com RLS, triggers e constraints
- 6 Edge Functions deployed e testadas (10/10 testes OK):
  - jobs - CRUD completo
  - jobs-status - Transicoes de status + aprovacao
  - jobs-team - CRUD equipe com deteccao de conflito de agenda
  - jobs-deliverables - CRUD entregaveis
  - jobs-shooting-dates - CRUD diarias de filmagem
  - jobs-history - Historico (somente leitura, paginado)
- Audit trail automatico em toda operacao de escrita
- Health score calculado automaticamente via trigger do banco

### O que a Fase 3 entrega

1. Projeto Next.js configurado e deployavel
2. Auth flow completo (login, senha, multi-tenant)
3. Layout principal (sidebar + topbar + mobile)
4. Dashboard de Jobs (tabela + kanban)
5. Detalhe do Job (formulario com abas)

---

## 2. Personas

As personas sao as mesmas da spec de Jobs (docs/specs/jobs-master-table.md). Resumo das relevancias para o frontend:

### 2.1 Produtor Executivo (PE)
- Precisa de visao consolidada de TODOS os jobs ativos
- Prioriza: filtros rapidos, metricas financeiras, health score, alertas de risco
- Acessa principalmente via desktop (reunioes, escritorio)

### 2.2 Coordenador de Producao
- Usuario mais frequente do sistema
- Precisa: criar jobs, atualizar status, gerenciar equipe e datas
- Acessa tanto desktop quanto celular (set de filmagem)

### 2.3 Atendimento / Comercial
- Precisa: registrar aprovacoes, adicionar observacoes, ver historico por cliente
- Acessa principalmente via desktop

### 2.4 Financeiro
- Precisa: ver e editar campos financeiros (valor fechado, custo, margem)
- Acessa principalmente via desktop

### 2.5 Diretor / Head de Criacao
- Precisa: ver jobs onde esta alocado, datas de filmagem, briefing completo
- Acessa frequentemente via celular

---

## 3. User Stories

### Epic 1: Setup do Projeto

#### US-F3-001: Inicializacao do projeto Next.js
**Como** desenvolvedor
**Quero** um projeto Next.js 14+ configurado com toda a stack necessaria
**Para** comecar a construir as telas sem configuracoes manuais

**Criterios de aceite:**
- Projeto criado com  usando App Router, TypeScript strict, Tailwind CSS
- shadcn/ui instalado e configurado com o design system ELLAHOS:
  - Cores customizadas (brand, accent rose, accent amber, status) no 
  - CSS variables do design system em  (light + dark mode) conforme  secao 12.2
  - Fonte Inter configurada via 
  - Raio de borda padrao:  (rounded-md)
- Supabase JS client configurado:
  -  e  instalados
  - Client-side client em 
  - Server-side client em 
  - Middleware de sessao em 
- Types TypeScript gerados do banco via  em 
- TanStack Query v5 configurado com  no layout raiz
- React Hook Form + Zod instalados e com 
- Estrutura de pastas conforme  secao 14:
  
- Variaveis de ambiente documentadas em 
- ESLint e Prettier configurados
-  passa sem erros

---

### Epic 2: Auth Flow

#### US-F3-002: Login com email e senha
**Como** usuario da produtora
**Quero** fazer login com meu email e senha
**Para** acessar o ELLAHOS de forma segura

**Criterios de aceite:**
- Pagina  com formulario: Email + Senha + botao Entrar
- Validacao client-side via Zod: email valido, senha minimo 8 caracteres
- Autenticacao via 
- Sucesso: redirecionar para 
- Erro: toast de erro com mensagem clara (nao expor stack trace ou detalhe tecnico)
- Loading state no botao durante requisicao: icone  animado + texto Entrando...
- Campo senha com toggle de visibilidade ( / )
- Link Esqueci minha senha navega para 
- Pressionar Enter no campo senha dispara o submit
- Sessao persistida via cookies gerenciados pelo Supabase SSR
- Design: pagina centralizada com logo ELLAHOS, fundo neutro, sem sidebar

#### US-F3-003: Recuperacao de senha
**Como** usuario da produtora
**Quero** recuperar acesso a minha conta caso esqueca a senha
**Para** nao depender de suporte tecnico

**Criterios de aceite:**
- Pagina : campo email + botao Enviar link de recuperacao
- Chama  com redirect para 
- Exibe mensagem de sucesso independente de o email existir ou nao (sem enumerar usuarios)
- Pagina : campo nova senha + campo confirmacao de senha
- Validacao: senha minimo 8 caracteres, senhas devem coincidir
- Chama  apos validacao
- Sucesso: redirecionar para  com toast Senha alterada com sucesso

#### US-F3-004: Sessao multi-tenant
**Como** usuario autenticado
**Quero** que o sistema saiba automaticamente a qual produtora pertenco
**Para** ver somente os dados da minha produtora

**Criterios de aceite:**
-  extraido do JWT (campo  ou custom claim)
- Middleware Next.js () intercepta todas as rotas :
  - Sem sessao valida: redireciona para  preservando URL de retorno
  - Com sessao valida: deixa passar
-  NUNCA enviado manualmente no payload das requisicoes - Edge Functions o extraem do JWT
- Logout via  no menu do usuario no topbar
- Apos logout: redirecionar para  e limpar cache do React Query

---

### Epic 3: Layout Principal

#### US-F3-005: Sidebar de navegacao (desktop)
**Como** usuario autenticado em desktop
**Quero** uma sidebar de navegacao lateral fixa
**Para** navegar entre as secoes do ELLAHOS rapidamente

**Criterios de aceite:**
- Sidebar fixa na esquerda: expandida w-64 (256px) / colapsada w-16 (64px)
- Animacao de colapso: transition-width duration-200 ease
- Botao toggle (ChevronLeft / ChevronRight) no rodape da sidebar
- Estado de colapso persistido no localStorage
- Logo ELLAHOS no topo (completo expandida, icone apenas colapsada)
- Itens de navegacao (Fase 3 apenas Jobs ativo):
  - Dashboard: icone LayoutDashboard (desabilitado - placeholder)
  - Jobs: icone Clapperboard (ATIVO, link /jobs)
  - Clientes: icone Building2 (desabilitado)
  - Equipe: icone Users (desabilitado)
  - Financeiro: icone DollarSign (desabilitado)
  - Calendario: icone CalendarDays (desabilitado)
  - Configuracoes: icone Settings (desabilitado, rodape)
- Item ativo: barra accent-500 3px na esquerda + bg sidebar-active + texto font-medium
- Item desabilitado: opacity-40, cursor-not-allowed, nao navegavel
- Colapsada: apenas icones visiveis, tooltip com nome ao hover
- Visivel apenas em lg+ (>= 1024px)

#### US-F3-006: Topbar
**Como** usuario autenticado
**Quero** uma barra superior com acoes globais
**Para** buscar conteudo e acessar minha conta rapidamente

**Criterios de aceite:**
- Altura fixa h-14, sticky top-0, border-bottom 1px, bg surface
- Layout: [hamburger mobile] [breadcrumb] [spacer] [busca] [dark mode] [avatar + menu]
- Breadcrumb: pagina atual (ex: Jobs, Jobs > 001_FilmeBBB)
- Busca: input com icone Search; na Fase 3 aplica filtro textual na listagem ao Enter
- Dark mode toggle: Sun (light) / Moon (dark), alterna classe .dark no html, persiste em localStorage
- Menu usuario (dropdown ao clicar no avatar):
  - Nome completo do usuario
  - Email do usuario
  - Separador
  - Configuracoes (desabilitado na Fase 3)
  - Sair (executa logout)
- Avatar: circulo com 2 iniciais do nome em cor deterministica; foto se avatar_url disponivel
- Topbar visivel em todos os breakpoints

#### US-F3-007: Bottom navigation (mobile)
**Como** usuario em dispositivo movel
**Quero** uma barra de navegacao na parte inferior da tela
**Para** acessar as secoes principais com o polegar

**Criterios de aceite:**
- Visivel apenas em < md (abaixo de 768px)
- Altura: h-16 (64px) + padding-bottom: env(safe-area-inset-bottom)
- Background: surface, border-top 1px, fixed bottom-0 z-50
- Maximo 5 itens: Jobs (ativo) + 4 placeholders para fases futuras
- Item ativo: text-accent (rose)
- Touch target por item: minimo 44x44px

---

### Epic 4: Dashboard de Jobs

#### US-F3-008: Listagem de jobs em tabela
**Como** Produtor Executivo
**Quero** ver todos os jobs ativos em uma tabela clara e escaneavel
**Para** ter visao consolidada da operacao

**Criterios de aceite:**
- Rota: /jobs
- Dados via React Query chamando GET /functions/v1/jobs (cache 30s, stale 10s)
- Colunas da tabela (replicando a master atual da Ellah):
  - Checkbox de selecao (largura 40px)
  - # - index_number (largura 60px)
  - Job - job_code em badge mono + title em linha abaixo, link para /jobs/[id] (largura 220px)
  - Cliente (largura 140px)
  - Agencia (largura 120px)
  - Status - badge com dot colorido conforme design system (largura 160px)
  - Tipo - project_type formatado em pt-BR (largura 120px)
  - Entrega - expected_delivery_date em pt-BR; texto vermelho se data ja passou (largura 100px)
  - Valor Fechado - closed_value formatado como R$ BRL (largura 120px)
  - Margem - margin_percentage com cor: verde >=30%, amarelo >=15%, vermelho <15% (largura 90px)
  - Health - barra de progresso horizontal 0-100pts com cor (largura 80px)
  - Acoes - menu 3 pontos: Abrir, Mudar Status, Arquivar (largura 50px)
- Ordenacao por qualquer coluna: clicar no header alterna asc/desc, icone ChevronUp/Down
- Estado de ordenacao na URL: ?sort=expected_delivery_date&order=asc
- Linha inteira clicavel (exceto checkbox e menu acoes) abre /jobs/[id]
- Hover da linha: bg-neutral-50 dark:bg-neutral-850
- Carregando: skeleton de 8 linhas de 52px
- Empty state: icone Clapperboard + Nenhum job encontrado + botao Criar primeiro job
- Scroll horizontal quando conteudo ultrapassa largura da tela

#### US-F3-009: Filtros e busca na listagem
**Como** Coordenador de Producao
**Quero** filtrar e buscar jobs por diferentes criterios
**Para** encontrar rapidamente o que preciso

**Criterios de aceite:**
- Barra de filtros acima da tabela com:
  - Campo de busca textual (titulo, job_code, cliente, agencia)
  - Multi-select Status com chips coloridos (todos os 14 status)
  - Dropdown searchable de Cliente
  - Dropdown de Tipo de Projeto
  - Date range picker para Periodo (expected_delivery_date)
  - Botao Limpar filtros (aparece quando ha filtro ativo)
- Chips de filtros ativos abaixo da barra com X para remover individualmente
- Filtros refletidos na URL como query params: ?status=briefing_recebido&client_id=uuid
- Busca textual com debounce de 400ms
- Contador de resultados: Mostrando 12 de 48 jobs
- Toggle Mostrar arquivados (switch) para incluir is_archived=true na query

#### US-F3-010: Paginacao da listagem
**Como** qualquer usuario
**Quero** navegar entre paginas de resultados
**Para** ver todos os jobs sem sobrecarregar a interface

**Criterios de aceite:**
- Paginacao server-side com parametros page e limit
- Limite padrao: 20 jobs por pagina; seletor: 20, 50, 100
- Componente de paginacao abaixo da tabela: Anterior + paginas numeradas com ellipsis + Proximo
- Texto: Pagina 2 de 12 (234 jobs)
- Pagina atual na URL: ?page=2
- Ao mudar de pagina: scroll suave para o topo da tabela

#### US-F3-011: Vista kanban por status
**Como** Produtor Executivo
**Quero** visualizar jobs em formato kanban agrupado por status
**Para** ter visao visual do fluxo de trabalho

**Criterios de aceite:**
- Toggle no header: icone LayoutList (tabela, default) / KanbanSquare (kanban)
- Preferencia de vista persistida no localStorage
- Vista kanban:
  - 1 coluna por status (14 colunas), container com scroll horizontal
  - Header de coluna: nome do status em pt-BR + badge com contagem
  - Cor do header: cor do status do design system
  - Colunas sem jobs: visiveis com h minima 120px e texto Nenhum job
- Cada card de job:
  - job_code em badge monospaced
  - Titulo (truncado, max 2 linhas)
  - Nome do cliente (text-secondary)
  - Data de entrega (icone Calendar; vermelho se atrasada)
  - Margem % com cor (verde/amarelo/vermelho)
  - Health score como barra horizontal compacta
  - Stack de avatares da equipe (max 3 + +N se mais)
- Cards clicaveis: abre /jobs/[id]
- Mudar status no card: botao ou icone abre dropdown de status sem sair da vista
- Carregando: skeleton de 3-5 cards por coluna

#### US-F3-012: Criar novo job
**Como** Coordenador de Producao
**Quero** criar um novo job rapidamente
**Para** comecar a registrar um projeto novo

**Criterios de aceite:**
- Botao Novo job (primary, icone Plus) no canto superior direito da pagina de listagem
- Abre modal (max-w-lg) com formulario de criacao rapida:
  - Titulo do job (obrigatorio)
  - Cliente (obrigatorio, dropdown searchable + opcao Criar novo cliente inline)
  - Agencia (opcional, dropdown searchable + opcao Criar nova agencia inline)
  - Tipo de Projeto (obrigatorio, select com valores do ENUM em pt-BR)
  - Status inicial (pre-selecionado Briefing Recebido, editavel)
  - Data de entrega estimada (opcional, date picker)
- Validacao Zod client-side com erro inline sob cada campo invalido
- Botao Criar job:
  - Chama POST /functions/v1/jobs com action: create
  - Loading: icone Loader2 + texto Criando...
  - Sucesso: fecha modal + toast Job criado com sucesso + navega para /jobs/[id]
  - Erro: toast de erro, modal permanece aberto para correcao
- Botao Cancelar fecha o modal sem salvar
- Codigo do job (job_code) gerado automaticamente pelo backend

#### US-F3-013: Bulk actions
**Como** Produtor Executivo
**Quero** selecionar multiplos jobs e executar acoes em lote
**Para** agilizar operacoes repetitivas

**Criterios de aceite:**
- Checkbox no header da tabela seleciona/deseleciona todos da pagina atual
- Quando 1+ jobs selecionados: barra de bulk actions no rodape fixo da tela:
  - Texto: N jobs selecionados
  - Acao Arquivar selecionados
  - Acao Mudar status (dropdown com 14 status)
  - Botao X para cancelar selecao
- Dialog de confirmacao antes de executar acoes
- Apos executar: deselecionar todos + refetch da lista + toast com resultado
- Bulk actions disponiveis apenas na vista tabela

---

### Epic 5: Detalhe do Job

#### US-F3-014: Header do job com status e acoes
**Como** qualquer usuario
**Quero** ver as informacoes principais do job no topo da pagina de detalhe
**Para** entender rapidamente o estado do projeto

**Criterios de aceite:**
- Rota: /jobs/[id]
- Dados via React Query chamando GET /functions/v1/jobs com action: get-by-id
- Header sticky (sticky top-14, abaixo do topbar) com:
  - Breadcrumb: Jobs > [job_code] com link para /jobs
  - Codigo do job em badge monospaced
  - Titulo do job (heading-1, editavel inline: clicar transforma em input, blur salva)
  - Badge de status com cor correta do design system
  - Badge de prioridade (alta: vermelho, media: amarelo, baixa: cinza)
  - Health score: numero + barra de progresso compacta com cor
  - Botao Mudar Status (dropdown com 14 status em pt-BR)
  - Menu 3 pontos: Arquivar Job, Exportar PDF (desabilitado Fase 3)
- Progress bar do pipeline logo abaixo do header:
  - Barra horizontal segmentada com status em ordem cronologica linear
  - Status atual: destacado (filled + label visivel)
  - Status anteriores: preenchidos
  - Status futuros: vazios (outline)
  - Cancelado e Pausado nao aparecem no pipeline linear
- Skeleton completo do header durante loading

#### US-F3-015: Aba Geral
**Como** qualquer usuario
**Quero** ver e editar as informacoes basicas do job
**Para** manter dados centralizados e atualizados

**Criterios de aceite:**
- Primeira aba ativa por padrao
- Layout 2 colunas desktop (md+), 1 coluna mobile

  Secao Identificacao:
  - Titulo (obrigatorio, text input)
  - Cliente (obrigatorio, dropdown searchable)
  - Agencia (opcional, dropdown searchable)
  - Marca (texto livre)
  - Email do atendimento (email)
  - Contato principal do cliente (dropdown filtrado pelo cliente selecionado)
  - Contato principal da agencia (dropdown filtrado pela agencia selecionada)

  Secao Classificacao:
  - Tipo de Projeto (select ENUM, obrigatorio)
  - Tipo de Midia (texto livre, ex: 30s, 15s, Social Media)
  - Segmento (select ENUM: Automotivo, Varejo, Fintech, Alimentos, Moda, Tech, Saude, Educacao, Outro)
  - Nivel de Complexidade (select: Baixo, Medio, Alto)
  - Prioridade (select: Alta, Media, Baixa)
  - Notas de Audio (textarea)
  - Tags (input: digitar + Enter adiciona chip removivel com X)

  Secao Datas (todos date picker, formato dd/mm/yyyy, opcional salvo indicado):
  - Briefing recebido
  - Envio do orcamento
  - Prazo de aprovacao do cliente
  - Data de aprovacao
  - PPM - Pre-Producao Meeting
  - Inicio da pos-producao
  - Deadline interno da pos
  - Entrega estimada ao cliente (texto e label em vermelho se data ja passou)
  - Entrega efetiva
  - Data de pagamento

  Secao Briefing e Observacoes:
  - Texto do briefing (textarea expandivel)
  - Observacoes gerais (textarea)
  - Notas internas (textarea, aviso visual: Nao visivel para o cliente)

  Secao Links Google Drive:
  - Pasta raiz no Drive, Carta Orcamento, Cronograma, Roteiro, PPM, Planilha GG_, Pasta de contratos
  - Cada campo: URL input + botao ExternalLink para abrir em nova aba

- Auto-save: debounce 1.5s, chama PATCH /functions/v1/jobs
- Validacao inline ao perder foco (onBlur), nao ao digitar

#### US-F3-016: Aba Equipe
**Como** Produtor Executivo
**Quero** visualizar e gerenciar a equipe alocada ao job
**Para** saber quem e responsavel por cada frente

**Criterios de aceite:**
- Lista de membros (job_team): Avatar + Nome + Funcao pt-BR + Status contratacao badge + Cache R$ + Acoes
- Status de contratacao: Orcado (cinza), Proposta Enviada (amarelo), Confirmado (verde), Cancelado (texto riscado)
- Produtor Responsavel (is_responsible_producer = true) destacado com label ou icone Star
- Botao Adicionar membro (outline, icone Plus):
  - Modal: Pessoa (dropdown searchable de people + opcao Adicionar nova pessoa inline) + Funcao (select team_role) + Cache R$ + Status
  - Chama POST /functions/v1/jobs-team
  - Exibe warnings de conflito de agenda retornados pela API (nao bloqueia, apenas alerta)
- Editar membro: icone Pencil abre modal pre-preenchido, chama PUT /functions/v1/jobs-team
- Remover membro: icone Trash2 + dialog confirmacao + chama DELETE /functions/v1/jobs-team
- Alerta visual quando diretor esta em 2+ jobs simultaneos

  Subsecao Diarias de Filmagem (job_shooting_dates):
  - Lista de datas: Data + Locacao + Notas + icone Acoes
  - Adicionar / editar / remover via jobs-shooting-dates Edge Function
  - Calendario miniatura no topo da subsecao destacando as datas de filmagem registradas

#### US-F3-017: Aba Entregaveis
**Como** Coordenador de Producao
**Quero** gerenciar os entregaveis do job
**Para** garantir que todos os itens sejam entregues no prazo

**Criterios de aceite:**
- Barra de progresso no topo: N de M entregaveis concluidos (status aprovado ou entregue)
- Alerta visual se expected_delivery_date esta em menos de 3 dias e ha entregaveis pendentes
- Lista de entregaveis (job_deliverables) com colunas: Descricao + Formato + Resolucao + Duracao + Versao + Status + Data Entrega + Links + Acoes
- Status com cores: Pendente (cinza), Em Producao (azul), Aguardando Aprovacao (amarelo), Aprovado (verde), Entregue (esmeralda)
- Links: botao ExternalLink para arquivo e botao ExternalLink para review no Frame.io
- Adicionar entregavel: botao + modal com Descricao (obrigatorio), Formato, Resolucao, Duracao em segundos, Link arquivo, Link review
  Chama POST /functions/v1/jobs-deliverables
- Editar: modal pre-preenchido, chama PUT
- Atualizar status: dropdown inline na linha da tabela
- Remover: dialog confirmacao + DELETE
- Ordenacao dos itens por drag-and-drop (atualiza campo display_order via PUT)

#### US-F3-018: Aba Financeiro
**Como** Financeiro
**Quero** ver e editar os dados financeiros do job
**Para** acompanhar margem e rentabilidade em tempo real

**Criterios de aceite:**
- Painel de metricas no topo (cards em linha):
  - Valor Fechado (closed_value, destaque principal)
  - Custo de Producao (production_cost)
  - Imposto (tax_value, calculado: closed_value * tax_percentage / 100)
  - Lucro Bruto (gross_profit, calculado)
  - Margem % (margin_percentage, calculado; verde >=30%, amarelo >=15%, vermelho <15%)
- Formulario editavel:
  - Valor Fechado (numerico, mascara R$ BRL)
  - Percentual de Imposto (numerico %, default 12%)
  - Custo de Producao (numerico R$ BRL)
  - Lucro Liquido / Net Profit (numerico R$ BRL)
  - Condicoes de pagamento (texto livre)
  - Numero do PO - Purchase Order (texto)
  - Data de pagamento (date picker)
- Campos calculados (tax_value, gross_profit, margin_percentage) recalculados em tempo real no cliente conforme usuario edita os valores base, antes de salvar
- Auto-save igual a aba Geral (debounce 1.5s)
- Secao Aprovacao:
  - Tipo: radio Interna (WhatsApp ou telefone) / Externa (portal digital)
  - Data de aprovacao (date picker)
  - Aprovado por (texto livre ou nome do usuario logado)
  - Link do documento de aprovacao interna (URL + botao abrir)
- Nota informativa: Modulo Financeiro completo com lancamento de despesas, NFs e fluxo de caixa estara disponivel em fase futura

#### US-F3-019: Auto-save e estado de sincronizacao
**Como** qualquer usuario
**Quero** que minhas edicoes sejam salvas automaticamente
**Para** nao perder trabalho por esquecer de clicar em Salvar

**Criterios de aceite:**
- Trigger: 1.5 segundos apos ultima alteracao detectada pelo React Hook Form (watch)
- Indicador de estado no header do detalhe (canto direito):
  - Sem alteracao pendente: sem indicador
  - Alteracao detectada (aguardando debounce): ponto laranja + texto Nao salvo
  - Salvando: icone Loader2 spin pequeno + texto Salvando...
  - Salvo: icone Check verde + texto Salvo, desaparece apos 3 segundos
  - Erro: icone X vermelho + texto Erro ao salvar + link Tentar novamente
- Rascunho em sessionStorage: se save falhar por erro de rede, dados ficam em sessionStorage com timestamp; ao reabrir a pagina, aviso Voce tem alteracoes nao salvas de [timestamp] com opcoes Restaurar ou Descartar
- Titulo do job: editavel inline; clicar transforma em input focus, Enter ou blur salva imediatamente sem debounce via PATCH
- Nenhum botao Salvar explicito nas abas (exceto em modais como adicionar membro ou entregavel)

#### US-F3-020: Aba Arquivos
**Como** Coordenador de Producao
**Quero** gerenciar os arquivos anexados ao job
**Para** centralizar toda a documentacao do projeto

**Criterios de aceite:**
- Atalhos de links do Drive no topo da aba (mesmos URLs da aba Geral como botoes rapidos com icones)
- Lista de arquivos agrupados por categoria (job_files):
  - Categorias: Briefing, Contrato, Referencias, Aprovacoes, Entregaveis, Outro
  - Cada arquivo: icone por tipo (PDF, DOC, XLS, IMG, VIDEO, LINK) + Nome + Tamanho + Enviado por + Data + Acoes (Baixar, Abrir, Remover)
- Upload de arquivos:
  - Area dropzone com borda dashed e texto Arraste arquivos aqui ou clique para selecionar
  - Tipos aceitos: PDF, DOCX, XLSX, JPG, PNG, MP4
  - Limite: 50MB por arquivo
  - Barra de progresso durante upload
  - Upload via Supabase Storage (bucket jobs-files)
  - Modal para selecionar categoria apos escolher o arquivo
- Adicionar link externo: modal com Nome + URL + Categoria (para Drive, Dropbox, Vimeo, Frame.io)
- Remover: dialog confirmacao + soft delete (deleted_at)

#### US-F3-021: Aba Historico
**Como** qualquer usuario
**Quero** ver o historico completo de alteracoes do job
**Para** entender o que mudou, quando e por quem

**Criterios de aceite:**
- Dados via GET /functions/v1/jobs-history?job_id=[id], paginado
- Timeline vertical com icone de evento + avatar do autor + descricao + timestamp relativo
- Timestamp completo ao hover (tooltip)
- Exemplos de descricao:
  - Joao Silva alterou o status de Briefing Recebido para Pre-Producao em Andamento
  - Maria atualizou o Valor Fechado para R$ 45.000,00
  - Carlos adicionou um membro: Ana Lima como Diretora de Fotografia
- Icones por tipo de evento:
  - status_change: ArrowRight com cor do novo status
  - field_update: Pencil
  - team_change: Users
  - deliverable_change: Package
  - comment: MessageSquare
  - file_upload: Paperclip
  - created: Plus
  - archived e restored: Archive e ArchiveRestore
- Filtro por tipo de evento (chips clicaveis acima da timeline)
- Ordenacao cronologica reversa (mais recente primeiro)
- Historico imutavel: sem acoes de edicao ou delecao
- Campo de comentario livre no topo: textarea + botao Adicionar comentario, cria evento do tipo comment via POST /functions/v1/jobs-history
- Paginacao via botao Carregar mais ao final da lista

#### US-F3-022: Mudar status do job
**Como** Coordenador de Producao
**Quero** atualizar o status do job
**Para** manter o lifecycle visivel para toda a equipe

**Criterios de aceite:**
- Acessivel pelo botao Mudar Status no header do detalhe
- Dropdown com os 14 status em pt-BR, cada um com badge colorido e dot
- Status atual indicado com checkmark
- Ao selecionar novo status:
  - Se Cancelado: dialog obrigatorio pedindo motivo de cancelamento (cancellation_reason, texto livre, obrigatorio)
  - Se selecao_diretor (Aprovado - Selecao de Diretor): aviso soft se closed_value ou approval_date nao preenchidos (avisa mas nao bloqueia)
  - Chama POST /functions/v1/jobs-status com action: update-status e new_status
  - Otimistic update: badge de status no header muda imediatamente
  - Rollback do otimistic update se API retornar erro
- Toast de sucesso ou erro
- Historico do job atualizado automaticamente pelo backend

---

### Epic 6: Qualidade e Experiencia

#### US-F3-023: Responsividade mobile e tablet
**Como** Coordenador de Producao no set de filmagem
**Quero** usar o ELLAHOS no meu celular
**Para** atualizar status e checar informacoes sem computador

**Criterios de aceite:**
- Mobile (< 768px):
  - Sidebar substituida por bottom navigation (US-F3-007)
  - Tabela de jobs substituida por lista de cards empilhados com: job_code, titulo, cliente, status badge, data de entrega, margem
  - Formulario do detalhe: 1 coluna, tabs com scroll horizontal
  - Modais viram sheets (slide from bottom, full-screen)
  - Touch targets: minimo 44x44px em todo elemento interativo
- Tablet (768-1023px):
  - Sidebar como drawer overlay ativado pelo hamburger no topbar
  - Tabela com scroll horizontal
  - Formularios em 1-2 colunas

#### US-F3-024: Dark mode
**Como** usuario
**Quero** usar o ELLAHOS em modo escuro
**Para** reduzir fadiga visual

**Criterios de aceite:**
- Toggle no topbar: icone Sun (light) / Moon (dark)
- Preferencia persistida no localStorage
- Default: seguir prefers-color-scheme do sistema operacional
- Todos os componentes implementados suportam dark mode via classes dark: do Tailwind e CSS variables do design system
- Sem FOUC: configuracao de tema aplicada antes do primeiro render (next-themes ou script no head)

#### US-F3-025: Estados de loading e erro
**Como** qualquer usuario
**Quero** ver feedbacks claros quando o sistema esta carregando ou apresenta erro
**Para** entender o que esta acontecendo e o que fazer

**Criterios de aceite:**
- Loading states:
  - Lista de jobs: skeleton de 8 linhas de 52px (nao spinner generico)
  - Detalhe do job: skeleton do header + skeleton da aba ativa
  - Dentro de cada aba: skeleton especifico (linhas para aba Geral, cards para Financeiro, linhas de lista para Equipe)
  - Skeleton exibido apenas se loading > 200ms (evitar flash)
- Error states:
  - Erro de rede ou API: card de erro com mensagem amigavel + botao Tentar novamente (refetch)
  - Job nao encontrado (404): pagina com mensagem Job nao encontrado + link Voltar para a listagem
  - Sem permissao (403): mensagem Voce nao tem permissao para acessar este job
- Empty states por contexto:
  - Listagem sem jobs: icone Clapperboard (48px) + Nenhum job encontrado + botao Criar primeiro job
  - Aba Equipe sem membros: icone Users + Nenhum membro alocado + botao Adicionar membro
  - Aba Entregaveis sem itens: icone Package + Sem entregaveis cadastrados + botao Adicionar entregavel
  - Aba Historico vazio: icone Clock + Nenhum evento registrado ainda
- Toasts (shadcn Sonner):
  - Sucesso: borda verde, 4 segundos
  - Erro: borda vermelha, 8 segundos
  - Warning: borda amarela, 6 segundos

---

## 4. Criterios de Aceite Nao-Funcionais

### Performance
- Listagem de jobs renderizada em menos de 1 segundo com cache do React Query ativo
- Detalhe do job com dados da aba ativa renderizados em menos de 800ms
- Auto-save nao bloqueia interacao do usuario (requisicao em background)
- next build sem erros ou warnings criticos
- Core Web Vitals alvo: LCP < 2.5s, CLS < 0.1

### Acessibilidade
- Minimo WCAG 2.1 nivel AA
- Navegacao completa via teclado: Tab, Enter, Escape, setas em dropdowns e selects
- Focus visible em todos elementos interativos (focus-visible:ring-2 ring-accent/50)
- Aria labels em todos botoes que contem apenas icones
- label associado a cada input via htmlFor e id
- Mudancas dinamicas anunciadas via aria-live (ex: Job salvo com sucesso)

### Seguranca
- Nenhum dado sensivel em localStorage (tokens gerenciados pelo Supabase client via cookies)
- tenant_id extraido do JWT nas Edge Functions, nunca enviado no payload pelo frontend
- Todas as rotas do dashboard protegidas pelo middleware de sessao
- Inputs nao usam dangerouslySetInnerHTML

---

## 5. Fora de Escopo (Fase 3)

Os itens abaixo sao reconhecidos como necessarios mas postergados para fases futuras:

1. Integracao Google Drive - criacao automatica de estrutura de pastas (Fase 6)
2. Integracao n8n - webhooks e automacoes (Fase 6)
3. Notificacoes WhatsApp via Evolution API (Fase 6)
4. Portal do Cliente - aprovacao digital externa (Fase futura)
5. Modulo Financeiro completo - lancamento de despesas, NF, fluxo de caixa (Fase futura)
6. Modulo Contratos - geracao via template, DocuSeal (Fase futura)
7. Modulo Equipe - CRUD completo de pessoas e freelancers (Fase futura)
8. Modulo Clientes e Agencias - telas dedicadas de CRUD (Fase futura)
9. Calendario de producao - vista calendario com todos os jobs (Fase futura)
10. Dashboard com metricas - graficos, heatmap de alocacao (Fase futura)
11. Exportacao Excel e PDF da lista de jobs (Fase futura)
12. Hierarquia de jobs - sub-jobs e jobs pai (Fase futura)
13. Criacao de job via WhatsApp (Fase 6)
14. Busca full-text global com command palette (Fase futura)
15. Drag-and-drop no kanban para mover jobs entre colunas (avaliado como podendo ser cortado do MVP)
16. Notificacoes in-app - sistema de notificacoes web (Fase futura)
17. Versionamento de orcamentos (Fase futura, modulo Financeiro)
18. Tela de registro de tenant - onboarding de novos clientes do SaaS (Fase futura)

---

## 6. Dependencias

### Backend (100% pronto, nao ha bloqueadores tecnicos)
- Supabase project etvapcxesaxhsvzgaane operacional em sa-east-1
- 6 Edge Functions deployed (jobs, jobs-status, jobs-team, jobs-deliverables, jobs-shooting-dates, jobs-history)
- RLS configurado com tenant_id extraido do JWT
- Auth configurado: email/password, JWT ES256, verify_jwt desabilitado nas Edge Functions

### Design
- Design system completo em docs/design/design-system.md (tokens de cor, tipografia, espacamento, componentes, UX patterns)

### Infraestrutura (a configurar antes do deploy)
- Plataforma de deploy (Vercel recomendado)
- Dominio e SSL
- Variaveis de ambiente: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
- Redirect URLs configuradas no Supabase Auth Dashboard para o dominio de producao

### Dependencias internas (sequencia obrigatoria)
- US-F3-001 (setup) bloqueia todas as outras user stories
- US-F3-002 a F3-004 (auth) devem estar prontas antes de qualquer tela autenticada
- US-F3-005 a F3-007 (layout) devem estar prontos antes das telas de conteudo
- US-F3-008 (listagem) antes de US-F3-009, F3-010, F3-011, F3-012, F3-013
- US-F3-014 (header do detalhe) antes de US-F3-015 a F3-022

---

## 7. Priorizacao (MoSCoW)

### Must Have (MVP obrigatorio - sem estes o produto nao e utilizavel)
- US-F3-001: Setup do projeto
- US-F3-002: Login com email e senha
- US-F3-004: Sessao multi-tenant e middleware
- US-F3-005 a F3-007: Layout completo (sidebar, topbar, bottom nav)
- US-F3-008: Listagem de jobs em tabela
- US-F3-009: Filtros e busca
- US-F3-010: Paginacao
- US-F3-012: Criar novo job (modal)
- US-F3-014: Header do detalhe com status e acoes
- US-F3-015: Aba Geral do detalhe
- US-F3-019: Auto-save e estado de sincronizacao
- US-F3-022: Mudar status do job
- US-F3-023: Responsividade mobile e tablet
- US-F3-024: Dark mode
- US-F3-025: Loading e error states

### Should Have (importante, mas nao bloqueia o MVP)
- US-F3-011: Vista kanban (sem drag-and-drop)
- US-F3-016: Aba Equipe
- US-F3-017: Aba Entregaveis
- US-F3-018: Aba Financeiro
- US-F3-021: Aba Historico
- US-F3-003: Recuperacao de senha

### Could Have (desejavel se houver tempo na Fase 3)
- US-F3-013: Bulk actions
- US-F3-020: Aba Arquivos (upload via Supabase Storage)
- Drag-and-drop no kanban

### Won't Have na Fase 3
- Tudo listado na secao 5 (Fora de Escopo)

---

## 8. Perguntas Abertas

#### PO-001: Criacao de usuarios (BLOQUEANTE para uso em producao)
Pergunta: Como serao criados os usuarios no sistema? A Fase 3 precisa de uma tela de registro, ou os usuarios serao criados manualmente via Supabase Dashboard?
Impacto: Sem tela de registro, onboarding de novos usuarios depende de acesso tecnico ao Supabase Dashboard.
Recomendacao PM: Criar usuarios manualmente no Supabase Dashboard durante a Fase 3. Implementar tela de registro e invite flow em fase posterior.

#### PO-002: Populacao inicial de clientes e agencias (BLOQUEANTE para criacao de jobs)
Pergunta: O dropdown de Cliente na criacao do job precisa de registros pre-existentes na tabela clients. Como esse cadastro sera feito inicialmente?
Opcoes:
  (a) CRUD minimo de clientes e agencias incluso na Fase 3
  (b) Populacao manual via Supabase Dashboard ou script de seed
  (c) Adicionar opcao Criar novo cliente inline no dropdown (modal dentro do modal de criacao de job)
Recomendacao PM: Opcao (c) para MVP - criacao inline no dropdown sem sair do fluxo. Tela dedicada de clientes em fase posterior.

#### PO-003: Drag-and-drop no kanban
Pergunta: O drag-and-drop para mover jobs entre colunas do kanban e prioridade para o MVP da Fase 3?
Contexto: Requer biblioteca adicional (dnd-kit ou similar) e logica de otimistic update com rollback. Estimativa adicional: 3 a 5 dias.
Recomendacao PM: Cortar do MVP. Substituir por botao Mudar Status no card do kanban como alternativa funcional.

#### PO-004: Cadastro de pessoas para aba Equipe
Pergunta: A aba Equipe precisa de pessoas pre-cadastradas na tabela people. Como e onde esse cadastro sera feito?
Recomendacao PM: Incluir modal Adicionar nova pessoa dentro do proprio modal de adicionar membro, sem exigir tela separada no MVP.

#### PO-005: Dominio e deploy (BLOQUEANTE para testes em mobile e email de recuperacao)
Pergunta: Qual sera o dominio de producao? O deploy na Vercel sera configurado no inicio ou no final da Fase 3?
Impacto: Afeta configuracao de redirect URLs no Supabase Auth e envio de emails de recuperacao de senha.
Recomendacao PM: Configurar deploy na Vercel desde o primeiro dia da Fase 3, mesmo que com dados de teste. Facilita testes em dispositivos moveis e valida o fluxo de auth completo.

#### PO-006: Dados de seed para testes
Pergunta: Ha necessidade de um script de seed com dados de exemplo para facilitar os testes do frontend?
Recomendacao PM: Sim. Criar script Python que popula: 10 a 20 jobs em varios status, 3 a 5 clientes, 2 a 3 agencias, 5 a 10 pessoas. Reduz tempo de setup para cada desenvolvedor ou testador que entra no projeto.

---

## 9. Arquitetura Frontend (Resumo Tecnico)

### Estrutura de Rotas (App Router)



### Chamadas de API (Edge Functions via Supabase client)

O Supabase client injeta o Bearer token automaticamente em todas as chamadas:



### Gerenciamento de Estado

- Server state (dados da API): TanStack Query v5 com queryKeys hierarquicos
- Form state: React Hook Form + Zod resolver
- UI state local: useState / useReducer (sidebar, modais, tabs ativas)
- Preferencias de usuario: localStorage (dark mode, vista kanban/tabela, sidebar colapsada)
- Rascunhos de form: sessionStorage (fallback quando auto-save falha por erro de rede)

### Principais Pacotes NPM



### Componentes shadcn/ui a instalar



### Convencao de Nomes

Conforme docs/design/design-system.md secao 14:
- Componentes: PascalCase (JobCard.tsx, StatusBadge.tsx)
- Hooks: camelCase (useJobs.ts, useJobDetail.ts)
- Utils: camelCase (formatCurrency.ts, formatDate.ts)
- Types: PascalCase (Job, JobTeamMember, JobDeliverable)
- Constantes: UPPER_SNAKE_CASE (JOB_STATUS_LABELS, TEAM_ROLE_LABELS)

---

## Changelog

| Data       | Versao | Descricao                         |
|------------|--------|-----------------------------------|
| 2026-02-18 | 1.0    | Spec inicial da Fase 3 - Frontend |
