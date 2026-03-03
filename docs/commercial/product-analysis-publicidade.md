# ELLAHOS — Analise Comercial para Produtoras de Filmes Publicitarios

**Data:** 2026-03-03
**Autor:** Consultor de Produto ELLAHOS
**Versao:** 1.0
**Publico:** Founder/CEO, time de produto, investidores

---

## RESUMO EXECUTIVO

O ELLAHOS tem em maos um produto com profundidade tecnica rara para o mercado audiovisual brasileiro. Sao 46 tabelas, 28 Edge Functions, 22+ paginas de frontend, IA integrada, automacoes com n8n, integracao com Drive/DocuSeal/WhatsApp — tudo multi-tenant. O sistema cobre do CRM ao fechamento financeiro, passando por claquete ANCINE e horas extras.

**O problema:** o produto foi construido de dentro pra fora. Quem fez sabe que e poderoso. Quem ve de fora, em 30 segundos, nao entende o que faz nem por que deveria trocar a planilha.

**A oportunidade:** existem 500+ produtoras publicitarias no Brasil faturando de R$1M a R$50M/ano. NENHUMA ferramenta fala a lingua delas. O ELLAHOS fala. Mas precisa de 5 ajustes cirurgicos para virar dinheiro.

---

## 1. ANALISE DO MERCADO DE PRODUTORAS PUBLICITARIAS NO BRASIL

### 1.1 Tamanho e perfil

- **Produtoras de filmes publicitarios ativas no Brasil:** ~500-700 (fonte: APRO, Sinapro, registros ANCINE)
- **Faturamento medio:** R$3M-R$15M/ano para produtoras mid-market (foco principal)
- **Jobs por ano:** 15-80 por produtora (media: 30-40)
- **Equipe fixa:** 5-20 pessoas (o grosso e freelancer)
- **Ticket medio por job:** R$80k-R$500k (filmes publicitarios para TV)
- **Margem media:** 15-35% (muita produtora nao sabe a margem real)

### 1.2 Dores reais (ordenadas por intensidade)

| # | Dor | Quem sofre | Intensidade |
|---|-----|-----------|-------------|
| 1 | **Nao saber a margem real ate fechar o job** | CEO/PE | 10/10 |
| 2 | **Planilhas duplicadas, desatualizadas, cada PE com versao diferente** | Todos | 9/10 |
| 3 | **Cobrar NF de fornecedor e um trabalho manual insano** | Coordenador/Financeiro | 9/10 |
| 4 | **Perder dinheiro por esquecimento** (pagamento duplicado, NF nao cobrada, HE nao contabilizada) | CEO/Financeiro | 8/10 |
| 5 | **Nao saber quem esta disponivel quando** (conflito de agenda de freelancers) | PE/Coordenador | 8/10 |
| 6 | **Cada job e uma aventura** — sem processo padrao, depende da memoria do PE | CEO | 7/10 |
| 7 | **Contratos demoram semanas** (mandar email, esperar PDF assinado, cobrar) | Coordenador | 7/10 |
| 8 | **CEO nao tem visao consolidada** — precisa abrir 5 planilhas pra saber como vai o mes | CEO | 7/10 |
| 9 | **Compliance ANCINE** (claquete, registros) e feito as pressas | PE | 6/10 |
| 10 | **Onboarding de freelancer** — cada job repete os mesmos dados bancarios | Coordenador | 6/10 |

### 1.3 Como trabalham hoje

**Ferramentas atuais (realidade de 90% das produtoras):**
- Google Sheets como "ERP" (uma planilha mestre por job — o famoso "GG")
- Google Drive para arquivos (estrutura de pastas que so quem criou entende)
- WhatsApp para TUDO (briefing, aprovacao, envio de NF, cobranca)
- Email para NFs e contratos
- Apps Script caseiro (quem tem alguem tecnico)
- Trello/Asana/Monday para tarefas (abandonado depois de 2 meses)
- Yamdu ou StudioBinder (tentaram, desistiram — complexo demais ou nao faz financeiro)

**O que faz uma produtora trocar (ou NAO trocar) de ferramenta:**

TROCA quando:
- Perdeu dinheiro de forma visivel (pagamento duplicado, NF esquecida)
- Contratou diretor financeiro que exige organizacao
- Cresceu e a planilha nao aguenta mais
- CEO viu um concorrente usando algo melhor

NAO TROCA quando:
- "Minha planilha funciona" (ilusao — funciona ate quebrar)
- "Nao tenho tempo pra migrar" (argumento #1)
- "Tentei sistema X e desisti em 2 semanas" (trauma)
- "Minha PE de 55 anos nao vai aprender" (medo real)

### 1.4 Janela de oportunidade

O mercado publicitario brasileiro esta em transicao:
- **ANCINE regulamentando mais** (compliance ficando mais rigido)
- **Agencias exigindo transparencia financeira** (querem ver breakdown de custos)
- **Branded content crescendo** (mais jobs menores, mais complexidade operacional)
- **Freelancerization** (menos equipe fixa, mais terceirizados = mais gestao)
- **IA chegando** (produtoras querem, nao sabem como usar)

---

## 2. AVALIACAO DO QUE JA EXISTE

### 2.1 O que esta BOM — argumentos de venda prontos

#### A) Financeiro completo (Nota: 9/10)
**O que tem:** Cost items por job, modo orcamento vs realizado, categorias customizaveis, dashboard financeiro, calendario de pagamentos, verbas a vista, conciliacao bancaria OFX, NF validation com OCR (Groq Vision), solicitacao de NFs por email, comprovantes N:N, carta orcamento por IA, aprovacao hierarquica.

**Por que vende:** E o UNICO sistema audiovisual que faz isso tudo. StudioBinder nao tem financeiro. Yamdu tem financeiro fraco. Planilha nao tem OCR, nao tem aprovacao hierarquica, nao vincula NF a custo, nao reconcilia banco.

**Pitch killer:** "Mostra na tela a margem REAL de cada job, em tempo real. Sem abrir planilha. Sem fazer conta."

**Metricas de venda:**
- OCR de NF economiza ~15 min por NF (produtora media recebe 50-100 NFs/mes = 12-25 horas/mes)
- Conciliacao bancaria OFX economiza ~4 horas/mes do financeiro
- Aprovacao hierarquica elimina WhatsApp de "pode pagar?" (~30 mensagens/dia)

#### B) Pipeline de producao com 14 status (Nota: 8/10)
**O que tem:** 14 status reais do fluxo de producao (briefing_recebido ate finalizado), views em tabela E kanban, filtros, paginacao, bulk actions, cancel com motivo obrigatorio.

**Por que vende:** O pipeline respeita o fluxo REAL da produtora (nao e generico tipo Trello). Status como "aguardando_aprovacao_cliente" e "pos_producao" sao termos que PE entende sem explicacao.

**Pitch killer:** "Mostra todos os seus jobs num board como o Trello, mas com os status certos pra producao. Arrasta o card e todo mundo ve."

#### C) IA Copilot ELLA (Nota: 7/10)
**O que tem:** Chat integrado em todas as paginas, contexto do job aberto, historico de conversas, streaming SSE, rate limiting, Groq free tier (custo zero).

**Por que vende:** NENHUM concorrente tem assistente IA que entende producao audiovisual brasileira. Perguntar "quais jobs estao atrasados?" e ter resposta instantanea e um diferencial brutal.

**Pitch killer:** "Tem uma IA que ja sabe tudo dos seus jobs. Pergunta pra ela ao inves de abrir 5 planilhas."

#### D) Integracao DocuSeal — contratos batch (Nota: 8/10)
**O que tem:** Assinatura digital integrada, contratos batch para equipe de job, portal do fornecedor publico (link sem login), status tracking.

**Por que vende:** Resolver contratos de freelancer e uma dor GIGANTE. Mandar link e o cara assina do celular = economiza semanas.

#### E) CRM Pipeline (Nota: 7/10)
**O que tem:** Kanban 7 estagios, oportunidades com valor/probabilidade, propostas versionadas, atividades, conversao em job, stats.

**Por que vende:** Produtoras nao tem CRM. Literalmente zero. Usam "caderno da PE" ou WhatsApp. Ter pipeline visual de vendas e inedito.

#### F) Dashboard com KPIs (Nota: 7/10)
**O que tem:** Jobs ativos, faturamento do mes, margem media, health score, aprovacoes pendentes, pipeline chart, revenue chart, atividade recente, alertas.

**Por que vende:** CEO abre o sistema e ve TUDO em 5 segundos. Sem planilha, sem ligar pra PE.

#### G) Multi-tenant desde o dia 1 (Nota: 8/10)
**O que tem:** RLS em todas as tabelas, tenant_id em tudo, configuracoes por tenant, isolation real.

**Por que vende:** Nao e uma gambiarra. E SaaS de verdade. Cada produtora e isolada, dados nunca cruzam. Escala infinita.

### 2.2 O que esta FRACO — pode travar adocao

#### A) Onboarding INEXISTENTE (Gravidade: CRITICA)
**Problema:** Nao tem tour guiado, nao tem wizard de setup, nao tem tutorial. O usuario entra e ve uma tela vazia.

**Impacto:** PE de 55 anos abre, nao entende, fecha, nunca mais volta. Esse e o motivo #1 de churn em SaaS para publico nao-tech.

**O que falta:**
- Wizard de primeiro acesso (dados da produtora, logo, CNPJ, configuracoes basicas)
- Tour guiado tela a tela (tooltip walking)
- Checklist de setup ("Configure seu primeiro cliente", "Crie seu primeiro job")
- Templates pre-populados (categorias de custo, estrutura de equipe)
- Video curto (60s) de "como funciona"

#### B) Relatorios RASOS (Gravidade: ALTA)
**Problema:** A pagina de relatorios existe com 3 abas (financeiro, performance, equipe) e export CSV, mas falta profundidade analitica que CEO realmente quer ver.

**O que falta:**
- Comparativo mes-a-mes com grafico de evolucao
- Ranking de diretores por margem/faturamento
- Ranking de clientes por volume/rentabilidade
- Projecao de faturamento (pipeline CRM x taxa de conversao)
- Relatorio de horas extras (custo real vs orcado por job)
- Aging de contas a pagar/receber
- P&L por job (receita - custo real = margem REAL com todos os impostos)

#### C) Mobile INCOMPLETO (Gravidade: ALTA)
**Problema:** Tem bottom nav mobile e layout responsivo, mas o dia-a-dia do PE e coordenador acontece no SET DE FILMAGEM, de pe, com celular na mao. O sistema precisa funcionar impecavelmente nessa situacao.

**O que falta:**
- Acao rapida "Registrar Gasto" acessivel do bottom nav (1 toque)
- Diario de producao com upload de foto da camera (diretamente)
- Checklist de diaria acessivel offline (PWA com cache)
- Notificacoes push (PWA ou app wrapper)

#### D) Importacao de dados INEXISTENTE (Gravidade: ALTA)
**Problema:** Toda produtora ja tem dados em planilha. Sem importacao, nao tem migracao. Sem migracao, nao tem adocao.

**O que falta:**
- Importar fornecedores/equipe via CSV/Excel
- Importar clientes e agencias via CSV
- Importar historico de jobs (pelo menos nome, valor, status, datas)
- Importar categorias de custo de planilha existente

#### E) Busca Global AUSENTE (Gravidade: MEDIA)
**Problema:** Nao tem Ctrl+K / busca global. PE precisa navegar pelo sidebar pra achar um job especifico.

**O que falta:**
- Command palette (Ctrl+K ou icone de lupa)
- Busca por: jobs, clientes, agencias, pessoas, NFs
- Resultado instantaneo com preview inline

### 2.3 Features com "wow factor" para demo

| Feature | Wow Level | Por que impressiona |
|---------|-----------|---------------------|
| OCR de NF (upload PDF, IA le os dados) | 10/10 | "Upload a nota e ela preenche sozinha" — demo de 5 segundos que vende |
| Pipeline Kanban com status reais de producao | 8/10 | Screenshot perfeita pra slide de vendas |
| ELLA Copilot ("quais jobs estao atrasados?") | 9/10 | Demo ao vivo com conversa e impactante |
| Conciliacao bancaria (upload OFX) | 8/10 | CFO de produtora vai chorar de alegria |
| Portal do fornecedor (link publico) | 7/10 | "Manda o link pro freelancer e ele preenche tudo" |
| Carta orcamento gerada por IA | 8/10 | "IA escreve a carta pro cliente baseada nos custos" |
| Contratos batch (seleciona equipe, assina digital) | 8/10 | "Seleciona 15 pessoas, clica 1 botao, todos recebem contrato" |
| Claquete ANCINE (gera PDF/PNG automatico) | 6/10 | Nicho, mas quem precisa PRECISA MUITO |

---

## 3. O QUE FALTA PARA SER VENDAVEL

### 3.1 Features CRITICAS que bloqueiam venda

#### F1: Onboarding Guiado
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Abri e nao entendi nada. Fechei." |
| **Quem pediu** | Qualquer prospect no trial |
| **Tempo economizado** | Evita 100% do churn de primeira hora |
| **Wow factor** | Medio (esperado, mas nao ter e fatal) |
| **MVP** | Wizard de 5 passos: dados da produtora, primeiro cliente, primeiro job, tour de 60s, checklist |
| **Como medir** | Taxa de conclusao do onboarding, retention D7, D30 |
| **Esforco** | 3-5 dias dev |

#### F2: Importacao CSV/Excel
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Nao vou redigitar 300 fornecedores" |
| **Quem pediu** | Financeiro/Coordenador de toda produtora |
| **Tempo economizado** | 20-40 horas de digitacao manual |
| **Wow factor** | Baixo (esperado) |
| **MVP** | Upload CSV para: people (nome, funcao, CPF, banco, PIX), clients, cost categories. Mapeamento de colunas semi-automatico |
| **Como medir** | # importacoes completas, # registros importados, tempo de setup |
| **Esforco** | 3-4 dias dev |

#### F3: Busca Global (Command Palette)
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Onde esta o job do Itau que fiz mes passado?" |
| **Quem pediu** | PE (diariamente) |
| **Tempo economizado** | 2-5 min por busca, ~10 buscas/dia = 30-50 min/dia |
| **Wow factor** | Alto (parece magico pra quem usa planilha) |
| **MVP** | Ctrl+K com busca em jobs (code + title), clientes, pessoas. Resultado em <200ms |
| **Como medir** | Uso diario, cliques em resultado, tempo de sessao |
| **Esforco** | 2-3 dias dev |

#### F4: Pagina de Pricing/Planos
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Quanto custa?" — se nao tem resposta clara, perde o lead |
| **Quem pediu** | Qualquer prospect |
| **Tempo economizado** | N/A — e sobre conversao |
| **Wow factor** | Medio |
| **MVP** | Landing page com 3 planos, botao de trial, FAQ |
| **Como medir** | Taxa de conversao visitor→trial |
| **Esforco** | 2-3 dias dev |

### 3.2 Features que DIFERENCIAM (criam desejo)

#### D1: Alerta Inteligente de Margem em Tempo Real
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Descobri que perdi dinheiro so quando o job ja acabou" |
| **Quem pediu** | CEO/PE |
| **Tempo economizado** | Evita prejuizo real (R$5k-R$50k por job mal gerenciado) |
| **Wow factor** | 10/10 — ninguem faz isso |
| **MVP** | Badge vermelho no job quando margem cai abaixo de threshold configuravel. Notificacao in-app + WhatsApp. Trigger automatico quando custo real ultrapassa orcamento |
| **Como medir** | # alertas disparados, # acoes tomadas, evolucao da margem media |
| **Esforco** | 2-3 dias dev (logica ja existe no health_score trigger, falta a notificacao ativa) |

#### D2: "Clonar Job" com Templates Inteligentes
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Todo job do mesmo cliente tem a mesma estrutura, e eu recrio tudo do zero" |
| **Quem pediu** | PE/Coordenador |
| **Tempo economizado** | 1-2 horas por job (setup inicial) |
| **Wow factor** | 8/10 |
| **MVP** | Botao "Clonar Job" que copia: categorias de custo, equipe padrao, entregaveis padrao. Templates por tipo de projeto (filme publicitario, branded, etc.) |
| **Como medir** | # clones usados, tempo de setup do job |
| **Esforco** | 2 dias dev |

#### D3: Disponibilidade de Equipe (Calendar Heatmap)
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Preciso de um DOP pra semana que vem, quem esta livre?" |
| **Quem pediu** | PE (toda semana) |
| **Tempo economizado** | 30-60 min por alocacao (hoje e WhatsApp um por um) |
| **Wow factor** | 9/10 |
| **MVP** | Calendario visual mostrando quem esta alocado em qual job em qual dia. Filtro por funcao. Click pra convidar/alocar |
| **Como medir** | # conflitos de agenda evitados, tempo de resposta de alocacao |
| **Esforco** | 3-4 dias dev (ja tem calendario de diarias, falta a vista de disponibilidade) |

#### D4: WhatsApp como Canal de Aprovacao
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Mando email de aprovacao e o cara responde 3 dias depois" |
| **Quem pediu** | PE/Coordenador |
| **Tempo economizado** | 1-3 dias de ciclo de aprovacao |
| **Wow factor** | 10/10 — o CEO aprova pelo WhatsApp com um "Sim" |
| **MVP** | Aprovacao de pagamento envia WhatsApp com resumo + link de 1 clique. Resposta "1" = aprovado, "2" = rejeitado. Callback atualiza o sistema |
| **Como medir** | Tempo medio de aprovacao (antes/depois), taxa de resposta |
| **Esforco** | 3-5 dias dev (integracao Z-API ja existe, falta o fluxo) |

### 3.3 Features "low effort, high impact"

| Feature | Esforco | Impacto | Descricao |
|---------|---------|---------|-----------|
| **Duplicar Cost Item** | 2h | Alto | Botao "duplicar" na linha do custo. PE copia item similar e muda valor |
| **Atalhos de teclado** | 4h | Medio | N pra novo job, E pra editar, Ctrl+K pra buscar |
| **Favoritar Jobs** | 3h | Alto | Estrela no job, filtro "meus favoritos" no topo. PE trabalha em 3-5 jobs ao mesmo tempo |
| **Status do job no titulo da aba** | 1h | Baixo | Tab do browser mostra "JOB-038 Pos-Producao" |
| **Cores por status na sidebar** | 2h | Medio | Job em filmagem = dot vermelho, job finalizado = dot verde |
| **Print-friendly para financeiro** | 4h | Alto | Ctrl+P nas telas financeiras gera layout limpo pra impressao |
| **Exportar PDF de custos do job** | 1 dia | Alto | Gera PDF com todos os custos, totais, margens. PE manda pro cliente/socio |

---

## 4. IDEIAS NOVAS E CRIATIVAS

### 4.1 Inteligencia Artificial — dia-a-dia da produtora

#### IA-1: Previsao de Margem com Base no Historico
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Quanto vai custar esse tipo de job na real?" |
| **Quem pediu** | CEO/PE |
| **Tempo economizado** | Evita subestimar orcamento (erro de R$20k-R$100k) |
| **Wow factor** | 10/10 |
| **MVP** | Ao criar job, ELLA analisa jobs passados do mesmo tipo/cliente/diretor e sugere: "Jobs similares custaram em media R$X, com margem de Y%. Recomendo orcar Z." Usa dados reais do tenant |
| **Como medir** | Precisao da previsao vs realizado, adocao da sugestao |

#### IA-2: Resumo Semanal Automatico por Email/WhatsApp
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Nao tenho tempo de abrir o sistema toda hora" |
| **Quem pediu** | CEO |
| **Tempo economizado** | CEO nao precisa entrar no sistema pra saber o status geral |
| **Wow factor** | 9/10 |
| **MVP** | Todo domingo as 20h, ELLA manda email/WhatsApp: "Esta semana: 3 jobs em filmagem, 2 pagamentos pendentes, margem media 28%. Alertas: Job X estourou orcamento em 12%." CRON job + template |
| **Como medir** | Taxa de abertura, reducao de logins "so pra checar" |

#### IA-3: Sugestao de Equipe Baseada em Performance
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Quem e o melhor DOP disponivel pra esse tipo de job?" |
| **Quem pediu** | PE |
| **Tempo economizado** | 30 min de WhatsApp pra cada posicao |
| **Wow factor** | 9/10 |
| **MVP** | Ao montar equipe do job, ELLA sugere top 3 profissionais por funcao baseado em: disponibilidade, historico de jobs similares, cache medio, avaliacao (futura). Ja tem `ai-freelancer-match` — precisa melhorar com dados reais |
| **Como medir** | # sugestoes aceitas, satisfacao do PE |

#### IA-4: Deteccao Automatica de Custos Anomalos
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "Pagamos R$15k de Uber num job que era pra custar R$2k de transporte" |
| **Quem pediu** | CEO/Financeiro |
| **Tempo economizado** | Previne desperdicio real |
| **Wow factor** | 9/10 |
| **MVP** | ELLA compara cada categoria de custo com a media historica para jobs do mesmo tipo. Se transporte de um job esta 3x acima da media, alerta. Badge amarelo no cost item + notificacao |
| **Como medir** | # anomalias detectadas, $ economizado |

#### IA-5: Geracao Automatica de Briefing Estruturado
| Aspecto | Detalhe |
|---------|---------|
| **Dor que resolve** | "O atendimento manda briefing por email/WhatsApp, cada um de um jeito" |
| **Quem pediu** | PE/Coordenador |
| **Tempo economizado** | 30 min de organizacao por job |
| **Wow factor** | 8/10 |
| **MVP** | PE cola texto livre (email/WhatsApp do cliente) no campo de briefing. ELLA extrai: produto, marca, agencia, pecas, duracao, datas, orcamento estimado. Pre-preenche campos do job |
| **Como medir** | # campos auto-preenchidos, tempo de criacao do job |

### 4.2 Automacoes que economizam horas reais

#### AUT-1: "Job Fechou" — Automacao em Cascata
**Trigger:** Status do job muda para "aprovado_selecao_diretor"
**Acoes automaticas:**
1. Cria estrutura de pastas no Google Drive
2. Gera contratos batch pra equipe confirmada
3. Manda WhatsApp pro diretor com resumo do job
4. Cria calendario de producao com datas sugeridas
5. Gera aprovacao interna PDF

**Economia:** 2-4 horas de trabalho manual por job
**Wow factor:** 10/10 — o PE aprova o job e TUDO acontece sozinho

#### AUT-2: "Fornecedor Nao Mandou NF" — Lembrete Escalonado
**Trigger:** NF pendente ha X dias
**Acoes automaticas:**
1. Dia 3: Email gentil automatico pro fornecedor
2. Dia 7: Segundo email + WhatsApp
3. Dia 14: Notificacao pro PE "Fornecedor X nao mandou NF ha 14 dias"
4. Dia 30: Flag vermelho no dashboard "Risco fiscal"

**Economia:** 1-2 horas/semana de cobranca manual
**Wow factor:** 8/10

#### AUT-3: Callsheet Automatica
**Trigger:** 48h antes de diaria de filmagem
**Acoes automaticas:**
1. Compila dados: locacao, horario, equipe, equipamentos, contatos
2. Gera PDF da callsheet
3. Envia por WhatsApp/email pra toda a equipe do job
4. Pede confirmacao de presenca

**Economia:** 1-2 horas por diaria (coordenador faz isso manualmente)
**Wow factor:** 9/10 — e a feature que TODO PE sonha

### 4.3 Dashboards e metricas que CEOs matariam pra ter

#### DASH-1: P&L por Job (Demonstrativo de Resultado)
- Receita bruta do job
- (-) Impostos (ISS, IR, CSLL, PIS, COFINS — configuravel por regime tributario)
- (=) Receita liquida
- (-) Custos diretos por categoria (equipe, locacao, equipamento, etc.)
- (-) Custos indiretos rateados (aluguel, salarios fixos)
- (=) Margem de contribuicao
- Comparativo com orcamento original
- Variancia por categoria

**Wow factor:** 10/10 — NENHUM sistema audiovisual mostra isso. A produtora hoje faz no Excel se faz.

#### DASH-2: Ranking de Rentabilidade
- Top 10 clientes por margem media
- Top 10 diretores por margem media
- Top 10 tipos de job por margem
- Evolucao mensal (grafico de linha)
- "Se fizessemos so jobs tipo X com diretor Y, a margem seria Z%"

**Wow factor:** 9/10

#### DASH-3: Cash Flow Projetado
- Receitas previstas (parcelas a receber)
- Despesas previstas (pagamentos agendados)
- Saldo projetado dia-a-dia (proximo 30/60/90 dias)
- Alerta: "No dia 15/04 o saldo vai ficar negativo em R$X"

**Wow factor:** 10/10 — dono de produtora VIVE de fluxo de caixa

#### DASH-4: Utilizacao de Equipe
- Heatmap mensal: quem trabalhou quantos dias
- Taxa de ocupacao por pessoa (dias alocados / dias uteis)
- Freelancers mais usados (frequencia + valor total pago)
- "Freelancers que voce nao usa ha 6 meses" (reativacao)

**Wow factor:** 8/10

---

## 5. ESTRATEGIA DE GO-TO-MARKET

### 5.1 Posicionamento

**Tagline:** "O sistema que entende produtora. De verdade."

**Mensagem central:** O ELLAHOS substitui a planilha do Google, o Apps Script caseiro, o Trello abandonado e os 50 WhatsApps por dia. Tudo num lugar so, com IA que entende producao audiovisual.

**Diferencial em uma frase:** "Feito POR uma produtora que cansou de planilha. PRA produtoras que cansaram tambem."

### 5.2 Pricing sugerido

| Plano | Publico | Preco/mes | Inclui |
|-------|---------|-----------|--------|
| **Starter** | Produtoras ate 20 jobs/ano | R$497/mes | 5 usuarios, 20 jobs ativos, financeiro basico, CRM, IA (100 msgs/mes) |
| **Pro** | Produtoras mid-market | R$997/mes | 15 usuarios, jobs ilimitados, financeiro completo, integracao Drive/DocuSeal/WhatsApp, IA ilimitada, relatorios |
| **Enterprise** | Produtoras grandes | R$1.997/mes | Usuarios ilimitados, multi-marca (subtenant), SLA, onboarding dedicado, API acesso |

**Justificativa:**
- R$997/mes e MENOS que o salario de meio estagiario de producao
- Se economizar 20h/mes da PE (conservador), o ROI e positivo em 2 semanas
- Concorrentes internacionais cobram $300-$500 USD/mes (~R$1.500-R$2.500)
- Plano anual: 20% desconto (R$797/mes Pro)

**Trial:** 14 dias gratis no plano Pro, sem cartao. Onboarding assistido (call de 30 min).

### 5.3 Canal de vendas

**Fase 1 (Primeiros 10 clientes — 0 a 60 dias):**
1. **Venda direta CEO-to-CEO** — O Danillo (CEO, fundador de produtora) liga/encontra outros donos de produtora. A historia "eu fiz pra mim, agora funciona pra voce" e imbativel
2. **Demo ao vivo personalizada** — 30 min, screen share, mostra dados REAIS (da Ellah Filmes). Nao mostra template vazio
3. **Indicacao da rede pessoal** — Produtoras se conhecem. 1 produtora usando = 3-5 sabendo
4. **Evento presencial pequeno** — Cafe com 5-10 donos de produtora, demo ao vivo, Q&A. SP e RJ
5. **APRO (Associacao Brasileira de Produtoras)** — Apresentar no proximo encontro/congresso

**Fase 2 (10-50 clientes — 60 a 180 dias):**
1. **Case study da Ellah Filmes** — Publicar numeros reais: "Reduzimos tempo de fechamento financeiro de 5 dias pra 4 horas"
2. **LinkedIn do CEO** — Posts semanais sobre dores de produtora + como resolveu. Conteudo tecnico-pratico
3. **Parceria com contadores de produtoras** — Contador recomenda ferramenta que facilita a vida dele
4. **Free trial self-service** — Landing page + signup + onboarding automatico
5. **Webinar mensal** — "Como saber a margem real dos seus jobs" (tema = dor, produto = solucao)

**Fase 3 (50-200 clientes — 6 a 12 meses):**
1. **Partner com agencias de publicidade** — Agencia recomenda ELLAHOS pras produtoras parceiras (incentivo: visibilidade dos dados do job)
2. **Integracao com softwares de agencia** (Operand, Studio RZ)
3. **Programa de indicacao** — "Indique 1 produtora, ganhe 1 mes gratis"
4. **SEO + Conteudo** — Blog com artigos sobre gestao de produtora, templates de orcamento, guias ANCINE

### 5.4 Pitch de 3 minutos (script)

> "Voce ja abriu aquela planilha de custos do job e descobriu que a margem era 8% quando voce vendeu prometendo 25%? Ja mandou 30 WhatsApps cobrando nota fiscal de fornecedor? Ja perdeu um contrato porque o DOP estava alocado num job que ninguem sabia?
>
> A gente passou por TUDO isso na Ellah Filmes. E construiu o ELLAHOS.
>
> [Demo ao vivo — 90 segundos]
> 1. Mostra dashboard com KPIs reais
> 2. Abre um job, mostra custos com margem em tempo real
> 3. Faz upload de uma NF, IA preenche os dados
> 4. Pergunta pra ELLA: 'quais jobs estao com margem abaixo de 20%?'
>
> O ELLAHOS substitui sua planilha, seu Trello, e 50 WhatsApps por dia. E feito por produtora, pra produtora. Tem IA, tem financeiro de verdade, e funciona no celular no set de filmagem.
>
> 14 dias gratis. A gente migra seus dados em 1 hora. Se em 14 dias voce nao sentir a diferenca, cancela sem custo."

### 5.5 Onboarding ideal (primeiros 60 minutos)

**Minuto 0-5: Signup e Setup**
- Nome da produtora, CNPJ, logo
- Escolher regime tributario (Simples, Lucro Presumido, Real)
- Adicionar usuarios (email + role)

**Minuto 5-15: Importar dados**
- Upload CSV de fornecedores/equipe (ou preencher 5 manualmente)
- Cadastrar 3 clientes principais
- Cadastrar 2 agencias parceiras

**Minuto 15-25: Primeiro Job**
- Tour guiado: "Vamos criar seu primeiro job"
- Pre-preenche com dados de exemplo se quiser
- Mostra pipeline, muda status, explica cada um

**Minuto 25-35: Financeiro**
- Adicionar 3 custos no job
- Ver dashboard de margem atualizar em tempo real
- Upload de NF teste (mostra OCR)

**Minuto 35-45: IA**
- Abrir ELLA, perguntar "qual a margem desse job?"
- Mostra que ela sabe responder

**Minuto 45-60: Wrap-up**
- Configurar integracoes (Drive, opcionalmente)
- Mostrar checklist de setup restante
- Agendar call de follow-up em 3 dias

---

## 6. PRIORIDADES DE IMPLEMENTACAO

### 6.1 AGORA — Proximo sprint (1-2 semanas)

| # | Feature | Esforco | Impacto | Justificativa |
|---|---------|---------|---------|---------------|
| 1 | **Onboarding wizard** (setup produtora + tour guiado) | 4 dias | Critico | Sem isso, nao tem trial. Sem trial, nao tem venda |
| 2 | **Busca global (Ctrl+K)** | 2 dias | Alto | Usabilidade basica que TODA PE precisa |
| 3 | **Importacao CSV** (people + clients) | 3 dias | Critico | Sem importacao, migracao nao acontece |
| 4 | **Landing page + Pricing** | 2 dias | Critico | Precisa existir pra vender. Pode ser estatica, simples |
| 5 | **Alerta de margem em tempo real** | 2 dias | Alto | Diferencial matador pra demo |
| 6 | **Clonar Job** | 1 dia | Alto | Economiza horas, facil de fazer |

**Total: ~14 dias de dev = 1 sprint**

### 6.2 Em 30 dias

| # | Feature | Esforco | Impacto | Justificativa |
|---|---------|---------|---------|---------------|
| 7 | **P&L por job** (demonstrativo completo) | 4 dias | Alto | Argumento de venda para CEO |
| 8 | **Cash flow projetado** | 3 dias | Alto | Argumento de venda para financeiro |
| 9 | **Resumo semanal por email/WhatsApp** (IA) | 3 dias | Alto | Engagement sem precisar logar |
| 10 | **Disponibilidade de equipe** (calendar heatmap) | 4 dias | Alto | Feature que PE sonha |
| 11 | **Callsheet automatica** | 4 dias | Alto | Feature que PE sonha x2 |
| 12 | **WhatsApp aprovacao** (1-click approve) | 4 dias | Alto | Reduz ciclo de aprovacao de dias pra minutos |
| 13 | **Relatorios profundos** (ranking por diretor/cliente/margem) | 3 dias | Medio | CEO quer ver isso no segundo mes |

**Total: ~25 dias de dev = 1.5 sprint**

### 6.3 Em 90 dias

| # | Feature | Esforco | Impacto | Justificativa |
|---|---------|---------|---------|---------------|
| 14 | **Previsao de margem por IA** (historico → predicao) | 5 dias | Altissimo | Diferencial unico no mundo |
| 15 | **PWA com modo offline** | 5 dias | Alto | Set de filmagem sem internet |
| 16 | **Callsheet + Check-in de equipe** | 4 dias | Alto | Operacao de set completa |
| 17 | **Modulo de casting** (banco de atores/modelos) | 5 dias | Medio | Diferencial competitivo |
| 18 | **API publica** (pra agencias consultarem status) | 4 dias | Medio | Enterprise feature |
| 19 | **Multi-marca** (sub-tenants) | 3 dias | Medio | Enterprise: grupo com 3 produtoras |
| 20 | **Deteccao de custos anomalos** (IA) | 3 dias | Alto | Prevenção de desperdicio |
| 21 | **Integracao bancaria** (Open Banking BR) | 5 dias | Alto | Elimina upload manual OFX |
| 22 | **Fase 12 LangGraph** (multi-agente) | 15 dias | Altissimo | Transformacao da proposta de valor |

**Total: ~49 dias de dev = 3 sprints**

---

## 7. ANALISE COMPETITIVA RESUMIDA

| Criterio | ELLAHOS | Yamdu | StudioBinder | Monday.com | Planilha Google |
|----------|---------|-------|-------------|------------|-----------------|
| Financeiro real (margem, NF, pagamentos) | **SIM** | Basico | NAO | NAO | Manual |
| Pipeline de producao audiovisual | **SIM** | SIM | SIM | Generico | Manual |
| IA integrada | **SIM** | NAO | NAO | Basico | NAO |
| Integracao WhatsApp | **SIM** | NAO | NAO | NAO | NAO |
| OCR de NF | **SIM** | NAO | NAO | NAO | NAO |
| Contratos digitais | **SIM** | NAO | NAO | NAO | NAO |
| CRM nativo | **SIM** | NAO | NAO | SIM | NAO |
| Claquete ANCINE | **SIM** | NAO | NAO | NAO | Manual |
| Preco BR justo | **SIM** | Caro (USD) | Caro (USD) | Caro | Gratis |
| Em portugues | **SIM** | Nao | Nao | Sim | Sim |
| Entende fluxo BR | **SIM** | NAO | NAO | NAO | Depende de quem fez |

**Conclusao:** O ELLAHOS nao tem concorrente direto no Brasil. O concorrente real e a inertia + a planilha.

---

## 8. RISCOS E MITIGACOES

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| PE de 55 anos nao consegue usar | Alta | Fatal | Onboarding guiado + UX testada com usuarios reais + suporte WhatsApp |
| "Minha planilha funciona" | Alta | Alto | Demo com dados reais mostrando margem errada na planilha vs real no ELLAHOS |
| Churn alto no primeiro mes | Media | Alto | Onboarding assistido + check-in dia 3, 7, 14 + metrica de adocao por feature |
| Suporte 1:1 nao escala | Alta | Medio | Video tutoriais + FAQ + chatbot (ELLA) + community (futuro) |
| Competidor com funding lanca | Baixa | Alto | Velocidade de execucao + relacionamento com mercado + dados acumulados dos clientes |
| Dependencia do Groq free tier | Media | Medio | Fallback pra Llama local ou Claude Haiku. Custo de IA e <R$50/mes por tenant mesmo pagando |

---

## 9. METRICAS DE SUCESSO (North Star)

### Metricas de produto
- **Retention D30:** >70% (produtora que experimentou 30 dias e continua usando)
- **DAU/MAU:** >40% (usuarios ativos todo dia vs mensalmente)
- **Tempo pra primeiro valor:** <15 min (do signup ate ver margem de um job)
- **NPS:** >40 (medido no dia 30)

### Metricas de negocio
- **MRR meses 1-3:** R$5-10k (5-10 clientes pagando)
- **MRR mes 6:** R$30-50k (30-50 clientes)
- **MRR mes 12:** R$100-200k (100-200 clientes)
- **CAC:** <R$2.000 (custo de aquisicao por cliente)
- **LTV:** >R$24.000 (ticket medio R$1.000/mes x 24 meses)
- **LTV/CAC:** >12x

### Metricas de impacto
- **Horas economizadas por PE/mes:** >20h (validar com clientes reais)
- **Reducao de tempo de fechamento financeiro:** de 5 dias para <1 dia
- **NFs pendentes apos 30 dias:** <5% (vs 30%+ com planilha)

---

## 10. CONCLUSAO — VEREDICTO DIRETO

**O ELLAHOS e o produto certo, pro mercado certo, na hora certa.**

O que ja existe tem profundidade que nenhum concorrente tem. Financeiro real, IA, integracao WhatsApp, OCR de NF, contratos digitais, CRM — tudo num sistema feito por quem vive o dia-a-dia de produtora.

**O que impede de vender HOJE sao 4 coisas:**
1. Onboarding (nao tem)
2. Importacao de dados (nao tem)
3. Landing page com pricing (nao tem)
4. Busca global (nao tem)

**Resolvendo essas 4, da pra comecar a vender em 2 semanas.**

O diferencial competitivo esta claro: ninguem no Brasil (nem no mundo) tem um sistema audiovisual com IA integrada que entende producao, financeiro real com OCR, e WhatsApp nativo. Isso e defensavel e escalavel.

**A recomendacao e: parar de construir features novas e focar 100% em tornar o que existe vendavel.** Depois que tiver 10 clientes pagando, as features novas vem guiadas pelo feedback real.

O mercado e de R$500k-R$2M ARR so com produtoras publicitarias. Se expandir pra produtoras de conteudo, documentario, e eventos, multiplica por 5x.

**Proximo passo: Sprint de 2 semanas focado em "vendabilidade" (onboarding, importacao, busca, landing page). Depois, ligar pro primeiro prospect.**
