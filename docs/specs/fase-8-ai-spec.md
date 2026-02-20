# Fase 8: Inteligencia Artificial -- Spec Completa

**Data:** 20/02/2026
**Status:** RASCUNHO -- aguardando validacao
**Autor:** Product Manager -- ELLAHOS
**Fase anterior:** Fase 7 (Dashboard + Relatorios + Portal do Cliente) -- CONCLUIDA E AUDITADA

---

## 1. Resumo Executivo

A Fase 8 introduz inteligencia artificial como camada transversal do ELLAHOS. Enquanto as Fases 1 a 7 construiram a fundacao operacional (schema, CRUD, financeiro, equipe, aprovacoes, dashboard, portal), a Fase 8 usa os dados acumulados nessa fundacao para gerar valor proativo: estimativas mais rapidas, assistencia contextual, analise automatizada de material filmado e matching inteligente de freelancers.

### Problemas que resolve

**Problema 1 -- Orcamento levado por intuicao:** Elaborar um orcamento hoje exige que o PE ou Coordenador consulte historico mental de jobs anteriores, planilhas GG_ antigas e experiencia acumulada. Nao ha base de dados estruturada sendo aproveitada para estimar valores. Jobs similares do mesmo segmento, tipo e complexidade sao ignorados na hora de precificar.

**Problema 2 -- Status espalhado em multiplas telas:** Para responder qual o risco do job X, o PE precisa navegar por jobs, financeiro, equipe e aprovacoes. Nao ha um unico ponto de acesso conversacional que consolide essa informacao com linguagem natural.

**Problema 3 -- Analise de dailies manual e demorada:** Ao receber material bruto de filmagem, a equipe de producao precisa assistir tudo e construir manualmente o checklist de qualidade tecnica e criativa. Esse processo toma horas e e propenso a erros de omissao.

**Problema 4 -- Matching de freelancer por memoria:** Quando um job precisa de um colorista ou motion designer, o PE percorre o cadastro de pessoas manualmente, lembra de quem trabalhou bem antes, tenta contato e descobre que a pessoa esta indisponivel. Nao ha scoring automatico de adequacao ao job.

### Entregaveis da Fase 8

| Feature | Prioridade | Valor entregue |
|---------|-----------|----------------|
| F8.1 -- Estimativa de Orcamento AI | P0 | Reduzir de horas para minutos o tempo de elaboracao de orcamento inicial |
| F8.2 -- Copilot de Producao | P0 | Responder perguntas sobre o status da operacao em linguagem natural |
| F8.3 -- Analise de Dailies | P1 | Gerar checklist automatico de qualidade de material filmado |
| F8.4 -- Matching de Freelancer | P1 | Sugerir os melhores freelancers para cada role do job |

### Principios de design para IA no ELLAHOS

1. **IA como assistente, nao tomador de decisao:** toda saida da IA e sugestao. O usuario sempre tem a palavra final.
2. **Explicabilidade:** cada sugestao deve mostrar o raciocinio (por que esse valor? quais jobs similares foram usados?).
3. **Fallback gracioso:** se dados insuficientes ou Claude API indisponivel, o sistema degrada sem erro critico.
4. **Multi-tenant por padrao:** a IA usa APENAS dados do tenant ativo. Nunca vaza dados entre produtoras.
5. **Custo controlado:** usar Claude Haiku para respostas rapidas e curtas; Sonnet apenas para analise complexa.
6. **Transparencia de limite:** se o historico do tenant for insuficiente (menos de 5 jobs finalizados), o sistema informa claramente e oferece valores de referencia como fallback.

---

## 2. Contexto e Estado Atual

### O que ja existe (base para Fase 8)

**Banco de dados (30 tabelas):**
- jobs (~77 colunas): project_type, client_segment, complexity_level, closed_value, production_cost, margin_percentage, health_score, status, briefing_text, expected_delivery_date
- job_team: role, rate, hiring_status -- equipe historica por job
- job_budgets: itens de orcamento por categoria com amounts
- financial_records: receitas e despesas reais vinculadas ao job
- people: cadastro completo de equipe interna e freelancers
- allocations: periodos formais de alocacao com start/end dates
- job_history: audit trail completo de todas as mudancas
- approval_requests: aprovacoes de conteudo com status e historico
- job_deliverables: entregaveis com status por job

**Edge Functions (16 ativas):** CRUD completo de todos os dominios

**Stack de IA disponivel:**
- Claude API (Anthropic) -- Haiku (rapido, barato) e Sonnet (analise complexa)
- PostgreSQL com dados estruturados de historico
- n8n como orquestrador de workflows (ia.ellahfilmes.com)

### O que a Fase 8 cria

| Item | Descricao |
|------|-----------|
| 4 Edge Functions novas | ai-budget-estimate, ai-copilot, ai-dailies-analysis, ai-freelancer-match |
| 2 tabelas novas | ai_interactions, ai_freelancer_scores |
| 4 componentes novos principais | BudgetEstimatePanel, CopilotChat, DailiesAnalysisPanel, FreelancerMatchPanel |
| Integracoes com UI existente | Botao IA no form de criacao de job, aba Copilot no job detail, aba IA em People detail |
| 32 tabelas total | 30 existentes + 2 novas |

---

## 3. Personas

**CEO/Socio:** Quer estimativas de orcamento mais precisas para tomar decisoes comerciais. Usa o Copilot para entender saude geral sem abrir multiplas telas.

**Produtor Executivo (PE):** Usa Estimativa de Orcamento ao receber briefing de novo job. Usa Copilot para responder rapido ao cliente sobre status. Usa Matching de Freelancer para encontrar o melhor perfil para o job.

**Coordenador de Producao:** Usa Analise de Dailies para gerar checklist sem ver todo o material. Usa Copilot para saber quais tarefas estao pendentes no job.

**Atendimento:** Usa Copilot para responder perguntas do cliente sobre status sem precisar checar com producao. Usa Estimativa de Orcamento para pre-qualificar briefings.

**Financeiro:** Confia mais nas estimativas de orcamento com base historica. Usa relatorios de acuracia das estimativas (real vs estimado).

---

## 4. Prioridades

| Feature | Prioridade | Justificativa |
|---------|-----------|---------------|
| F8.1 Estimativa de Orcamento AI | P0 | Impacto imediato na fase comercial. Alto volume de uso (todo novo job). Dados ja existem no banco. |
| F8.2 Copilot de Producao | P0 | Reduz gargalo de informacao dispersa. Uso diario por multiplos perfis. Diferencial competitivo claro. |
| F8.3 Analise de Dailies | P1 | Alto valor, mas depende de descricao manual de material. Adocao mais lenta. |
| F8.4 Matching de Freelancer | P1 | Valor alto para PEs, mas requer massa critica de historico de alocacoes para ser preciso. |

---
## 5. User Stories

### 5.1 F8.1 -- Estimativa de Orcamento AI (US-801 a US-808)

**US-801 -- Solicitar estimativa de orcamento a partir de briefing**
Como PE, quero inserir informacoes basicas de um novo briefing e receber uma estimativa de orcamento sugerida pela IA, para ter um ponto de partida rapido antes de elaborar o orcamento detalhado.

Criterios de aceite:
- CA-801.1: Botao Estimar com IA disponivel na tela de criacao de job e na aba Financeiro do job detail
- CA-801.2: Formulario aceita: project_type, client_segment, complexity_level, duracao estimada (segundos), numero de diarias, formato de entrega
- CA-801.3: Todos os campos sao opcionais -- a IA trabalha com o que for fornecido
- CA-801.4: Sistema busca jobs finalizados do tenant com project_type e client_segment similares (ultimos 24 meses)
- CA-801.5: A IA retorna: valor estimado (range min-max), margem esperada, confianca (alta/media/baixa), lista de jobs similares usados como referencia
- CA-801.6: Resposta exibe breakdown por categoria: producao, equipe, pos-producao, outros
- CA-801.7: Botao Aplicar ao job preenche closed_value com o valor medio do range estimado
- CA-801.8: Estimativa nao e salva automaticamente; usuario deve confirmar aplicacao

---

**US-802 -- Ver jobs similares usados como referencia**
Como PE, quero ver quais jobs anteriores a IA usou para gerar a estimativa, para validar se a comparacao faz sentido.

Criterios de aceite:
- CA-802.1: Secao Baseado em exibe lista dos jobs similares com: codigo (JOB_ABA), titulo, project_type, complexity_level, ano de finalizacao
- CA-802.2: Nao exibe valores financeiros de outros jobs (privacy por design)
- CA-802.3: Cada job listado tem link para abrir o job detail
- CA-802.4: Se nenhum job similar encontrado, exibe aviso claro e usa medias de referencia como fallback
- CA-802.5: Confianca explicada: Alta (5+ jobs similares), Media (2-4 jobs), Baixa (0-1 job ou dados incompletos)

---

**US-803 -- Historico de estimativas do job**
Como PE, quero ver o historico de estimativas geradas para um job, para comparar evolucao e acuracia.

Criterios de aceite:
- CA-803.1: Secao Estimativas IA no job detail exibe historico de todas as estimativas geradas para aquele job
- CA-803.2: Cada entrada mostra: data/hora, parametros usados, range estimado, quem solicitou, se foi aplicada ao job
- CA-803.3: Apos job finalizado, exibe comparativo: estimativa vs valor real (closed_value e production_cost reais)
- CA-803.4: Historico armazenado na tabela ai_interactions

---
**US-804 -- Calibragem automatica com novos jobs finalizados**
Como sistema, quero que as estimativas melhorem conforme mais jobs sao finalizados no tenant, para aumentar acuracia ao longo do tempo.

Criterios de aceite:
- CA-804.1: Query de referencia usa apenas jobs com status finalizado e com closed_value e production_cost preenchidos
- CA-804.2: Jobs finalizados nos ultimos 24 meses tem peso maior (logica na query SQL, sem retreinamento de modelo)
- CA-804.3: Tenant com menos de 3 jobs finalizados recebe aviso de dados insuficientes e estimativa marcada como referencia de mercado
- CA-804.4: Nenhum dado e enviado para treinamento na Anthropic (privacidade garantida)

---

**US-805 -- Estimativa por template de projeto recorrente**
Como PE, quero criar templates de briefing para tipos de projeto que fazemos frequentemente, para acelerar ainda mais a estimativa.

Criterios de aceite:
- CA-805.1: Pagina /settings/ai-templates (admin) permite criar e editar templates com campos pre-preenchidos
- CA-805.2: Template inclui: nome, project_type, complexity_level, client_segment sugerido, descricao padrao
- CA-805.3: Ao selecionar template no formulario de estimativa, campos sao pre-preenchidos automaticamente
- CA-805.4: Templates sao por tenant (multi-tenant, nao compartilhados entre produtoras)

---
**US-806 -- Estimativa via WhatsApp**
Como PE usando celular, quero solicitar estimativa de orcamento enviando mensagem por WhatsApp, para nao precisar abrir o sistema.

Criterios de aceite:
- CA-806.1: Bot no numero da produtora (Evolution API) aceita comando: estimar: [descricao do briefing]
- CA-806.2: n8n processa a mensagem, chama Edge Function ai-budget-estimate e retorna resposta formatada
- CA-806.3: Resposta inclui: range de valor, nivel de confianca, e link para ver detalhes no ELLAHOS
- CA-806.4: Funcionalidade desabilitada por padrao; admin ativa em Configuracoes > Integracoes > WhatsApp
- CA-806.5: Somente usuarios do tenant autenticados via WhatsApp vinculado ao perfil podem usar

---

**US-807 -- Relatorio de acuracia das estimativas**
Como CEO, quero ver o quao precisas sao as estimativas da IA ao longo do tempo, para ter confianca no uso da ferramenta.

Criterios de aceite:
- CA-807.1: Secao na pagina /reports (tab IA) exibe: total de estimativas geradas, percentual aplicadas a jobs, desvio medio entre estimativa e valor real
- CA-807.2: Grafico de dispersao: eixo X = valor estimado, eixo Y = valor real (pontos = jobs finalizados)
- CA-807.3: Tabela com os 10 jobs com maior desvio (estimativa vs real) para calibragem manual
- CA-807.4: Filtro por periodo e por project_type
- CA-807.5: Visivel apenas para roles admin e ceo

---

**US-808 -- Estimativa com itens de budget detalhados**
Como Coordenador de Producao, quero que a estimativa da IA sugira lista de itens de orcamento por categoria, para comecar o preenchimento detalhado mais rapido.

Criterios de aceite:
- CA-808.1: Botao Gerar itens de budget disponivel apos estimativa gerada
- CA-808.2: IA gera lista de itens agrupados por categoria (Equipe, Equipamentos, Locacao, Pos-producao) com valores sugeridos
- CA-808.3: Lista e editavel antes de salvar; usuario pode remover, adicionar e ajustar valores
- CA-808.4: Ao confirmar, itens sao criados na tabela budget_items vinculados ao job
- CA-808.5: Somatorio dos itens nao excede o valor maximo do range estimado (exibe aviso se exceder)

---

### 5.2 F8.2 -- Copilot de Producao (US-811 a US-819)

**US-811 -- Interface de chat do Copilot**
Como PE, quero uma interface de chat dentro do sistema onde posso fazer perguntas sobre jobs em linguagem natural, para obter respostas contextuais sem navegar por multiplas telas.

Criterios de aceite:
- CA-811.1: Icone flutuante de chat visivel em todas as paginas do dashboard (canto inferior direito)
- CA-811.2: Ao clicar, abre painel lateral (drawer) de 400px de largura sem fechar a pagina atual
- CA-811.3: Campo de texto com envio por Enter; Shift+Enter para nova linha
- CA-811.4: Historico da conversa persistido na sessao do navegador (sessionStorage, nao banco)
- CA-811.5: Botao para limpar conversa; botao para fechar drawer
- CA-811.6: Indicador de carregamento enquanto aguarda resposta da API
- CA-811.7: Respostas formatadas em markdown (negrito, listas, links clicaveis)

---

**US-812 -- Perguntas sobre status de jobs**
Como PE, quero perguntar ao Copilot sobre o status atual de jobs especificos, para obter resposta consolidada rapidamente.

Criterios de aceite:
- CA-812.1: Perguntas aceitas (exemplos): Qual o status do job 042?, Quais jobs estao atrasados?, Me mostra os jobs em pos-producao
- CA-812.2: Copilot consulta dados reais do banco via function calling (tool_use Claude API) e responde com informacoes atualizadas
- CA-812.3: Resposta inclui: status atual, health_score, proxima data importante, PE responsavel
- CA-812.4: Links clicaveis para o job detail dentro da resposta (ex: /jobs/[id])
- CA-812.5: Dados consultados sempre sao do tenant do usuario logado (sem vazamento multi-tenant)
- CA-812.6: Pergunta sobre job sem acesso retorna mensagem de permissao negada

---
**US-813 -- Alertas proativos e riscos**
Como PE, quero perguntar ao Copilot sobre riscos na operacao atual, para agir preventivamente.

Criterios de aceite:
- CA-813.1: Pergunta Quais jobs estao em risco? retorna lista ordenada por severidade (critico primeiro)
- CA-813.2: Criterios de risco analisados: health_score abaixo de 50, margin_percentage abaixo de 15%, expected_delivery_date nos proximos 7 dias, aprovacoes pendentes ha mais de 5 dias, equipe sem Diretor ou PE definido
- CA-813.3: Copilot explica POR QUE cada job esta em risco (ex: Job 038 tem margem de 11% e entrega em 3 dias)
- CA-813.4: Sugere acao concreta para cada risco (ex: Recomendo revisar os custos de producao ou renegociar o prazo)
- CA-813.5: Resposta diferencia risco critico de atencao com indicadores textuais claros

---

**US-814 -- Sugestao de proximos passos**
Como Coordenador de Producao, quero perguntar ao Copilot o que precisa ser feito em um job especifico, para nao perder nenhuma etapa critica.

Criterios de aceite:
- CA-814.1: Pergunta O que falta fazer no job 055? retorna lista de pendencias especificas daquele job
- CA-814.2: Copilot analisa: status atual, entregaveis pendentes, aprovacoes em aberto, health_score e pontos faltantes, datas proximas
- CA-814.3: Proximos passos ordenados por urgencia (baseado em datas e status do lifecycle)
- CA-814.4: Cada passo tem acao sugerida e responsavel (baseado em job_team)
- CA-814.5: Se job nao tem PE ou Diretor definido, isso aparece como primeiro passo critico

---

**US-815 -- Resumo do job para cliente**
Como Atendimento, quero pedir ao Copilot um resumo do status do job para compartilhar com o cliente, para poupar tempo de redigir update manualmente.

Criterios de aceite:
- CA-815.1: Pergunta Gera um resumo do job 040 para o cliente retorna texto em linguagem formal e positiva
- CA-815.2: Resumo contem: fase atual, o que ja foi feito, proximos marcos, data de entrega confirmada
- CA-815.3: Resumo NAO contem: margem, custo de producao, notas internas, caches de equipe
- CA-815.4: Botao Copiar texto disponivel no card da resposta
- CA-815.5: Texto sem markdown excessivo, adequado para envio direto por WhatsApp

---
**US-816 -- Perguntas sobre financeiro**
Como Financeiro, quero perguntar ao Copilot sobre a situacao financeira dos jobs, para ter respostas rapidas sem navegar por relatorios.

Criterios de aceite:
- CA-816.1: Perguntas aceitas: Qual a margem media do trimestre?, Quais jobs tem margem abaixo de 15%?, Qual o faturamento previsto para este mes?
- CA-816.2: Copilot acessa financial_records, jobs.closed_value, jobs.margin_percentage para responder
- CA-816.3: Respostas incluem valores em R$ BRL com separador de milhar (ex: R$ 185.000)
- CA-816.4: Dados financeiros visiveis apenas para roles: admin, ceo, financeiro

---

**US-817 -- Perguntas sobre equipe e disponibilidade**
Como PE, quero perguntar ao Copilot sobre disponibilidade de equipe, para tomar decisoes de alocacao mais rapido.

Criterios de aceite:
- CA-817.1: Perguntas aceitas: Quem esta disponivel para dirigir em marco?, Quantos jobs o [nome] esta tocando agora?, Ha conflitos de agenda essa semana?
- CA-817.2: Copilot consulta tabela allocations e job_team para responder com dados reais
- CA-817.3: Resposta lista pessoas disponiveis no periodo com seu role principal e jobs ativos
- CA-817.4: Conflitos detectados sao nomeados explicitamente (nome + jobs em conflito + datas sobrepostas)
- CA-817.5: Sugestao de alternativas quando pessoa solicitada esta indisponivel no periodo

---

**US-818 -- Logs e rastreabilidade do Copilot**
Como admin, quero ver o historico de interacoes com o Copilot, para entender uso e identificar respostas incorretas.

Criterios de aceite:
- CA-818.1: Cada interacao armazenada na tabela ai_interactions com: tenant_id, user_id, feature, input, output, model_used, tokens_used, created_at
- CA-818.2: Pagina /settings/ai (admin only) exibe historico de interacoes com filtros de data e usuario
- CA-818.3: Custo estimado em USD por interacao e total do mes (baseado em tokens e preco Claude)
- CA-818.4: Botao para marcar interacao como resposta incorreta (feedback para calibragem de prompts)
- CA-818.5: Interacoes deletadas automaticamente apos 90 dias via pg_cron

---

**US-819 -- Limites de uso e controle de custo**
Como admin, quero configurar limites de uso da IA por tenant, para controlar custos da API Claude.

Criterios de aceite:
- CA-819.1: Pagina /settings/ai permite configurar limite mensal de tokens para o tenant
- CA-819.2: Ao atingir 80% do limite, admin recebe notificacao in-app via sistema existente de notifications
- CA-819.3: Ao atingir 100% do limite, funcionalidades de IA exibem mensagem de limite atingido ate virada do mes
- CA-819.4: Dashboard de uso: tokens consumidos no mes por feature (estimativa, copilot, dailies, matching)
- CA-819.5: Limite padrao configuravel: 500.000 tokens/mes por tenant

---

### 5.3 F8.3 -- Analise de Dailies (US-821 a US-826)

**US-821 -- Submeter descricao de material filmado para analise**
Como Coordenador de Producao, quero inserir a descricao do material bruto filmado e receber analise automatica, para gerar checklist de qualidade sem assistir todo o material.

Criterios de aceite:
- CA-821.1: Botao Analisar Dailies com IA disponivel na aba Producao do job detail
- CA-821.2: Formulario aceita: descricao textual livre do material (o que foi filmado, condicoes, problemas observados), lista de takes (opcional), notas do continuista (opcional)
- CA-821.3: Campo de texto suporta ate 5.000 caracteres
- CA-821.4: Botao para anexar arquivo de notas (.txt, .docx, .pdf, max 2MB) que e extraido para texto antes do envio
- CA-821.5: Submissao envia para Edge Function ai-dailies-analysis que chama Claude Sonnet

---

**US-822 -- Receber checklist de qualidade do material**
Como Coordenador de Producao, quero receber checklist estruturado de verificacoes de qualidade baseado no material descrito, para garantir que nada sera esquecido na revisao.

Criterios de aceite:
- CA-822.1: IA retorna checklist dividido em categorias: Tecnico (foco, exposicao, cor, audio), Criativo (cobertura de cenas, continuidade, performance), Operacional (takes suficientes, backups, arquivos)
- CA-822.2: Cada item tem status sugerido: OK, Verificar, Problema Identificado
- CA-822.3: Itens com Problema Identificado tem explicacao e sugestao de reshoot
- CA-822.4: Checklist e editavel: usuario pode alterar status de cada item manualmente
- CA-822.5: Botao Salvar checklist persiste resultado na tabela ai_interactions vinculado ao job

---

**US-823 -- Sugestoes de reshoot**
Como Diretor, quero receber sugestoes automaticas de cenas que precisam ser refilmadas, para planejar dias de reshoot com antecedencia.

Criterios de aceite:
- CA-823.1: Secao Recomendacoes de Reshoot exibida separadamente do checklist geral
- CA-823.2: Cada sugestao inclui: descricao da cena, motivo tecnico ou criativo, urgencia (critico / recomendado / opcional)
- CA-823.3: Lista e exportavel como PDF para compartilhar com direcao e producao
- CA-823.4: Usuario pode descartar cada sugestao com motivo (ex: ja filmamos, aprovado assim mesmo)
- CA-823.5: Sugestoes descartadas ficam registradas com timestamp e nome do usuario

---
**US-824 -- Analise de conformidade com briefing**
Como PE, quero que a IA compare o material descrito com o briefing original do job, para identificar desvios do que foi acordado com o cliente.

Criterios de aceite:
- CA-824.1: Se o job tiver briefing_text preenchido, a analise inclui secao Conformidade com Briefing
- CA-824.2: IA identifica elementos do briefing como cobertos, parcialmente cobertos ou ausentes no material descrito
- CA-824.3: Alerta especifico para elementos criticos do briefing nao encontrados no material
- CA-824.4: Resultado e informativo (nao bloqueia workflow)
- CA-824.5: Se briefing_text estiver vazio, secao e omitida sem exibir erro

---

**US-825 -- Historico de analises de dailies**
Como Coordenador, quero ver historico de todas as analises de dailies do job, para acompanhar evolucao da cobertura ao longo das diarias.

Criterios de aceite:
- CA-825.1: Lista de analises ordenada por data (mais recente primeiro)
- CA-825.2: Cada entrada: data de submissao, usuario, resumo de problemas encontrados (contagem por categoria)
- CA-825.3: Acesso ao resultado completo de cada analise anterior
- CA-825.4: Comparativo entre analises: numero de problemas identificados em cada diaria

---

**US-826 -- Analise de transcricao de audio**
Como PE, quero submeter transcricao de audio (dialogos, locucao) para verificacao de conformidade com o roteiro aprovado, para identificar desvios antes da pos-producao.

Criterios de aceite:
- CA-826.1: Campo adicional no formulario aceita transcricao de audio (texto livre ou arquivo .txt)
- CA-826.2: Se job tiver script_url definido e texto do roteiro disponivel, IA compara transcricao com roteiro
- CA-826.3: IA retorna: trechos do roteiro nao gravados, variacoes de texto, linhas extras nao previstas
- CA-826.4: Funcionalidade e opcional e so aparece se transcricao for fornecida
- CA-826.5: Processamento usa Claude Sonnet com limite de 10.000 tokens de input

---

### 5.4 F8.4 -- Matching de Freelancer (US-831 a US-837)

**US-831 -- Solicitar sugestao de freelancers para um role**
Como PE, quero selecionar um role necessario no job e receber sugestoes dos melhores freelancers do cadastro, para tomar a decisao de alocacao mais rapido e com mais confianca.

Criterios de aceite:
- CA-831.1: Botao Sugerir com IA disponivel ao lado de cada role vazio na aba Equipe do job detail
- CA-831.2: Sistema considera: role necessario, periodo de alocacao (se definido), historico com a produtora, rate (dentro do budget do job), disponibilidade via tabela allocations
- CA-831.3: Retorna lista de ate 5 sugestoes ordenadas por score de adequacao (0-100)
- CA-831.4: Para cada sugestao: nome, iniciais/foto, score, motivo em texto curto, contagem de jobs anteriores, disponibilidade estimada
- CA-831.5: Botao Adicionar ao job direto em cada sugestao (abre modal de confirmacao de rate e hiring_status)

---

**US-832 -- Entender o score de matching**
Como PE, quero entender como o score de cada sugestao foi calculado, para confiar na recomendacao.

Criterios de aceite:
- CA-832.1: Tooltip ou secao expandivel mostra breakdown: Experiencia no role (0-30 pts), Historico com a produtora (0-25 pts), Disponibilidade no periodo (0-25 pts), Compatibilidade de rate (0-20 pts)
- CA-832.2: Cada dimensao mostra evidencia: ex: Trabalhou como DoP em 4 jobs nos ultimos 12 meses ou Rate de R$1.500/dia, dentro do budget estimado
- CA-832.3: Score computado via RPC no PostgreSQL (logica deterministica e rapida, sem LLM para o calculo)
- CA-832.4: Claude Haiku usado apenas para gerar o texto de justificativa em linguagem natural a partir do score calculado

---

**US-833 -- Filtrar sugestoes por criterios**
Como PE, quero filtrar as sugestoes de freelancer por criterios especificos, para refinar a busca.

Criterios de aceite:
- CA-833.1: Filtros disponiveis: faixa de rate (R$ min/max), disponivel apenas no periodo do job, somente quem ja trabalhou com a produtora, skills/tags especificos
- CA-833.2: Filtros aplicados sem nova chamada ao LLM (logica no banco via RPC)
- CA-833.3: Score recomputado ao mudar filtros
- CA-833.4: Filtro Disponivel considera tanto allocations ativas quanto job_team com datas sobrepostas

---
**US-834 -- Scores pre-calculados e atualizados automaticamente**
Como sistema, quero que os scores de matching sejam pre-calculados e atualizados automaticamente, para que as sugestoes sejam instantaneas.

Criterios de aceite:
- CA-834.1: Tabela ai_freelancer_scores armazena score por pessoa por role com timestamp de ultima atualizacao
- CA-834.2: Score recalculado via pg_cron diariamente (00:00 BRT)
- CA-834.3: Score tambem recalculado on-demand quando: job e finalizado, nova alocacao e criada, pessoa e editada no cadastro
- CA-834.4: RPC calculate_freelancer_scores retorna top 10 freelancers com scores em menos de 500ms

---

**US-835 -- Historico de matching e decisoes**
Como PE, quero ver quais sugestoes da IA foram aceitas ou rejeitadas, para entender a acuracia do matching.

Criterios de aceite:
- CA-835.1: Toda interacao de matching registrada na tabela ai_interactions com: job_id, role, sugestoes geradas, sugestao aceita (person_id) ou nenhuma
- CA-835.2: Secao em /settings/ai mostra: total de sugestoes, percentual aceitas, top freelancers mais recomendados por role
- CA-835.3: Dados usados para ajustar pesos do algoritmo de score em versoes futuras

---

**US-836 -- Sugestao proativa quando ha conflito de alocacao**
Como PE, quero ser alertado quando um freelancer que estou tentando alocar ja esta em outro job no periodo, e receber sugestoes alternativas automaticamente.

Criterios de aceite:
- CA-836.1: Quando usuario tenta adicionar pessoa ao job_team e sistema detecta conflito (Fase 6), alerta inclui botao Ver alternativas
- CA-836.2: Ao clicar, abre painel de matching com pessoas disponiveis para o mesmo role e periodo
- CA-836.3: Integracao com sistema de conflitos existente (allocations + jobs-team warnings da Fase 6)
- CA-836.4: Sugestoes alternativas excluem automaticamente a pessoa em conflito e pessoas ja alocadas no job

---

**US-837 -- Matching para elenco (cast)**
Como Produtor de Casting, quero receber sugestoes de elenco baseadas em criterios do job, para acelerar o processo de casting.

Criterios de aceite:
- CA-837.1: Matching de elenco considera pessoas com role = ator ou role = apresentador na tabela people
- CA-837.2: Score de elenco usa dimensoes proprias: Experiencia publicitaria (0-35 pts), Compatibilidade com segmento (0-30 pts), Disponibilidade (0-20 pts), Rate compativel (0-15 pts)
- CA-837.3: Criterios adicionais: genero (se especificado no briefing), faixa etaria (se especificada), exclusividade de marca (verifica via tags da pessoa)
- CA-837.4: Feature visivel apenas para jobs com project_type que exige elenco (filme_publicitario, branded_content, videoclipe)
- CA-837.5: Limitacao declarada: sugere baseado em historico interno. Banco de talentos externo (agencias) fora do escopo desta versao.

---
## 6. Requisitos Nao Funcionais

### 6.1 Performance

- Estimativa de orcamento: resposta em menos de 5 segundos (Haiku + query de historico)
- Copilot: resposta completa em menos de 8 segundos; timeout da Edge Function: 30 segundos
- Analise de dailies: processamento em menos de 15 segundos (Sonnet + contexto longo)
- Matching de freelancer: score pre-calculado, retorno em menos de 500ms (RPC PostgreSQL)

### 6.2 Privacidade e Seguranca

- Nenhum dado de clientes, valores financeiros ou informacoes sensiveis e enviado para treinamento da Anthropic
- Chamadas a Claude API incluem apenas o contexto estritamente necessario para a tarefa
- Logs de interacoes com IA deletados apos 90 dias automaticamente via pg_cron
- Chave da Claude API armazenada no Supabase Vault (ANTHROPIC_API_KEY via read_secret RPC)
- Todas as Edge Functions de IA requerem autenticacao JWT valido (nenhuma e publica)
- tenant_id sempre derivado do JWT, nunca do payload da requisicao

### 6.3 Custo e Escalabilidade

| Feature | Modelo Claude | Custo estimado por uso |
|---------|--------------|------------------------|
| Estimativa de orcamento | claude-haiku-4-5 | ~US\/usr/bin/bash,002 por estimativa |
| Copilot -- pergunta simples | claude-haiku-4-5 | ~US\/usr/bin/bash,001 por pergunta |
| Copilot -- analise complexa | claude-sonnet-4-6 | ~US\/usr/bin/bash,02 por pergunta |
| Analise de dailies | claude-sonnet-4-6 | ~US\/usr/bin/bash,05 por analise |
| Matching -- texto justificativa | claude-haiku-4-5 | ~US\/usr/bin/bash,001 por matching |
| Matching -- score | PostgreSQL RPC | Sem custo de LLM |

Estimativa total para tenant medio (20 jobs/mes): ~R-25/mes em Claude API.

- Rate limiting por tenant: maximo 100 chamadas de IA por hora
- Caching de respostas: estimativas com mesmo hash de input retornam resultado cacheado por 1 hora

### 6.4 Qualidade de Resposta

- Prompt engineering documentado em supabase/functions/_shared/ai-prompts.ts
- Respostas da IA sempre em portugues brasileiro
- Instrucao de sistema padrao: sempre admitir incerteza, nunca inventar dados, referenciar apenas dados reais do tenant
- Temperatura Claude: 0.3 para estimativas (mais deterministico), 0.7 para Copilot (mais natural)
- Max tokens de output: 1.000 para Copilot, 2.000 para estimativas, 4.000 para analise de dailies

---
## 7. Schema do Banco de Dados

### 7.1 Tabela: ai_interactions

Registro de todas as interacoes com IA para auditoria, calibragem e controle de custo.



### 7.2 Tabela: ai_freelancer_scores

Cache de scores de matching por pessoa e role. Recalculado diariamente via pg_cron.



### 7.3 RPC: calculate_freelancer_scores

Retorna top-N freelancers para um role com score em tempo real, filtrado por periodo e rate maximo.



### 7.4 pg_cron: manutencao automatica



---
## 8. Edge Functions

### 8.1 ai-budget-estimate

**Handlers:**
- POST /estimate -- gera estimativa de orcamento para um briefing
- POST /generate-items -- gera itens de budget detalhados a partir de estimativa existente
- GET /history?job_id={id} -- historico de estimativas de um job
- GET /templates -- lista templates de briefing do tenant
- POST /templates -- cria template de briefing
- DELETE /templates/:id -- remove template
- GET /accuracy-report -- relatorio de acuracia (somente admin/ceo)

**Logica principal do handler /estimate:**
1. Valida JWT e extrai tenant_id
2. Busca jobs finalizados do tenant com project_type e client_segment similares (ultimos 24 meses)
3. Calcula estatisticas: media, mediana, percentil 25 e 75 de closed_value e margin_percentage
4. Monta contexto anonimizado (sem nomes de clientes, sem valores individuais por job)
5. Chama Claude Haiku com prompt documentado em ai-prompts.ts
6. Retorna range (p25-p75), confianca e breakdown por categoria
7. Salva interacao em ai_interactions

### 8.2 ai-copilot

**Handlers:**
- POST /chat -- envia mensagem e recebe resposta

**Logica do handler /chat:**
1. Recebe mensagem do usuario + contexto opcional (job_id atual, historico de conversa -- max 10 turnos)
2. Define quais tools acionar baseado na intencao da pergunta
3. Chama Claude com tool_use habilitado; Claude decide quais ferramentas consultar
4. Executa as tool calls no banco (queries PostgreSQL seguras com tenant_id)
5. Retorna resposta final com dados reais embutidos e links relativos
6. Salva resumo da interacao em ai_interactions

**Ferramentas (tools) disponiveis para o Copilot:**
- get_jobs_summary -- lista resumida de jobs com status, health_score, datas
- get_job_detail -- detalhe de um job especifico por codigo ou id
- get_financial_summary -- KPIs financeiros do tenant (somente roles financeiro/admin/ceo)
- get_team_allocations -- alocacoes de equipe por periodo
- get_pending_approvals -- aprovacoes pendentes com dias em aberto
- get_alerts -- alertas criticos ativos (mesma logica do dashboard)

### 8.3 ai-dailies-analysis

**Handlers:**
- POST /analyze -- submete descricao de dailies para analise
- GET /history?job_id={id} -- historico de analises do job
- POST /:analysis_id/dismiss-item -- descarta item do checklist com motivo

**Logica do handler /analyze:**
1. Valida JWT e extrai tenant_id, job_id
2. Busca briefing_text do job (se disponivel) para analise de conformidade
3. Chama Claude Sonnet com prompt especializado em producao audiovisual
4. Retorna JSON estruturado: checklist categorizado, recomendacoes de reshoot, conformidade com briefing
5. Salva resultado completo em ai_interactions.output_summary

### 8.4 ai-freelancer-match

**Handlers:**
- POST /suggest -- sugestoes para um role e job especifico
- GET /scores?role={role} -- scores pre-calculados por role
- POST /recalculate -- forca recalculo de scores (admin only)
- POST /feedback -- registra se sugestao foi aceita ou rejeitada

**Logica do handler /suggest:**
1. Valida JWT, extrai tenant_id, job_id, role
2. Busca parametros do job (periodo de alocacao, budget disponivel para o role)
3. Chama RPC calculate_freelancer_scores com filtros do job
4. Para top 5 resultados, chama Claude Haiku para gerar justificativa em linguagem natural
5. Retorna lista com score breakdown e justificativa por pessoa
6. Salva interacao em ai_interactions

---
## 9. Sub-fases de Implementacao

| Sub-fase | Descricao | Prioridade | Dependencias |
|----------|-----------|-----------|--------------|
| 8.1 | Infrastructure: migrations (ai_interactions, ai_freelancer_scores), RPC calculate_freelancer_scores, pg_cron jobs, ai-prompts.ts shared | P0 | Fase 7 concluida |
| 8.2 | Edge Function: ai-budget-estimate (handlers estimate, history, templates) | P0 | 8.1 |
| 8.3 | Frontend: BudgetEstimatePanel (formulario, resultado com range e jobs base, historico, apply to job) | P0 | 8.2 |
| 8.4 | Edge Function: ai-copilot (handler chat com tool_use e 6 ferramentas) | P0 | 8.1 |
| 8.5 | Frontend: CopilotChat (drawer flutuante, interface de chat, markdown rendering) | P0 | 8.4 |
| 8.6 | Edge Function: ai-freelancer-match (suggest, scores, feedback) + RPC completo | P1 | 8.1 |
| 8.7 | Frontend: FreelancerMatchPanel (sugestoes, score breakdown tooltip, botao adicionar ao job) | P1 | 8.6 |
| 8.8 | Edge Function: ai-dailies-analysis (analyze, history, dismiss-item) | P1 | 8.1 |
| 8.9 | Frontend: DailiesAnalysisPanel (formulario, checklist editavel, reshoot list, exportar PDF) | P1 | 8.8 |
| 8.10 | Settings AI (/settings/ai): logs de interacoes, limites de uso, templates, relatorio de acuracia | P1 | 8.2, 8.4, 8.6, 8.8 |
| 8.11 | WhatsApp bot: estimativa via mensagem (workflow n8n + Evolution API) | P2 | 8.2 |
| 8.12 | Polish + Testes E2E + calibragem de prompts + monitoramento de custo | P1 | 8.2--8.10 |

---

## 10. Dependencias e Pre-requisitos

### Pre-requisitos obrigatorios (ja existentes)
- Fase 7 concluida e auditada (30 tabelas, 16 Edge Functions ativas)
- Supabase Vault configurado com suporte a read_secret / write_secret (desde Fase 5)
- ANTHROPIC_API_KEY deve ser cadastrada no Vault antes da sub-fase 8.2
- Tabela people com historico de job_team (roles e rates pregressos) -- necessaria para scoring de matching
- Tabela jobs com campos briefing_text, project_type, client_segment, complexity_level -- necessaria para estimativas
- pg_cron habilitado (extensao ativa desde Fase 5)
- n8n self-hosted na VPS (necessario para US-806 -- estimativa via WhatsApp, sub-fase P2)

### Dependencias tecnicas novas
- Nenhuma nova biblioteca de frontend (Recharts e TanStack Query ja instalados na Fase 7)
- Nenhuma nova extensao PostgreSQL necessaria
- ANTHROPIC_API_KEY no Vault e a unica dependencia nova de infraestrutura

### Volume minimo de dados para funcionamento adequado

| Feature | Dados minimos | Comportamento abaixo do minimo |
|---------|--------------|-------------------------------|
| Estimativa de orcamento | 3 jobs finalizados com valores | Retorna valores de referencia genericos com aviso explicito |
| Copilot | Nenhum (dados em tempo real) | Funciona desde o primeiro job |
| Analise de dailies | Nenhum (processa input fornecido) | Funciona desde o primeiro uso |
| Matching de freelancer | 3 jobs no job_team para a pessoa | Score parcial; score_history = 0 para pessoas novas |

---
## 11. Fora do Escopo da Fase 8

Os itens abaixo NAO serao implementados nesta fase:

1. **Fine-tuning ou modelo proprio:** toda IA usa Claude API com prompts. Sem modelos customizados ou treinamento.
2. **Analise de video/imagem de dailies:** a Fase 8 analisa DESCRICAO TEXTUAL do material, nao o video em si. Analise multimodal de video fica para versao futura.
3. **Benchmark de mercado externo:** estimativas baseadas apenas em historico interno do tenant. Dados de precificacao de mercado externo nao sao integrados.
4. **IA para geracao ou revisao de contratos:** contratos sao gerados por templates (Fase 5). Revisao juridica por IA fica para versao futura.
5. **Banco de talentos externo:** matching usa apenas o cadastro interno de people do tenant. Integracao com agencias de talentos externas esta fora do escopo.
6. **Chatbot autonomo no portal do cliente:** o Portal do Cliente (Fase 7) tem mensagens humanas. Bot automatico no portal esta fora do escopo.
7. **Previsao de faturamento por ML:** forecast financeiro preditivo esta fora do escopo. Projecao de pipeline ja e coberta pelo Dashboard da Fase 7.
8. **Multi-provider LLM:** apenas Claude API (Anthropic). Sem abstracoes para OpenAI ou outros provedores nesta fase.
9. **IA em tempo real via Supabase Realtime:** todas as chamadas de IA sao request/response sob demanda.
10. **Analise de proposta comercial de concorrentes:** fora do escopo etico e legal.

---

## 12. Metricas de Sucesso

### Metricas de adocao (30 dias apos lancamento)

| Metrica | Meta | Como medir |
|---------|------|-----------|
| % de novos jobs com estimativa IA gerada | 60% | ai_interactions WHERE feature = budget_estimate nos ultimos 30 dias |
| % de estimativas aplicadas ao job (was_applied = true) | 40% | ai_interactions.was_applied = true / total de estimativas |
| Sessoes de Copilot por semana por tenant ativo | 10+ | ai_interactions WHERE feature = copilot GROUP BY semana |
| % de sugestoes de freelancer aceitas | 30% | ai_interactions WHERE feature = freelancer_match AND was_applied = true |
| NPS feature de IA (survey in-app apos 30 dias) | NPS 7.0+ | Survey em /settings/ai |

### Metricas de qualidade

| Metrica | Meta | Como medir |
|---------|------|-----------|
| Desvio medio estimativa vs valor real | Menos de 20% | Relatorio de acuracia em /reports tab IA |
| Feedback negativo no Copilot | Menos de 10% | ai_interactions.feedback = incorrect / total |
| Tempo medio de resposta Copilot | Menos de 5 segundos | ai_interactions.duration_ms media |
| Erros de API Claude (rate limit ou timeout) | Menos de 1% das chamadas | Logs da Edge Function no Supabase |

### Metricas de custo

| Metrica | Meta |
|---------|------|
| Custo medio Claude API por tenant/mes | Abaixo de R  |
| Tokens em chamadas que resultam em erro de parsing | Menos de 5% do total |

### Metricas de impacto no negocio (90 dias)

- Reducao no tempo de elaboracao de orcamento inicial: de 2 horas para 30 minutos (validar com PE da Ellah)
- Reducao de conflitos de alocacao passados despercebidos: -50% vs baseline da Fase 6
- Satisfacao do time com a ferramenta: pesquisa qualitativa com 5 usuarios internos apos 60 dias

---
## 13. Perguntas Abertas

As seguintes perguntas precisam ser respondidas antes do inicio da implementacao:

| # | Pergunta | Impacto | Para quem |
|---|----------|---------|-----------|
| 1 | Qual o limite mensal de custo de Claude API que a Ellah aceita pagar por tenant? Isso define se usamos Haiku em tudo ou Sonnet no Copilot. | Alto -- afeta arquitetura de custo | CEO |
| 2 | O Copilot deve ter acesso a valores financeiros (margem, custo, faturamento) para todos os usuarios, ou apenas para roles financeiro/admin/ceo? | Alto -- afeta design de permissoes | CEO/PE |
| 3 | Para Analise de Dailies, o objetivo e processar apenas texto descritivo agora, ou ha interesse em subir arquivos de video no futuro? Impacta arquitetura de storage. | Medio -- afeta arquitetura futura | CEO |
| 4 | As estimativas devem considerar dados de mercado externos (ex: tabela APAN/ABRACI de referencias) ou apenas historico interno? | Medio -- afeta qualidade para tenants novos | CEO/PE |
| 5 | O Copilot deve responder em streaming (texto aparece palavra por palavra) ou resposta completa de uma vez? Streaming melhora UX mas complica timeout da Edge Function. | Medio -- afeta UX e arquitetura | PE (usuario) |
| 6 | O historico de conversa do Copilot deve ser persistido no banco (para retomar em outra sessao) ou apenas na sessao do navegador (mais simples, mais privado)? | Baixo -- afeta storage e privacidade | CEO |

---

## 14. Decisoes Arquiteturais (ADRs a criar)

Os seguintes ADRs serao formalizados durante a implementacao da Fase 8:

| ADR | Titulo | Decisao antecipada |
|-----|--------|--------------------|
| ADR-014 | Modelo Claude por feature de IA | Haiku para estimativas e matching; Sonnet para dailies; Haiku ou Sonnet para Copilot (depende resposta pergunta 1) |
| ADR-015 | Persistencia de historico de conversa do Copilot | sessionStorage no navegador -- simplicidade e privacidade. Reversivel para banco se necessario. (depende pergunta 6) |
| ADR-016 | Scoring de freelancer deterministico vs LLM | Score calculado via RPC PostgreSQL; Claude usado apenas para texto de justificativa |
| ADR-017 | Rate limiting de Claude API por tenant | Contador de tokens em tabela PostgreSQL com reset mensal via pg_cron |

---

## 15. Proximos Passos

1. Responder as 6 Perguntas Abertas da Secao 13 (CEO + PE da Ellah)
2. Criar ADR-014 a ADR-017 com as decisoes validadas
3. Criar arquivo de arquitetura tecnica: docs/architecture/fase-8-ai-architecture.md
4. Cadastrar ANTHROPIC_API_KEY no Supabase Vault
5. Implementar Sub-fase 8.1: Infrastructure (migrations + RPC + pg_cron + ai-prompts.ts)
6. Implementar Sub-fases 8.2 + 8.3: Estimativa de Orcamento (Edge Function + Frontend)
7. Implementar Sub-fases 8.4 + 8.5: Copilot (Edge Function + Frontend)
8. Implementar Sub-fases 8.6 + 8.7: Matching de Freelancer (Edge Function + Frontend)
9. Implementar Sub-fases 8.8 + 8.9: Analise de Dailies (Edge Function + Frontend)
10. Implementar Sub-fase 8.10: Settings AI (logs, limites, templates, relatorio de acuracia)
11. QA end-to-end + calibragem de prompts com dados reais da Ellah
12. Deploy em producao + monitoramento de custo via logs Supabase

---

**Fim da Spec: Fase 8 -- Inteligencia Artificial**
**Total de User Stories:** 37 (US-801 a US-837)
**Prioridade P0:** US-801 a US-819 (Estimativa de Orcamento + Copilot) -- 19 user stories
**Prioridade P1:** US-821 a US-837 (Analise de Dailies + Matching de Freelancer) -- 18 user stories
**Status:** Aguardando respostas das Perguntas Abertas (Secao 13) para iniciar implementacao
