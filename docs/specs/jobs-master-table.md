# Spec: Tabela Master de Jobs

**Data:** 2026-02-13  
**Status:** Refinado - Respostas do CEO incorporadas  
**Autor:** Product Manager - ELLAHOS

---

## 1. Objetivo

A Tabela Master de Jobs é o coração do ELLAHOS. Ela centraliza todos os projetos audiovisuais da produtora em uma visão única, permitindo que diferentes áreas (Produção, Financeiro, Atendimento, Comercial) gerenciem o ciclo completo de um projeto - desde o briefing inicial até a entrega final e fechamento financeiro.

### Problemas que resolve
- **Descentralização de informação**: Produtoras usam planilhas Excel fragmentadas, e-mails e WhatsApp para gerenciar jobs. Informações críticas se perdem.
- **Falta de visibilidade**: Diretor não sabe status de pré-produção, Financeiro não sabe margem real dos projetos, Atendimento não sabe se entrega vai atrasar.
- **Gargalos invisíveis**: Sem visão consolidada, impossível identificar jobs atrasados, equipe sobrecarregada, ou problemas de fluxo de caixa.
- **Retrabalho**: Cada área cria sua própria planilha. Mesma informação duplicada 5x.
- **Limitações do Google Sheets**: Sistema atual da Ellah usa Apps Script + Sheets como banco de dados, tornando difícil escalabilidade e features avançadas.

### Benefícios esperados
- Visão única e em tempo real de todos os jobs da produtora
- Rastreabilidade completa do lifecycle de cada projeto
- Base sólida para integração com Financeiro, Contratos, Equipe, Produção
- Redução de 70% no tempo gasto procurando informação sobre um job
- Tomada de decisão baseada em dados (quais jobs dão lucro, quais atrasam, quais clientes são recorrentes)
- Preservação do fluxo atual da Ellah (nomenclatura, pastas, documentos) com melhorias modernas
- Health Score automático para cada job (0-100 pts)
- Versionamento de orçamentos e entregáveis
- Notificações via WhatsApp (canal primário) + in-app

---

## 2. Personas

### 2.1 Produtor Executivo (PE)
**Responsabilidades:**  
- Aprovar viabilidade comercial e operacional de novos jobs
- Alocar equipe e recursos
- Garantir que jobs entreguem no prazo e na margem esperada (meta: 30%)
- Tomar decisões estratégicas (aceitar job de margem baixa? negociar prazo?)

**Principais dores:**  
- Não tem visão consolidada de quantos jobs estão rolando simultaneamente
- Não sabe quais estão atrasados ou com problema de margem
- Perde tempo em reuniões perguntando "cadê o status do job X?"

---

### 2.2 Coordenador de Produção
**Responsabilidades:**  
- Gerenciar execução operacional do job (pré-produção, filmagem, pós)
- Coordenar equipe técnica e fornecedores
- Atualizar status, datas e entregáveis
- Garantir que checklist de pré-produção seja cumprido

**Principais dores:**  
- Planilhas desatualizadas (nunca sabe se info está correta)
- Informação espalhada (briefing no e-mail, cronograma no Google Sheets, contatos no WhatsApp)
- Dificuldade para reportar status para PE ou cliente

---

### 2.3 Diretor / Head de Criação
**Responsabilidades:**  
- Definir conceito criativo e execução artística
- Participar de pré-produção (casting, locação, decupagem)
- Aprovar entregas finais

**Principais dores:**  
- Não sabe quando começa pré-produção ou data de filmagem com antecedência
- Informações de briefing chegam incompletas ou desatualizadas
- Dificuldade para planejar agenda (quais jobs estão confirmados vs em negociação?)

---

### 2.4 Financeiro
**Responsabilidades:**  
- Acompanhar orçamento aprovado vs custo real
- Calcular margem e rentabilidade
- Gerenciar fluxo de caixa (quando entra pagamento do cliente, quando saem custos)
- Emitir NFs e controlar recebimentos

**Principais dores:**  
- Não sabe quanto cada job custou de verdade até semanas após finalização
- Orçamento aprovado em PDF. Custos reais em planilha separada. Margem calculada manualmente.
- Impossível prever fluxo de caixa sem saber datas de entrega e faturamento

---

### 2.5 Atendimento / Comercial
**Responsabilidades:**  
- Relacionamento com cliente e agência
- Enviar PPM (Pré-Produção Meeting), relatórios de status
- Negociar prazos e escopo
- Prospectar novos jobs
- Criar documento "Aprovação Interna" quando job é fechado

**Principais dores:**  
- Cliente pergunta status e precisa checar com 3 pessoas diferentes
- Não sabe histórico de jobs anteriores com aquele cliente (quantos fizemos? qual margem média?)
- Informações contratuais (PO, aprovações) em e-mails perdidos

---

## 3. User Stories

### US-001: Visualizar todos os jobs ativos
**Como** Produtor Executivo  
**Quero** ver uma tabela com todos os jobs em andamento (desde orçamento até finalização)  
**Para** ter visão consolidada da operação e identificar rapidamente jobs com problema

**Critérios de aceite:**
- Tabela exibe colunas essenciais (baseadas na master atual da Ellah):
  - INDEX, NUMERO DO JOB (JOB_ABA), NOME DO JOB, AGENCIA, CLIENTE
  - VALOR FECHADO, DIRETOR, PRODUTOR EXECUTIVO, DATA DE ENTREGA FINAL
  - FASE, STATUS, TIPO DE PROJETO, TIPO DE MÍDIA, NÍVEL COMPLEXIDADE, AUDIO
  - Valor Produção, Valor Imposto, Valor W, Valor Líquido (colunas financeiras)
  - URLs diretos para: Carta Orçamento, Cronograma, Roteiro, PPM, Planilha GG_
- Posso filtrar por Status, Cliente, Produtor, Período
- Posso ordenar por qualquer coluna
- Jobs aparecem em tempo real (se Coordenador atualiza status, vejo imediatamente via Supabase Realtime)
- Visualização padrão mostra TODOS os jobs ativos (não apenas "meus jobs")

---

### US-002: Criar novo job
**Como** Coordenador de Produção  
**Quero** criar um novo job no sistema com informações básicas do briefing  
**Para** centralizar todas as informações desde o início do projeto

**Critérios de aceite:**
- Formulário de criação solicita campos obrigatórios: Título, Cliente, Tipo de Projeto, Status inicial
- Sistema gera automaticamente:
  - INDEX sequencial por tenant (001, 002, 003...)
  - NUMERO DO JOB (JOB_ABA) no formato `{INDEX padded 3 dígitos}_{nomeJob}_{agencia}`
  - Exemplo: `015_FilmeBBB_WMcCann`
- Posso adicionar campos opcionais: Agência, Marca, Briefing, Data de Entrega estimada
- Ao salvar, job aparece na tabela master
- Registro de auditoria: quem criou, quando
- Sistema cria estrutura de pastas no Google Drive automaticamente (via API)
- Webhook callback para n8n (ia.ellahfilmes.com)
- **Mobile:** Pode criar jobs pelo celular (PWA + opcionalmente via WhatsApp com Z-API/Evolution API)

---

### US-003: Atualizar status do job
**Como** Coordenador de Produção  
**Quero** mudar o status do job conforme ele avança no lifecycle  
**Para** manter visibilidade do progresso para toda equipe

**Critérios de aceite:**
- Posso alterar status clicando no job e selecionando novo status em dropdown
- Status disponíveis (14 status, baseados na resposta do CEO):
  1. Briefing Recebido
  2. Orçamento em Elaboração
  3. Orçamento Enviado
  4. Aguardando Aprovação Cliente
  5. Aprovado - Seleção de Diretor
  6. Cronograma/Planejamento
  7. Pré-Produção em Andamento
  8. Produção/Filmagem
  9. Pós-Produção (sub-status: Edição, Cor, Finalização, VFX)
  10. Aguardando Aprovação Final
  11. Entregue
  12. Finalizado (Financeiro Fechado)
  13. Cancelado
  14. Pausado
- Produtoras podem customizar: renomear status, adicionar novos (customização por tenant)
- Sistema registra histórico de mudanças de status
- Notificação PARA TODOS via WhatsApp quando job muda para "Aprovado - Seleção de Diretor"

---

### US-004: Vincular cliente e agência ao job
**Como** Atendimento  
**Quero** registrar qual Cliente (anunciante) e Agência estão vinculados ao job  
**Para** ter histórico de relacionamento e facilitar comunicação

**Critérios de aceite:**
- Campo Cliente é obrigatório (dropdown com clientes cadastrados ou opção "Criar novo cliente")
- Campo Agência é opcional (alguns jobs são direto com anunciante)
- Ao selecionar Cliente ou Agência, sistema preenche automaticamente contatos principais
- Posso ver histórico de jobs anteriores daquele Cliente/Agência (últimos 5 anos)

---

### US-005: Definir equipe do job
**Como** Produtor Executivo  
**Quero** alocar equipe ao job (Diretor, Produtor Executivo, Coordenador, DoP, etc)  
**Para** deixar claro quem é responsável por cada frente

**Critérios de aceite:**
- Posso adicionar múltiplos membros de equipe ao job
- Para cada membro: Função, Nome, Cache, Status (Confirmado, Orçado, Proposta Enviada)
- Campo "Produtor Responsável" (obrigatório) define quem é o dono operacional do job
- Sistema ALERTA (não bloqueia) quando diretor está em 2 jobs simultâneos
- Alerta vai para PE, Coordenador E Diretor
- Exceção: Mesmo cliente pode ter 2 projetos simultâneos com mesmo diretor
- Gera formulário Google Forms automaticamente para cadastro de equipe (vinculado à planilha EQUIPE_DO_JOB)
- Health Score: +10 pts quando Diretor e PE são definidos

---

### US-006: Registrar datas importantes
**Como** Coordenador de Produção  
**Quero** cadastrar todas as datas críticas do job  
**Para** ter visão clara de timeline e evitar atrasos

**Critérios de aceite:**
- Campos disponíveis: Briefing, Envio Orçamento, Aprovação, PPM, Filmagem (múltiplas), Pós, Entrega
- Sistema calcula status: No Prazo, Atrasado, Em Risco
- Calendário visual mostra jobs agendados
- Alertas automáticos antes de datas críticas
- Health Score: +10 pts por data definida (entrega, pagamento)

---

### US-007: Acompanhar orçamento e custo real
**Como** Financeiro  
**Quero** ver orçamento aprovado vs custo real acumulado do job  
**Para** acompanhar margem e rentabilidade em tempo real

**Critérios de aceite:**
- Campos financeiros (replicando sistema atual da Ellah):
  - **Valor Fechado:** Quanto o cliente vai pagar
  - **Valor Produção:** Custo real (importado da planilha GG_ ou lançado no ELLAHOS)
  - **Valor Imposto:** 12% fixo do valor fechado
  - **Valor W:** Lucro bruto = Fechado - Produção - Imposto - L
  - **Valor Líquido:** Lucro final
- Margem Real % com código de cores:
  - Verde: >= 30% (meta)
  - Amarelo: < 30% e >= 15% (atenção)
  - Vermelho: < 15% (alerta crítico)
- Margem NÃO varia por tipo de projeto
- Link para detalhamento de custos na planilha GG_ ou módulo Financeiro do ELLAHOS

---

### US-008: Classificar tipo de projeto
**Como** Produtor Executivo  
**Quero** classificar cada job por Tipo, Formato e Segmento  
**Para** analisar quais tipos de job são mais rentáveis

**Critérios de aceite:**
- Tipo de Projeto: Filme Publicitário, Branded Content, Videoclipe, Documentário, Digital, Evento, etc
- Formato: 15", 30", 60", Série, Social Media
- Segmento: Automotivo, Varejo, Fintech, Alimentos, Moda, Tech, Saúde
- Campo adicional: TIPO DE MÍDIA, NÍVEL DE COMPLEXIDADE, AUDIO (baseados na master atual)
- Filtros e dashboard de distribuição por tipo

---

### US-009: Registrar entregáveis
**Como** Coordenador de Produção  
**Quero** listar todos os entregáveis do job  
**Para** garantir que nada será esquecido na entrega final

**Critérios de aceite:**
- Múltiplos entregáveis: Descrição, Formato, Resolução, Duração, Status
- Checklist visual de pendentes vs entregues
- Alerta se entrega próxima com pendências
- Entregáveis podem ter versões (v1, v2 com correções)
- Links Google Drive ou Dropbox para download
- Frame.io usado para review na pós (não entrega final)
- Status "Entregue" do job requer pelo menos 1 entregável entregue

---

### US-010: Adicionar observações e tags
**Como** Coordenador de Produção  
**Quero** adicionar notas e tags ao job  
**Para** registrar informações importantes ou facilitar busca

**Critérios de aceite:**
- Campo "Observações" com texto rico
- Tags customizáveis (#urgente, #refilmagem, #cliente-vip)
- Filtro por tags

---

### US-011: Duplicar job (criação baseada em template)
**Como** Atendimento  
**Quero** criar job a partir de template ou estrutura base  
**Para** agilizar criação de jobs recorrentes

**Critérios de aceite:**
- Ellah NÃO duplica jobs no sentido tradicional
- Sistema oferece "template de estrutura" que cria:
  - Estrutura de pastas no Drive (via Apps Script `copiarPastaBaseAdm`)
  - Planilha GG_ do zero
  - Formulários de cadastro
- NÃO copia: Código, Status, Datas, Valores, Anexos

---

### US-012: Arquivar / Cancelar job
**Como** Produtor Executivo  
**Quero** marcar jobs como Cancelados ou Arquivados  
**Para** limpar visualização sem perder histórico

**Critérios de aceite:**
- Status "Cancelado" com motivo obrigatório
- **Custos incorridos NUNCA são zerados** (ficam registrados)
- Se houver cláusula contratual, registrar taxa de cancelamento como receita
- Documento "Aprovação de Cancelamento" gerado pelo sistema
- Jobs arquivados não aparecem por padrão (filtro "Mostrar arquivados")
- Possibilidade de reativar job arquivado
- Histórico preservado por 5 anos
- SEMPRE soft delete (nunca exclusão permanente)

---

### US-013: Buscar e filtrar jobs
**Como** qualquer usuário  
**Quero** buscar jobs por múltiplos critérios  
**Para** encontrar rapidamente informação específica

**Critérios de aceite:**
- Busca textual em: Código (JOB_ABA), Título, Cliente, Agência, Produtor
- Filtros: Status, Cliente, Produtor, Tipo, Período, Margem, Tags
- Filtros favoritos salvos por usuário
- Performance <500ms para 500+ jobs
- Volume esperado: 4-20 jobs simultâneos, 10-15/ano (Ellah atual), até 15-20 simultâneos no futuro

---

### US-014: Exportar lista de jobs
**Como** Produtor Executivo  
**Quero** exportar tabela master para Excel/PDF  
**Para** usar em reuniões ou relatórios

**Critérios de aceite:**
- Formatos: Excel, CSV, PDF
- Respeita filtros ativos
- Seleção de colunas
- Timestamp e filtros no cabeçalho
- Export mantém formatação (datas, moeda, margens coloridas)

---

### US-015: Ver histórico completo do job
**Como** qualquer usuário  
**Quero** ver timeline de tudo que aconteceu no job  
**Para** entender evolução e identificar mudanças

**Critérios de aceite:**
- Timeline: mudanças de status, valores, equipe, datas, comentários
- Ordenação cronológica reversa
- Filtro por tipo de evento
- Histórico imutável
- Jobs podem ser editados APÓS finalização (ex: ajustar custo real, edição pós-entrega gera custo extra)
- Manter jobs visíveis por 5 anos

---

### US-016: Criar sub-jobs (hierarquia de 2 níveis)
**Como** Coordenador de Produção  
**Quero** criar sub-jobs dentro de um job pai  
**Para** gerenciar campanhas complexas

**Critérios de aceite:**
- Ellah trata como 1 job com vários entregáveis (padrão)
- Para campanhas grandes: suportar 2 níveis de hierarquia (Job Pai → Sub-job → Sub-sub-job)
- Sub-jobs herdam Cliente, Agência, Equipe base (sobrescrevível)
- Sub-jobs têm próprios: Status, Datas, Orçamento (pode ser independente), Entregáveis
- Hierarquia visual expansível
- Orçamento do Job Pai = soma dos sub-jobs (quando aplicável)

---

### US-017: Notificações e alertas
**Como** Produtor Executivo  
**Quero** receber alertas automáticos sobre jobs críticos  
**Para** agir proativamente

**Critérios de aceite:**
- Notificações:
  - Job aprovado → TODOS recebem (Diretor, PE, Coordenador, Atendimento, Financeiro)
  - Job atrasado → PE e Coordenador
  - Margem em risco (< 15%) → PE e Financeiro
  - Novo job criado → PE
  - Conflito de agenda de diretor → PE, Coordenador, Diretor
- Canais de notificação:
  - **WhatsApp:** Canal primário (integração Z-API/Evolution API)
  - **In-app:** Secundário (notificações web)
- Configuração de preferências por usuário
- Resumo diário (não spam)
- Documento "Aprovação Interna" enviado quando job aprovado (via Atendimento)

---

### US-018: Visão de carga de trabalho
**Como** Produtor Executivo  
**Quero** ver quantos jobs cada pessoa está tocando  
**Para** balancear carga

**Critérios de aceite:**
- Agrupamento por Produtor/Diretor
- Contagem de jobs ativos por pessoa
- Identificação de conflitos de agenda (alerta, não bloqueio)
- Filtro por fase (produção/filmagem)
- Dashboard visual com heatmap de alocação

---

### US-019: Anexar arquivos ao job
**Como** Coordenador de Produção  
**Quero** anexar arquivos ao job  
**Para** centralizar documentação

**Critérios de aceite:**
- Upload múltiplo (limite 50MB/arquivo) via Supabase Storage
- Tipos: PDF, DOCX, XLSX, JPG, PNG, MP4, links
- Categorias: Briefing, Contrato, Referências, Aprovações, Entregáveis
- Versionamento de arquivos
- Permissões por tenant (multi-tenant)
- Links diretos para pastas no Google Drive (URLs clicáveis)
- Integração com estrutura de pastas existente (02_FINANCEIRO, 05_CONTRATOS, etc.)

---

### US-020: Integração com módulos financeiro e contratos
**Como** Financeiro  
**Quero** que lançamentos e contratos fiquem vinculados ao job  
**Para** rastreabilidade completa

**Critérios de aceite:**
- Vincular despesa a Job (dropdown no módulo Financeiro)
- Custo Real auto-calculado (soma de despesas vinculadas OU importado da planilha GG_)
- Vincular contratos a Job (geração de contratos de elenco via template Google Docs)
- Abas "Financeiro" e "Contratos" no detalhe do job
- Vínculo bidirecional (job → contrato, contrato → job)
- Integração com n8n para workflow de assinatura digital (DocuSeal)

---

### US-021: Health Score automático do job
**Como** Produtor Executivo  
**Quero** ver um score de 0-100 pts indicando quão completo está o job  
**Para** identificar rapidamente jobs com informações faltantes

**Critérios de aceite:**
- Cálculo automático baseado no sistema atual da Ellah:
  - +15 pts por URL preenchido (Carta Orçamento, Cronograma, Roteiro, PPM)
  - +10 pts por data definida (Entrega, Pagamento)
  - +10 pts por equipe definida (Diretor, PE)
- Máximo: 100 pontos
- Indicador visual (cor ou barra de progresso)
- Filtro por faixa de score (< 50%, 50-80%, > 80%)

---

### US-022: Versionamento de orçamentos
**Como** Atendimento  
**Quero** manter histórico de versões de orçamento enviadas ao cliente  
**Para** saber qual versão foi aprovada e rastrear mudanças

**Critérios de aceite:**
- Orçamento é documento SEPARADO do job (vinculado, não embutido)
- Maioria dos orçamentos NÃO é aprovada (não criar pasta pra cada)
- Quando job é aprovado, orçamento vincula ao job
- Versionamento: v1, v2, v3 (com data e responsável)
- Carta Orçamento: documento Google Docs gerado automaticamente com template timbrado
- Campos preenchidos automaticamente: {{CLIENTE}}, {{AGENCIA}}, {{NOME_DO_JOB}}, {{VALOR_TOTAL}}
- Link direto na coluna da tabela master

---

### US-023: Aprovações (interno + externo)
**Como** Atendimento  
**Quero** registrar aprovações de cliente de forma flexível  
**Para** suportar o fluxo real (WhatsApp/ligação OU aprovação digital formal)

**Critérios de aceite:**
- Dois caminhos de aprovação:
  1. **Interno:** Atendimento marca job como aprovado (quando cliente aprova por WhatsApp/ligação)
  2. **Externo (opcional):** Sistema gera link de aprovação digital pro cliente (futuro: Portal do Cliente)
- Documento "Aprovação Interna" gerado automaticamente:
  - Detalhes do fechamento: cliente, agência, quantos filmes, secundagens, elenco exclusivo, etc.
  - Criado pelo Atendimento, salvo em 09_ATENDIMENTO/01_PRE_PRODUCAO/01_APROVACAO_INTERNA/
- Status "Aprovado" requer `data_aprovacao` e `valor_orcado`
- Notificação PARA TODOS via WhatsApp quando aprovado

---

### US-024: Geração automática de documentos e pastas
**Como** Coordenador de Produção  
**Quero** que o sistema crie automaticamente toda estrutura de job quando aprovado  
**Para** economizar horas de trabalho manual

**Critérios de aceite:**
- Ao marcar job como "Aprovado - Seleção de Diretor", sistema cria:
  1. **Estrutura de pastas no Google Drive** (via API):
     - 02_FINANCEIRO/03_GASTOS GERAIS/ (planilha GG_)
     - 05_CONTRATOS/02_CONTRATOEQUIPE/ (planilha EQUIPE_DO_JOB + Forms)
     - 05_CONTRATOS/03_CONTRATODEELENCO/ (CADASTRO_ELENCO_{job})
     - 06_FORNECEDORES/, 08_POS_PRODUCAO/, 09_ATENDIMENTO/, 10_VENDAS/
  2. **Documentos Google Docs:**
     - Carta Orçamento (template preenchido)
     - Cronograma (📊 CRONOGRAMA {job})
  3. **Planilhas:**
     - GG_ copiada do "Super Modelo"
     - EQUIPE_DO_JOB com formulário de cadastro vinculado
     - CADASTRO_ELENCO_{job}
  4. **Permissões automáticas:**
     - 09_ATENDIMENTO: Equipe Atendimento + Email Atendimento do Job + Diretor
     - 10_VENDAS: Equipe Comercial + PE
     - 02_FINANCEIRO: Equipe Financeiro
     - 08_POS_PRODUCAO: Equipe de Pós
     - Demais: Sócios
- Idempotência: não duplicar se já existe
- Webhook callback para n8n (ia.ellahfilmes.com)

---

### US-025: Contratos de elenco automatizados
**Como** Jurídico/Produção  
**Quero** gerar contratos de elenco a partir de template  
**Para** agilizar processo jurídico e evitar erros

**Critérios de aceite:**
- Template de contrato no Google Docs com ~40 campos {{placeholder}}
- Dados do cliente/agência vindos de fonte centralizada
- Campos incluem: nome, CPF, RG, DRT, endereço, valores (prestação, imagem, taxa agenciamento)
- Idempotência: job+CPF+email gera hash única (não duplica PDF)
- Gera PDF automaticamente e salva em 05_CONTRATOS/03_CONTRATODEELENCO/01_CONTRATOS_EM_PDF/
- Retorna dados estruturados pro n8n (para assinatura digital via DocuSeal)
- Integração com formulário CADASTRO_ELENCO_{job}

---

## 4. Campos do Job (Data Model)

### 4.1 Identificacao
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | Identificador unico |
| `tenant_id` | UUID | Sim | FK para `tenants` (multi-tenant) |
| `index_number` | Integer | Sim (auto) | Sequencial por tenant (001, 002...) |
| `job_code` | String | Sim (auto) | JOB_ABA: `{INDEX}_{NomeJob}_{Agencia}` |
| `title` | String | Sim | Nome do job |
| `client_id` | UUID | Sim | FK para `clients` |
| `agency_id` | UUID | Nao | FK para `agencies` |
| `brand` | String | Nao | Marca especifica do cliente |
| `account_email` | String | Nao | Email do atendimento responsavel |

### 4.2 Classificacao
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `job_type` | Enum | Sim | Filme Publicitario, Branded Content, Videoclipe, Documentario, Conteudo Digital, Evento, Institucional, Motion Graphics, Fotografia, Outro |
| `media_type` | String | Nao | Tipo de midia (15", 30", Serie, Social Media) |
| `segment` | Enum | Nao | Automotivo, Varejo, Fintech, Alimentos, Moda, Tech, Saude, Outro |
| `complexity_level` | Enum | Nao | Baixo, Medio, Alto |
| `audio_notes` | String | Nao | Informacoes sobre audio do projeto |
| `job_category` | String | Nao | Categoria customizavel (CATEGORIA DE JOB da master) |
| `tags` | Text[] | Nao | Tags customizaveis |

### 4.3 Status e Lifecycle
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `status` | Enum | Sim | 14 status (ver US-003) |
| `sub_status` | String | Nao | Sub-status livre (ex: Edicao, Cor, VFX na Pos-Producao) |
| `status_updated_at` | Timestamptz | Auto | Ultima atualizacao de status |
| `status_updated_by` | UUID | Auto | FK para `users` |
| `priority` | Enum | Nao | Alta, Media, Baixa |
| `is_archived` | Boolean | Sim | Default: false |
| `cancellation_reason` | Text | Condicional | Obrigatorio se status = Cancelado |

### 4.4 Hierarquia (Job Pai / Sub-jobs)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `parent_job_id` | UUID | Nao | FK para `jobs` (se for sub-job) |
| `is_parent_job` | Boolean | Sim | Default: false |
| `display_order` | Integer | Nao | Ordem de exibicao entre sub-jobs |

**Nota CEO:** Ellah trata como 1 job com varios entregaveis. Sub-jobs apenas para campanhas muito grandes. Maximo 2 niveis.

### 4.5 Datas Importantes
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `briefing_date` | Date | Nao | Quando briefing foi recebido |
| `budget_sent_date` | Date | Nao | Envio de orcamento ao cliente |
| `client_approval_deadline` | Date | Nao | Deadline para aprovacao |
| `approval_date` | Date | Nao | Quando cliente aprovou |
| `ppm_date` | Date | Nao | Pre-Producao Meeting |
| `post_start_date` | Date | Nao | Inicio pos-producao |
| `post_deadline_date` | Date | Nao | Deadline interno pos |
| `expected_delivery_date` | Date | Nao | Promessa ao cliente |
| `actual_delivery_date` | Date | Nao | Entrega efetiva |
| `payment_date` | Date | Nao | Data de pagamento do cliente |

**Nota:** Datas de filmagem (multiplas diarias) ficam em tabela separada `job_shooting_dates`.

### 4.6 Financeiro
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `closed_value` | Decimal(12,2) | Nao | Valor Fechado - quanto o cliente paga (R$) |
| `production_cost` | Decimal(12,2) | Auto | Valor Producao - soma de despesas vinculadas |
| `tax_value` | Decimal(12,2) | Auto | Valor Imposto - 12% do Valor Fechado |
| `tax_percentage` | Decimal(5,2) | Sim | Percentual de imposto. Default: 12.00 |
| `gross_profit` | Decimal(12,2) | Auto | Valor W - lucro bruto calculado |
| `net_profit` | Decimal(12,2) | Auto | Valor Liquido - lucro final |
| `margin_percentage` | Decimal(5,2) | Auto | Margem % calculada |
| `currency` | String | Sim | Default: "BRL" |
| `payment_terms` | Text | Nao | Ex: "50% adiantado, 50% entrega" |
| `po_number` | String | Nao | Purchase Order do cliente |

**Formulas (replicando planilha Ellah):**
- `tax_value` = `closed_value` * (`tax_percentage` / 100)
- `gross_profit` = `closed_value` - `production_cost` - `tax_value`
- `margin_percentage` = (`gross_profit` / `closed_value`) * 100

**Codigo de cores da margem (decisao CEO):**
- Verde: >= 30% (meta da Ellah)
- Amarelo: 15% a 29% (atencao)
- Vermelho: < 15% (critico)

### 4.7 Health Score
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `health_score` | Integer | Auto | Pontuacao 0-100, calculada automaticamente |

**Regras de calculo (baseado no Apps Script existente):**
- +15 pts: URL carta orcamento preenchido
- +15 pts: URL cronograma preenchido
- +15 pts: URL roteiro preenchido
- +15 pts: URL PPM preenchido
- +10 pts: Data entrega final definida
- +10 pts: Data pagamento definida
- +10 pts: Diretor definido na equipe
- +10 pts: Produtor Executivo definido na equipe
- **Total maximo: 100 pontos**

### 4.8 URLs e Links (Google Drive)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `drive_folder_url` | String | Nao | URL da pasta raiz do job no Drive |
| `budget_letter_url` | String | Nao | URL da Carta Orcamento |
| `schedule_url` | String | Nao | URL do Cronograma |
| `script_url` | String | Nao | URL do Roteiro |
| `ppm_url` | String | Nao | URL do documento de PPM |
| `production_sheet_url` | String | Nao | URL da planilha GG_ (custos) |
| `contracts_folder_url` | String | Nao | URL da pasta de contratos |

### 4.9 Briefing e Observacoes
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `briefing_text` | Text | Nao | Briefing em texto |
| `notes` | Text | Nao | Observacoes gerais |
| `internal_notes` | Text | Nao | Notas internas (nao visivel para cliente) |

### 4.10 Relacionamentos e Aprovacao
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `primary_client_contact_id` | UUID | Nao | FK para `contacts` |
| `primary_agency_contact_id` | UUID | Nao | FK para `contacts` |
| `approval_type` | Enum | Nao | 'internal' ou 'external' |
| `approved_by_user_id` | UUID | Nao | Quem marcou como aprovado |
| `approval_document_url` | String | Nao | URL do documento de Aprovacao Interna |

### 4.11 Auditoria (colunas padrao em TODAS as tabelas)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `created_at` | Timestamptz | Auto | Criacao no sistema |
| `updated_at` | Timestamptz | Auto | Ultima atualizacao |
| `deleted_at` | Timestamptz | Nao | Soft delete (nunca excluir de verdade) |
| `created_by` | UUID | Auto | FK para `users` |

### 4.12 Campos Customizaveis
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `custom_fields` | JSONB | Nao | Campos adicionais por produtora (customizacao por tenant) |

---

## 5. Tabelas Relacionadas

### 5.1 `job_team_members` (Equipe do Job)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | PK |
| `tenant_id` | UUID | Sim | FK para `tenants` |
| `job_id` | UUID | Sim | FK para `jobs` |
| `person_id` | UUID | Sim | FK para `people` |
| `role` | Enum | Sim | Diretor, PE, Coordenador, DoP, AD, Editor, Colorista, Sound Designer, Motion Designer, Produtor Casting, Produtor Locacao, Diretor Arte, Figurinista, Maquiador, Atendimento, Freelancer, Outro |
| `fee` | Decimal(12,2) | Nao | Cache acordado (R$) |
| `hiring_status` | Enum | Sim | Orcado, Proposta Enviada, Confirmado, Cancelado |
| `is_lead_producer` | Boolean | Sim | Default: false (apenas 1 true por job) |
| `created_at` / `updated_at` / `deleted_at` | Timestamptz | Auto/Nao | Padrao |

### 5.2 `job_deliverables` (Entregaveis)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | PK |
| `tenant_id` | UUID | Sim | FK para `tenants` |
| `job_id` | UUID | Sim | FK para `jobs` |
| `description` | String | Sim | Ex: "Filme Master 30s" |
| `format` | String | Nao | MP4, MOV, ProRes 422 |
| `resolution` | String | Nao | 1080p, 4K, Vertical 1080x1920 |
| `duration_seconds` | Integer | Nao | Duracao em segundos |
| `status` | Enum | Sim | Pendente, Em Producao, Aguardando Aprovacao, Aprovado, Entregue |
| `version` | Integer | Sim | Default: 1 (controle de versao v1, v2...) |
| `delivery_date` | Date | Nao | Quando foi entregue |
| `file_url` | String | Nao | Link (Google Drive, Dropbox, Vimeo) |
| `review_url` | String | Nao | Link Frame.io para review na pos |
| `created_at` / `updated_at` / `deleted_at` | Timestamptz | Auto/Nao | Padrao |

### 5.3 `job_shooting_dates` (Diarias de Filmagem)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | PK |
| `tenant_id` | UUID | Sim | FK para `tenants` |
| `job_id` | UUID | Sim | FK para `jobs` |
| `shooting_date` | Date | Sim | Data da diaria |
| `description` | String | Nao | Ex: "Diaria 1 - Locacao externa" |
| `location` | String | Nao | Local da filmagem |
| `created_at` / `updated_at` / `deleted_at` | Timestamptz | Auto/Nao | Padrao |

### 5.4 `job_attachments` (Anexos)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | PK |
| `tenant_id` | UUID | Sim | FK para `tenants` |
| `job_id` | UUID | Sim | FK para `jobs` |
| `file_name` | String | Sim | Nome do arquivo |
| `file_url` | String | Sim | URL (Supabase Storage ou link externo) |
| `file_size_bytes` | Bigint | Nao | Tamanho em bytes |
| `mime_type` | String | Nao | Tipo MIME |
| `category` | Enum | Sim | Briefing, Contrato, Referencias, Aprovacoes, Entregaveis, Outro |
| `version` | Integer | Sim | Default: 1 |
| `uploaded_by` | UUID | Sim | FK para `users` |
| `created_at` / `deleted_at` | Timestamptz | Auto/Nao | Padrao |

### 5.5 `job_history` (Auditoria / Timeline)
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | UUID | Sim (auto) | PK |
| `tenant_id` | UUID | Sim | FK para `tenants` |
| `job_id` | UUID | Sim | FK para `jobs` |
| `event_type` | Enum | Sim | status_change, field_update, team_change, deliverable_change, comment, file_upload, created, archived, restored |
| `user_id` | UUID | Sim | FK para `users` (quem fez) |
| `previous_data` | JSONB | Nao | Estado anterior |
| `new_data` | JSONB | Nao | Novo estado |
| `description` | Text | Auto | Descricao legivel |
| `created_at` | Timestamptz | Auto | Quando aconteceu (imutavel, append-only) |

---

## 6. Criterios de Aceite (Geral da Feature)

### 6.1 Performance
- [ ] Tabela master carrega <1s para ate 500 jobs
- [ ] Busca e filtros retornam resultados em <500ms
- [ ] Paginacao para grandes volumes
- [ ] Atualizacoes em tempo real via Supabase Realtime

### 6.2 Responsividade
- [ ] Interface funcional em desktop (1920x1080 e 1366x768)
- [ ] Visualizacao mobile otimizada (tabela vira cards) - PWA
- [ ] Formularios adaptados para mobile (pode CRIAR jobs pelo celular)

### 6.3 Permissoes e Multi-tenant
- [ ] Cada produtora ve APENAS seus proprios jobs (RLS com tenant_id)
- [ ] Permissoes por papel:
  - **Admin/PE**: acesso total
  - **Produtor/Coordenador**: criar e editar jobs que coordena
  - **Diretor**: visualizar jobs alocados + editar campos especificos
  - **Financeiro**: visualizar todos + editar campos financeiros
  - **Atendimento**: criar e editar jobs + relacionamento com cliente
  - **Freelancer Externo**: visualizar apenas jobs em que esta alocado

### 6.4 Validacoes
- [ ] Nao posso criar job sem Cliente
- [ ] Status "Aprovado" requer `approval_date` e `closed_value`
- [ ] Status "Entregue" requer pelo menos 1 entregavel entregue
- [ ] Status "Cancelado" requer `cancellation_reason`
- [ ] Alerta se `expected_delivery_date` < data de filmagem

### 6.5 Notificacoes
- [ ] WhatsApp como canal primario (Evolution API)
- [ ] In-app como canal secundario
- [ ] Job aprovado: notificacao para TODOS
- [ ] Margem abaixo de 30%: alerta para PE e Financeiro
- [ ] Margem abaixo de 15%: alerta CRITICO
- [ ] Conflito de agenda de diretor: alerta para PE, Coordenador e Diretor

### 6.6 Integracao Google Drive
- [ ] Criacao automatica de estrutura de pastas ao aprovar job
- [ ] Links para pastas/documentos armazenados no job
- [ ] Geracao automatica de Carta Orcamento, GG_, Formularios
- [ ] Permissoes automaticas por departamento

### 6.7 Acessibilidade
- [ ] Navegacao por teclado (Tab, Enter, Esc)
- [ ] Labels para leitores de tela
- [ ] Contraste minimo WCAG AA

---

## 7. Fora de Escopo (Nesta Spec)

### Nao incluido na Tabela Master (specs separadas):
- **Modulo Financeiro detalhado**: contas a pagar/receber, fluxo de caixa, DRE por job
- **Modulo de Contratos**: geracao automatica, envio, assinatura digital (DocuSeal)
- **Modulo de Producao**: checklist pre-producao, shooting board, decupagem, call sheets
- **Portal do Cliente**: cliente acessar sistema e aprovar entregas
- **CRM / Pipeline Comercial**: prospeccao, leads antes de virar job

### Nao incluido na primeira versao (Backlog):
- Gantt Chart / Timeline visual
- Kanban Board
- Automacoes avancadas com IA
- Forecast de Receita
- Benchmark de mercado

---

## 8. Dependencias

### Precisam existir ANTES:
1. **Sistema de Autenticacao e Multi-tenant** (tenants, users, auth)
2. **Cadastro de Clientes e Agencias** (tabelas `clients`, `agencies`)
3. **Cadastro de Pessoas** (tabela `people` - staff + freelancers + elenco)
4. **Cadastro de Contatos** (tabela `contacts`)
5. **Sistema de Permissoes (RBAC)**
6. **Supabase Storage** configurado para uploads

### Podem vir DEPOIS:
- Modulo Financeiro detalhado (despesas, receitas, DRE)
- Modulo de Contratos (geracao, assinatura)
- Sistema de Notificacoes (WhatsApp via Evolution API)
- Integracao Google Drive (criacao automatica de pastas)
- Calendario / Agenda

---

## 9. Perguntas Abertas - TODAS RESPONDIDAS

| # | Pergunta | Resposta CEO |
|---|----------|-------------|
| 1 | Codigo do Job | Formato `{INDEX}_{NomeJob}_{Agencia}`. Sequencial por tenant. Customizavel no futuro. |
| 2 | Status do Job | 14 status (adicionados Selecao de Diretor e Cronograma). Sub-status na Pos. Customizavel por tenant. |
| 3 | Sub-jobs | Ellah trata como 1 job + entregaveis. Sub-jobs so para campanhas grandes. Max 2 niveis. |
| 4 | Conflitos de Agenda | ALERTAR (nao bloquear). Alerta para PE, Coordenador e Diretor. Excecao: mesmo cliente. |
| 5 | Margem | Meta 30%. Amarelo <30%. Vermelho <15%. Nao varia por tipo. |
| 6 | Cancelamento | Custos NUNCA zerados. Taxa como receita. Chuva = custo extra (contratual). |
| 7 | Orcamento | Separado do job. Versionamento v1, v2, v3. Carta Orcamento auto-gerada. |
| 8 | Aprovacoes | Dois caminhos: interno + externo (opcional). Documento Aprovacao Interna. |
| 9 | Entregaveis | Drive/Dropbox para download. Frame.io para review. Versoes sim. |
| 10 | Notificacoes | TODOS recebem quando aprovado. WhatsApp primario + in-app secundario. |
| 11 | Historico | 5 anos visivel. Pode editar apos finalizacao (gera registro). |
| 12 | Duplicacao | NAO duplicam. Usam template que cria estrutura do zero. |
| 13 | Exclusao | SEMPRE soft delete. Nunca excluir de verdade. |
| 14 | Visualizacao | Mostra TODOS os jobs. Colunas: Index, Nome, Agencia, Cliente, Valor, Diretor, PE, Entrega, Status, Tipo. |
| 15 | Customizacao | Sim campos proprios (JSONB). Sim status customizaveis. |
| 16 | Mobile | Pode CRIAR pelo celular (PWA + WhatsApp). |
| 17 | Volume | 4 simultaneos hoje, 10-15/ano. Projecao: 15-20 simultaneos. |
| 18 | Tempo Real | Sim, Supabase Realtime. |

---

## 10. Contexto Operacional (Sistema Atual da Ellah)

### 10.1 Estrutura de Pastas por Job no Google Drive
```
{INDEX}_{NomeJob}_{Agencia}/
├── 02_FINANCEIRO/
│   ├── 03_GASTOS GERAIS/        (planilha GG_ com custos reais)
│   └── 07_NOTAFISCAL_FINAL_PRODUCAO/
├── 05_CONTRATOS/
│   ├── 02_CONTRATOEQUIPE/       (planilha EQUIPE_DO_JOB + Forms cadastro)
│   └── 03_CONTRATODEELENCO/
├── 06_FORNECEDORES/
├── 08_POS_PRODUCAO/
│   └── 01_MATERIAL BRUTO/
├── 09_ATENDIMENTO/
│   ├── 01_PRE_PRODUCAO/ (Aprovacao Interna, Roteiro, PPM)
│   └── 02_PRE_PRODUCAO/
└── 10_VENDAS/PRODUTOR_EXECUTIVO/
    └── 01_INICIO_DO_PROJETO/ (Carta Orcamento, Cronograma)
```

### 10.2 Documentos Auto-gerados
1. **Carta Orcamento** - Google Docs timbrado com {{CLIENTE}}, {{AGENCIA}}, {{NOME_DO_JOB}}, {{VALOR_TOTAL}}
2. **Planilha de Producao (GG_)** - Template de custos reais (copiada do "Super Modelo")
3. **Formulario de Cadastro de Equipe** - Google Forms publicado
4. **Cadastro de Elenco** - Planilha com dados
5. **Aprovacao Interna** - Documento do Atendimento com detalhes do fechamento

### 10.3 Permissoes por Departamento (automaticas)
- 09_ATENDIMENTO: Equipe Atendimento + email do job + Diretor
- 10_VENDAS: Equipe Comercial + PE
- 02_FINANCEIRO: Equipe Financeiro
- 08_POS_PRODUCAO: Equipe de Pos
- Demais: Socios

### 10.4 Integracoes Existentes
- **n8n**: webhook callback quando job e criado (URL: ia.ellahfilmes.com)
- **Google Drive API**: pastas, copias, permissoes
- **Google Forms API**: formularios de cadastro
- **Google Docs API**: templates (carta orcamento, contratos)
- **DocuSeal**: assinatura digital de contratos de elenco

### 10.5 Nomenclatura Familiar (PRESERVAR no ELLAHOS)
- **JOB_ABA**: codigo completo do job (`{INDEX}_{NomeJob}_{Agencia}`)
- **GG_**: planilha de gastos gerais (custos reais de producao)
- **Carta Orcamento**: documento timbrado com valores para o cliente
- **PPM**: Pre-Producao Meeting
- **Aprovacao Interna**: documento de fechamento feito pelo Atendimento

---

## 11. Proximos Passos

1. [x] Escrever spec inicial (PM)
2. [x] Responder Perguntas Abertas (CEO)
3. [x] Incorporar respostas na spec (PM)
4. [ ] Atualizar arquitetura em docs/architecture/ com campos revisados
5. [ ] Definir schema SQL detalhado (migration pronta para rodar)
6. [ ] Priorizar MVP: quais US sao essenciais para primeira release
7. [ ] Implementar Fase 1: Schema + migrations + RLS
8. [ ] Implementar Fase 2: Edge Functions CRUD
9. [ ] Implementar Fase 3: Frontend listagem e criacao

---

**Fim da Spec: Tabela Master de Jobs**
**Total de User Stories:** 25 (20 originais + 5 novas: US-021 a US-025)
**Status:** Refinado com respostas do CEO - Pronto para implementacao
