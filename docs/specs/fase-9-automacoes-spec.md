# Fase 9: Automacoes Operacionais — Spec Completa

**Data:** 24/02/2026
**Status:** RASCUNHO — aguardando validacao
**Autor:** Product Manager — ELLAHOS
**Fase anterior:** Fase 8 (Inteligencia Artificial) — CONCLUIDA E AUDITADA

---

## 1. Resumo Executivo

A Fase 9 fecha o ciclo de substituicao do ecossistema Google Sheets + Apps Script da Ellah Filmes. Enquanto as Fases 1 a 8 construiram a fundacao operacional e a camada de inteligencia, a Fase 9 automatiza os fluxos de trabalho que a equipe executa todo dia: processar notas fiscais recebidas de fornecedores, solicitar emissao de NF por email, conectar o ELLAHOS ao workflow WhatsApp existente ao fechar um job, gerar contratos via DocuSeal, copiar templates do Drive para novas pastas, e gerar documentos formais de aprovacao interna.

### Problemas que resolve

**Problema 1 — Processamento manual de NF:** Hoje a equipe de financeiro recebe PDFs de notas fiscais por email de dezenas de fornecedores, salva manualmente no Drive, atualiza a planilha GG_ linha por linha. O Apps Script verificarRespostasEProcessarNFEmLote faz isso de forma semi-automatica mas e fragil e depende da planilha estar aberta. Erros de nomenclatura de arquivo, NFs salvas na pasta errada e status desatualizado sao comuns.

**Problema 2 — Pedido de NF por email:** Para cada custo com status PEDIDO na planilha, o financeiro acessa uma aba especial, monta o email com dados do fornecedor e envia manualmente. Nao ha rastreabilidade no ELLAHOS de qual email foi enviado, quando, e se o fornecedor respondeu.

**Problema 3 — Desconexao entre ELLAHOS e workflow WhatsApp:** Quando um job e aprovado no ELLAHOS, os 4 grupos WhatsApp do job (Externo, Producao, Pos-PD, Atendimento Interno) precisam ser criados manualmente. O workflow JOB_FECHADO_CRIACAO do n8n ja automatiza isso, mas e acionado de forma independente do ELLAHOS via planilha de controle.

**Problema 4 — Contratos gerados fora do ELLAHOS:** Contratos de elenco e equipe sao gerados via Apps Script em Google Docs, salvos no Drive e enviados por email ou WhatsApp para assinatura. Nao ha visibilidade no ELLAHOS de quem assinou, quem esta pendente, qual versao foi enviada.

**Problema 5 — Templates copiados manualmente:** Ao criar a estrutura de pastas no Drive (automatizada na Fase 5), as pastas ficam vazias. Os templates operacionais (GG_, cronograma, form de equipe) precisam ser copiados manualmente para cada novo job.

**Problema 6 — Aprovacao Interna gerada fora do sistema:** O documento de Aprovacao Interna (PDF com todos os dados do job) e montado manualmente em Google Docs. Nao ha geracao automatica, historico de versoes, ou rastreabilidade de quem aprovou internamente.

### Entregaveis da Fase 9

| Feature | Prioridade | Valor entregue |
|---------|-----------|----------------|
| F9.1 — Fluxo de NF (workflow n8n wf-nf-processor) | P0 | Eliminar processamento manual de NFs de fornecedores |
| F9.2 — Envio de Pedido de NF (UI + Gmail via n8n) | P0 | Rastrear pedidos de NF dentro do ELLAHOS |
| F9.3 — Conectar wf-job-approved ao JOB_FECHADO_CRIACAO | P0 | Unificar aprovacao de job com criacao de grupos WhatsApp |
| F9.4 — Geracao de Contratos via DocuSeal | P1 | Visibilidade e rastreabilidade de contratos no ELLAHOS |
| F9.5 — Copia de Templates do Drive | P1 | Estrutura de pastas completa e operacional ao criar job |
| F9.6 — Geracao de Aprovacao Interna (PDF) | P1 | Documento formal gerado diretamente do ELLAHOS |
| F9.7 — OCR de NFs com IA | P2 | Extrair dados de NFs automaticamente sem digitar |
| F9.8 — Geracao de Claquete | P2 | Claquete profissional gerada a partir dos dados do job |
| F9.9 — Persistir Volume Docker Evolution API | P2 | Eliminar necessidade de reatrelar QR Code apos reinicio |

### Principios de design para automacoes no ELLAHOS

1. **Operacao principal nunca bloqueada por integracao:** reprovar job, salvar custo, criar equipe — essas acoes completam mesmo que o n8n esteja fora do ar. (Padrao ADR-003, ja estabelecido.)
2. **Rastreabilidade completa:** todo email enviado, todo contrato gerado, toda NF processada deve ter registro no banco com status, timestamp e quem acionou.
3. **Confirmacao antes de enviar:** antes de enviar email a fornecedor ou acionar DocuSeal, o usuario ve preview e confirma.
4. **Retry automatico com backoff:** falhas em integracoes externas nao requerem intervencao manual imediata; a fila integration_events re-tenta com backoff exponencial.
5. **Graceful degradation:** se um servico externo (Gmail API, DocuSeal, Google Slides) estiver indisponivel, o sistema exibe mensagem clara e nao gera dados inconsistentes.
6. **Nao alterar workflows n8n existentes:** os 3 workflows ja existentes (JOB_FECHADO_CRIACAO, WORKFLOW_PRINCIPAL, TESTE2_JURIDICO) nao serao modificados. Novos workflows sao criados ao lado. (Padrao ADR-006, ja estabelecido.)

---

## 2. Contexto e Estado Atual

### O que ja existe (base para Fase 9)

**Banco de dados (34 tabelas):**
- financial_records: custos do job com campos supplier info e status de NF
- invoices: NFs emitidas e recebidas vinculadas ao job
- integration_events: fila de eventos para n8n/Drive/WhatsApp (padrao ADR-003)
- drive_folders: mapeamento job-pasta com folder_key tipado
- whatsapp_messages: log de mensagens enviadas/recebidas
- notifications: in-app notifications com Realtime
- people: cadastro de fornecedores/equipe com bank_info JSONB
- job_team: equipe do job com role, rate, hiring_status
- approval_requests: aprovacoes com token publico para acesso externo
- jobs: ~77 colunas incluindo briefing_text, project_type, client_segment, director, executive_producer, closed_value, production_cost

**Edge Functions (20 ativas):**
- integration-processor: processa fila integration_events (Drive, WhatsApp, n8n handlers)
- drive-integration: list-folders, create-structure, recreate, sync-urls
- whatsapp: list-messages, send-manual, webhook
- approvals: create, list, approve/reject, get-by-token, respond (v3)
- financial: CRUD de financial_records, budget_items, invoices

**Infraestrutura externa:**
- n8n self-hosted em ia.ellahfilmes.com com 3 workflows ativos (nao tocar)
- DocuSeal self-hosted em assinaturas.ellahfilmes.com, template id:3 (contrato elenco) ja configurado
- Google Drive API com Service Account configurada, Shared Drive confirmado
- Evolution API self-hosted na VPS (volume Docker sem persistencia — risco conhecido)
- Supabase Vault com ANTHROPIC_API_KEY, Google Service Account JSON, Evolution API token

**O que a Fase 9 cria:**

| Item | Descricao |
|------|-----------|
| 3 novos workflows n8n | wf-nf-processor, wf-nf-pedido, conexao wf-job-approved → JOB_FECHADO_CRIACAO |
| 2 Edge Functions novas | docuseal-integration, document-generator |
| 2 tabelas novas | nf_requests, docuseal_submissions |
| 3 conjuntos de colunas novas | financial_records (nf_status, nf_requested_at, nf_requested_by), invoices (source, nf_number, cnpj_emitente, ocr_extracted, ocr_confidence) |
| 5 componentes frontend novos | NfRequestPanel, ContractPanel, ApprovalInternalPanel, TemplateStatusPanel, ClaquetePanel |
| Integracao nova | Google Slides API (via n8n) para claquete |

---

## 3. Personas

**Financeiro:** Usa o Fluxo de NF todo dia. Principal beneficiaria dos itens P0. Hoje gasta horas processando PDFs de fornecedores. Nao tem visao no ELLAHOS de quais NFs foram pedidas, quais chegaram, quais estao pendentes.

**Produtor Executivo (PE):** Usa Pedido de NF para fechar financeiro do job. Quer saber se fornecedor enviou a NF sem precisar perguntar para o financeiro. Usa Contratos DocuSeal para acompanhar quem assinou. Usa Aprovacao Interna para formalizar o job antes de iniciar producao.

**Coordenador de Producao:** Quer que a pasta do Drive ja esteja com os templates ao iniciar o job. Usa a Claquete para o set de filmagem.

**CEO/Socio:** Quer visibilidade de contratos assinados e pendentes. Aprova internamente o inicio de novos jobs via Aprovacao Interna gerada automaticamente.

**Admin de Sistema:** Configura credenciais, monitora logs de integracao, resolve falhas de webhook. Precisa de volume Docker persistido para a Evolution API nao perder sessao apos reboot.

---

## 4. Prioridades

| Feature | Prioridade | Justificativa |
|---------|-----------|---------------|
| F9.1 Fluxo de NF | P0 | Usado todo dia pelo financeiro. Elimina horas de trabalho manual. Apps Script atual e fragil e depende de planilha aberta. |
| F9.2 Pedido de NF | P0 | Complementa F9.1 — sem rastrear o pedido, nao da para fechar o ciclo de NF. Tela ja existe (aba Financeiro do job). |
| F9.3 wf-job-approved → JOB_FECHADO_CRIACAO | P0 | Sem isso, aprovar job no ELLAHOS nao cria grupos WhatsApp. Equipe continua dependendo da planilha de controle. Alto impacto, baixo esforco. |
| F9.4 Contratos DocuSeal | P1 | DocuSeal ja rodando, template pronto. Falta apenas a Edge Function e o botao no frontend. |
| F9.5 Copia de Templates Drive | P1 | Complementa o que a Fase 5 fez (criar pastas). Sem templates, as pastas ficam vazias e a equipe copia manualmente. |
| F9.6 Aprovacao Interna PDF | P1 | Documento gerado hoje manualmente toda vez. Dados ja estao no ELLAHOS — gerar o PDF e so montar o template. |
| F9.7 OCR de NFs | P2 | Util mas nao urgente. Claude ja esta integrado (Fase 8). Requer UI adicional e tratamento de erro de OCR. |
| F9.8 Geracao de Claquete | P2 | Valor para o set, mas a claquete atual funciona razoavelmente bem pelo Apps Script. |
| F9.9 Volume Docker Evolution API | P2 | Infraestrutura importante mas nao bloqueia features de produto. Tarefa de ops. |

---

## 5. User Stories

### 5.1 F9.1 -- Fluxo de NF: wf-nf-processor (US-901 a US-908)

**Contexto:** O workflow wf-nf-processor e um novo workflow n8n que monitora a caixa de entrada do Gmail da Ellah, detecta emails de fornecedores com PDF de NF, salva o PDF no Drive (pasta 04_NOTAFISCAL_RECEBIMENTO/ do job correspondente), cria/atualiza registro na tabela invoices do ELLAHOS, e notifica o financeiro in-app.

---

**US-901 -- Monitorar Gmail por NFs de fornecedores**
Como sistema, quero monitorar automaticamente a caixa de entrada do Gmail por emails de fornecedores contendo PDF de nota fiscal, para eliminar a necessidade de processar NFs manualmente.

Criterios de aceite:
- CA-901.1: Workflow n8n wf-nf-processor executa a cada 15 minutos via scheduler do n8n (nao pg_cron -- o Gmail e externo)
- CA-901.2: Busca emails com query configuravel no tenant.settings (ex: has:attachment filename:*.pdf subject:nota OR subject:NF)
- CA-901.3: Apenas emails nao processados sao analisados (controle via label Gmail ELLAHOS_PROCESSED aplicado apos processar)
- CA-901.4: Extrai: remetente (email), assunto, data, lista de anexos PDF
- CA-901.5: Se nenhum email encontrado, workflow encerra silenciosamente sem criar log

---

**US-902 -- Vincular NF ao job e custo correto**
Como sistema, quero identificar automaticamente a qual job e custo a NF pertence, para salva-la no lugar certo sem intervencao humana.

Criterios de aceite:
- CA-902.1: Vinculacao por matching de email do fornecedor com people.email filtrado por tenant
- CA-902.2: Vinculacao secundaria: busca numero do job no assunto do email (ex: 038, JOB 038) contra jobs.code
- CA-902.3: Se vinculacao e unica (1 job, 1 pessoa), a NF e processada automaticamente
- CA-902.4: Se vinculacao e ambigua (multiplos jobs ativos para o mesmo fornecedor), a NF vai para fila de revisao manual (status pending_review)
- CA-902.5: Se nenhum vinculo encontrado (fornecedor desconhecido), a NF vai para fila de revisao manual com status unmatched
- CA-902.6: Criterio de vinculacao documentado no log de cada NF processada

---

**US-903 -- Salvar PDF no Google Drive**
Como sistema, quero salvar o PDF da NF automaticamente na pasta correta do job no Drive, para manter a organizacao de arquivos sem trabalho manual.

Criterios de aceite:
- CA-903.1: PDF salvo na pasta 04_NOTAFISCAL_RECEBIMENTO/ do job correspondente (folder_key: fin_nf_recebimento da tabela drive_folders)
- CA-903.2: Nome do arquivo: NF_{SUPPLIER_NAME}_{YYYYMMDD}_{ORIGINAL_FILENAME}.pdf
- CA-903.3: Se pasta do job nao existir no Drive, PDF vai para pasta de NFs pendentes configurada em tenant.settings (nf_pending_folder_id) e status pending_folder
- CA-903.4: URL do arquivo no Drive salva no registro da invoice (invoice_url)
- CA-903.5: Falha ao salvar no Drive nao descarta o PDF -- re-tenta em ate 3 vezes com backoff de 5 minutos

---

**US-904 -- Criar ou atualizar registro na tabela invoices**
Como financeiro, quero que cada NF recebida gere automaticamente um registro no ELLAHOS, para ter historico centralizado sem digitar dados manualmente.

Criterios de aceite:
- CA-904.1: Registro criado na tabela invoices com: tenant_id, job_id (se vinculado), person_id (fornecedor), type = recebida, status = received, invoice_url, received_at, source = gmail_automation
- CA-904.2: Se ja existe registro de invoices com status pending para aquele fornecedor e job (criado quando o pedido de NF foi enviado), o registro existente e atualizado (nao duplicado) com status received e invoice_url
- CA-904.3: Historico de mudanca de status armazenado em payment_history
- CA-904.4: Campo nf_number preenchido se o numero da NF for encontrado no nome do arquivo (regex padrao NF-e)
- CA-904.5: Registro criado mesmo em caso de ambiguidade (status pending_review) -- usuario resolve o vinculo depois pela UI

---

**US-905 -- Interface de revisao de NFs ambiguas**
Como financeiro, quero revisar NFs que o sistema nao conseguiu vincular automaticamente, para resolver casos ambiguos sem sair do ELLAHOS.

Criterios de aceite:
- CA-905.1: Badge com contagem de NFs pendentes de revisao visivel no menu lateral (ao lado de Financeiro)
- CA-905.2: Tela /financial?tab=nf-review lista NFs em status pending_review e unmatched com: nome do fornecedor, data, valor estimado (se disponivel), link para o PDF no Drive
- CA-905.3: Para cada NF, usuario pode: (a) vincular a um job + custo especifico, (b) marcar como nao e NF nossa, (c) criar novo registro de custo e vincular
- CA-905.4: Ao vincular, sistema move o PDF para a pasta correta no Drive e atualiza o registro da invoice
- CA-905.5: NFs com status unmatched ha mais de 7 dias geram notificacao in-app para o role financeiro

---

**US-906 -- Notificar financeiro quando NF chegar**
Como financeiro, quero receber notificacao in-app quando uma NF de fornecedor e recebida e processada, para saber que o ciclo foi fechado sem precisar verificar manualmente.

Criterios de aceite:
- CA-906.1: Notificacao in-app criada no sistema de notifications existente (Fase 5) com tipo nf_received
- CA-906.2: Notificacao exibe: nome do fornecedor, job vinculado, link para o registro no ELLAHOS
- CA-906.3: NFs processadas automaticamente (status received) geram notificacao de sucesso
- CA-906.4: NFs ambiguas (status pending_review) geram notificacao de atencao com acao rapida Revisar
- CA-906.5: Notificacao enviada apenas para usuarios com role financeiro, admin ou ceo do tenant

---

**US-907 -- Log de execucao do wf-nf-processor**
Como admin, quero ver o historico de execucoes do workflow de NF, para diagnosticar falhas e auditar o processamento.

Criterios de aceite:
- CA-907.1: Cada execucao do workflow cria registro em integration_events com event_type = nf_processor_run, payload com: emails_found, emails_processed, emails_failed, duration_ms
- CA-907.2: Logs visiveis na pagina /settings/integrations na aba Fluxo de NF com filtro de data
- CA-907.3: Erros de processamento individual (ex: Drive API timeout) logados com mensagem descritiva no campo error_message do integration_event
- CA-907.4: Metrica de sucesso exibida: X NFs processadas automaticamente esta semana, Y aguardam revisao
- CA-907.5: Botao Executar agora (admin only) para forcar execucao imediata do workflow via webhook n8n

---

**US-908 -- Configurar parametros do wf-nf-processor**
Como admin, quero configurar os parametros do monitoramento de NFs, para adaptar o fluxo a realidade do tenant.

Criterios de aceite:
- CA-908.1: Pagina /settings/integrations aba Fluxo de NF exibe: status (ativo/inativo), frequencia de execucao, query Gmail, label de controle
- CA-908.2: Toggle para ativar/desativar o workflow (desabilita o scheduler n8n via webhook)
- CA-908.3: Campo para configurar a query Gmail (default: has:attachment filename:*.pdf subject:(nota OR NF OR nota fiscal))
- CA-908.4: Campo nf_pending_folder_id -- ID da pasta no Drive para NFs sem job vinculado
- CA-908.5: Configuracoes salvas em tenant.settings.nf_processor (JSON, nao Vault -- nao sao secrets)

---
### 5.2 F9.2 -- Envio de Pedido de NF (US-911 a US-917)

**Contexto:** Quando a Ellah tem um custo com fornecedor e precisa que ele emita a NF correspondente, o financeiro aciona o Pedido de NF. Hoje isso e feito pela aba PEDIDO EMISSAO NF do GG_. A Fase 9 traz esse fluxo para o ELLAHOS: selecionar os custos na aba Financeiro do job, ver preview do email, enviar via Gmail (usando n8n como relay), e registrar o status no ELLAHOS.

---

**US-911 -- Selecionar custos para pedir NF**
Como financeiro, quero selecionar quais custos de um job estao prontos para ter NF pedida, para enviar pedidos de emissao em lote sem abrir o GG_.

Criterios de aceite:
- CA-911.1: Na aba Financeiro do job detail (/jobs/[id]), lista de custos exibe coluna Status NF com badge: Sem NF / Pedida / Recebida / Aprovada
- CA-911.2: Checkbox ao lado de cada custo com status Sem NF permite selecionar multiplos custos para o mesmo fornecedor
- CA-911.3: Botao Pedir NF aparece na toolbar quando ha selecao ativa (ao lado do total selecionado)
- CA-911.4: Botao desabilitado se custos selecionados pertencem a fornecedores diferentes -- exibe tooltip Selecione apenas custos do mesmo fornecedor
- CA-911.5: Campo nf_status adicionado a tabela financial_records (ENUM: none, requested, received, approved) -- migration em 9.1

---

**US-912 -- Preview do email de pedido de NF**
Como financeiro, quero ver o email que sera enviado ao fornecedor antes de enviar, para garantir que os dados estao corretos.

Criterios de aceite:
- CA-912.1: Modal Pedido de NF exibe preview do email com: dados do fornecedor, tabela de servicos (descricao, valor, data), dados bancarios da Ellah para emissao, instrucoes de envio
- CA-912.2: Campos editaveis no preview: assunto do email, texto de introducao, instrucoes adicionais
- CA-912.3: Email usa template HTML responsivo configurado em tenant.settings.nf_email_template (texto plano com placeholders substituidos)
- CA-912.4: Exibe endereco de envio: email do fornecedor extraido de people.email vinculado ao custo
- CA-912.5: Se pessoa nao tem email cadastrado, botao Enviar esta desabilitado e exibe link Cadastrar email do fornecedor
- CA-912.6: Preview renderizado em HTML no modal (iframe sandbox)

---

**US-913 -- Enviar email de pedido de NF**
Como financeiro, quero enviar o pedido de NF diretamente do ELLAHOS via Gmail da Ellah, para ter rastreabilidade do envio sem sair do sistema.

Criterios de aceite:
- CA-913.1: Ao confirmar, ELLAHOS cria evento em integration_events com event_type = nf_request_send, payload com destinatario, assunto, corpo HTML, lista de financial_record_ids
- CA-913.2: Workflow n8n wf-nf-pedido recebe o webhook, envia o email via Gmail API (usando credenciais OAuth do tenant), e faz callback com status
- CA-913.3: Ao receber confirmacao de envio, sistema atualiza financial_records.nf_status para requested e registra requested_at e requested_by (user_id)
- CA-913.4: Registro criado em invoices com type = recebida, status = pending, job_id, person_id, source = nf_request
- CA-913.5: Loading state exibido durante o envio; mensagem de sucesso Email enviado para {email_fornecedor} ou erro especifico se falhar
- CA-913.6: Email enviado inclui Reply-To configurado para o email da Ellah que sera monitorado pelo wf-nf-processor

---

**US-914 -- Acompanhar status dos pedidos de NF**
Como financeiro, quero ver o status de cada pedido de NF enviado, para saber quais fornecedores ainda nao responderam.

Criterios de aceite:
- CA-914.1: Coluna Status NF na lista de custos do job exibe badge colorido: Sem NF (cinza) / Pedida (amber) / Recebida (green) / Aprovada (emerald)
- CA-914.2: Tooltip no badge Pedida exibe: Enviado em {data} para {email}, Ha X dias sem resposta
- CA-914.3: Filtro Aguardando NF na lista de custos do job mostra apenas custos com status requested ha mais de 5 dias
- CA-914.4: Custos com NF pedida ha mais de 10 dias geram notificacao in-app para o financeiro com acao rapida Reenviar
- CA-914.5: Botao Reenviar pedido disponivel em cada custo com status requested -- usa o mesmo fluxo de US-913

---

**US-915 -- Vincular NF recebida ao pedido original**
Como sistema, quero vincular automaticamente uma NF recebida (F9.1) ao pedido de NF que a originou, para fechar o ciclo sem intervencao manual.

Criterios de aceite:
- CA-915.1: Quando wf-nf-processor recebe uma NF cujo remetente tem invoice com status pending e job vinculado, o sistema atualiza o status para received automaticamente
- CA-915.2: Campo financial_records.nf_status atualizado para received nos registros correspondentes
- CA-915.3: Notificacao in-app criada: NF recebida de {fornecedor} para o job {code} com link para o registro
- CA-915.4: Ciclo fechado: pedido enviado to NF recebida to Drive atualizado -- sem nenhuma acao manual se o fornecedor responder ao email correto

---

**US-916 -- Aprovacao manual da NF recebida**
Como financeiro, quero revisar e aprovar a NF recebida antes de marcar o custo como pronto para pagamento, para garantir que o valor e os dados estao corretos.

Criterios de aceite:
- CA-916.1: Custos com status received exibem botao Revisar NF na lista de custos do job
- CA-916.2: Modal de revisao exibe: PDF da NF (embed do Drive ou download), dados preenchidos automaticamente (numero, valor, data emissao se disponivel via OCR -- F9.7), dados esperados (valor do custo no ELLAHOS)
- CA-916.3: Botoes: Aprovar (marca como approved, habilita pagamento), Pedir correcao (volta para requested com nota para o fornecedor), Rejeitar (marca como rejected com motivo)
- CA-916.4: Ao aprovar, financial_records.nf_status = approved, invoices.status = approved, invoices.approved_by = user_id, invoices.approved_at = now()
- CA-916.5: Aprovacao ou rejeicao cria entrada em job_history para auditoria

---

**US-917 -- Configurar Gmail OAuth para envio de emails**
Como admin, quero configurar a conta Gmail que sera usada para enviar e monitorar pedidos de NF, para que o sistema use a conta correta da produtora.

Criterios de aceite:
- CA-917.1: Pagina /settings/integrations aba Gmail / NF exibe status da conexao Gmail: conectado / nao configurado
- CA-917.2: Botao Conectar Gmail inicia fluxo OAuth 2.0 via n8n (redirect para consentimento Google)
- CA-917.3: Apos autorizacao, refresh_token armazenado no Supabase Vault com key gmail_refresh_token_{tenant_id}
- CA-917.4: Campo de teste: ao clicar Testar conexao, envia email de teste para o proprio email do admin e exibe resultado
- CA-917.5: Se token expirar, status muda para Reconectar e notificacao in-app enviada ao admin

---
### 5.3 F9.3 -- Conectar wf-job-approved ao JOB_FECHADO_CRIACAO (US-921 a US-924)

**Contexto:** O workflow JOB_FECHADO_CRIACAO ja existe no n8n e funciona: ao receber um webhook, cria 4 grupos WhatsApp (Externo, Producao, Pos-PD, Atendimento Interno) e envia mensagem com todos os links do job. O problema e que ele e acionado manualmente ou pela planilha de controle, nao pelo ELLAHOS. A Fase 9 conecta o wf-job-approved (criado na Fase 5) para chamar o JOB_FECHADO_CRIACAO como sub-workflow apos criar as pastas no Drive.

---

**US-921 -- Acionar JOB_FECHADO_CRIACAO ao aprovar job no ELLAHOS**
Como PE, quero que ao aprovar um job no ELLAHOS os 4 grupos WhatsApp sejam criados automaticamente, para nao depender da planilha de controle para iniciar a comunicacao do job.

Criterios de aceite:
- CA-921.1: Ao aprovar job no ELLAHOS (transicao de status para aprovado/fechado), o wf-job-approved (Fase 5) inclui um passo final que chama o webhook do JOB_FECHADO_CRIACAO como sub-workflow
- CA-921.2: Payload enviado ao JOB_FECHADO_CRIACAO inclui todos os campos que ele espera: numero do job, job_aba, cliente, agencia, projeto, links de pastas Drive (da tabela drive_folders)
- CA-921.3: A chamada ao JOB_FECHADO_CRIACAO e assincrona e nao bloqueia a conclusao do wf-job-approved
- CA-921.4: Se JOB_FECHADO_CRIACAO falhar (Z-API indisponivel, timeout), o wf-job-approved nao falha -- loga o erro e segue
- CA-921.5: Logs de execucao do sub-workflow visiveis nos logs de integracao do ELLAHOS (integration_events com event_type = whatsapp_groups_created)

---

**US-922 -- Mapear campos ELLAHOS para payload do JOB_FECHADO_CRIACAO**
Como sistema, quero que o payload enviado ao JOB_FECHADO_CRIACAO use os dados corretos do ELLAHOS, para que os grupos WhatsApp sejam criados com as informacoes certas.

Criterios de aceite:
- CA-922.1: Mapeamento documentado e implementado no wf-job-approved:
  - numero = jobs.code
  - job_aba = jobs.job_aba (ex: 038_Quer_Fazer_Senac)
  - cliente = clients.name (via FK)
  - agencia = agencies.name (via FK, se existir)
  - projeto = jobs.title
  - pasta_principal = URL da pasta root em drive_folders
  - planilha_producao = URL da pasta financeiro em drive_folders
  - cronograma = URL da pasta cronograma em drive_folders
  - contratos = URL da pasta contratos em drive_folders
- CA-922.2: Campos nao mapeados (PPM, Carta Orcamento, etc.) enviados como string vazia -- o workflow JOB_FECHADO_CRIACAO ja trata campos vazios
- CA-922.3: Mapeamento configuravel por tenant em tenant.settings.job_closed_payload_map (JSON) para casos onde os campos diferem
- CA-922.4: Documentacao do mapeamento em comentario no node do n8n

---

**US-923 -- Toggle para desabilitar criacao de grupos WhatsApp**
Como admin, quero poder desabilitar a criacao automatica de grupos WhatsApp ao aprovar jobs, para tenants que nao usam WhatsApp ou estao em ambiente de teste.

Criterios de aceite:
- CA-923.1: Toggle Criar grupos WhatsApp ao aprovar job em /settings/integrations aba WhatsApp
- CA-923.2: Com toggle desabilitado, o passo de chamada ao JOB_FECHADO_CRIACAO e pulado no wf-job-approved
- CA-923.3: Configuracao salva em tenant.settings.whatsapp.auto_create_groups (boolean)
- CA-923.4: Toggle visivel apenas se a integracao WhatsApp estiver configurada (Evolution API ou Z-API conectada)

---

**US-924 -- Visibilidade dos grupos criados no job detail**
Como PE, quero ver no job detail os grupos WhatsApp que foram criados para aquele job, para acessar rapidamente sem ter que procurar no celular.

Criterios de aceite:
- CA-924.1: Secao Grupos WhatsApp na aba Geral do job detail exibe os 4 grupos com nome e status (criado / pendente / falhou)
- CA-924.2: Dados dos grupos salvos via callback do JOB_FECHADO_CRIACAO ao ELLAHOS (campo whatsapp_groups JSONB em jobs -- ver Pergunta Aberta numero 3)
- CA-924.3: Status atualizado via callback do JOB_FECHADO_CRIACAO para o ELLAHOS apos criacao
- CA-924.4: Botao Recriar grupos (admin only) para re-acionar o workflow manualmente

---
### 5.4 F9.4 -- Geracao de Contratos via DocuSeal (US-931 a US-938)

**Contexto:** O DocuSeal esta self-hosted em assinaturas.ellahfilmes.com. Template id:3 (contrato de elenco) ja existe. O workflow TESTE2_JURIDICO no n8n foi testado mas nunca entrou em producao. A Fase 9 cria a Edge Function docuseal-integration e o frontend para gerar contratos diretamente do job detail, substituindo o Apps Script atual.

---

**US-931 -- Botao Gerar Contrato por membro da equipe ou elenco**
Como PE, quero gerar um contrato DocuSeal para um membro especifico da equipe ou elenco diretamente do job detail, para eliminar o passo de ir ao Apps Script.

Criterios de aceite:
- CA-931.1: Botao Gerar Contrato disponivel em cada linha da aba Equipe do job detail, visivel para roles PE, admin, ceo
- CA-931.2: Botao ativo apenas para membros com email cadastrado na tabela people
- CA-931.3: Modal Gerar Contrato exibe: tipo de contrato (seletor: Elenco / Equipe Tecnica / Prestacao de Servicos), dados do contratado (nome, CPF, email -- editaveis antes de enviar), dados do job (job_aba, cliente, datas de filmagem, valor do cache)
- CA-931.4: Tipo de contrato determina qual template DocuSeal usar (template_id configuravel em tenant.settings.docuseal.templates)
- CA-931.5: Botao Gerar e Enviar cria a submissao no DocuSeal e registra na tabela docuseal_submissions

---

**US-932 -- Criar submissao no DocuSeal via Edge Function**
Como sistema, quero criar submissoes de contrato no DocuSeal via API, para centralizar a logica de geracao de contratos no backend.

Criterios de aceite:
- CA-932.1: Edge Function docuseal-integration com handler POST /create recebe: job_id, person_id, contract_type, dados opcionais de override (ex: valor customizado)
- CA-932.2: Edge Function busca dados do job e da pessoa no banco, monta o payload para DocuSeal API (POST /api/submissions)
- CA-932.3: Payload DocuSeal inclui: template_id (baseado no contract_type), submitters com role e email, valores dos campos pre-preenchidos (placeholders do template)
- CA-932.4: Credenciais DocuSeal (URL e X-Auth-Token) lidas do Supabase Vault com keys docuseal_url e docuseal_token
- CA-932.5: Resposta da DocuSeal API (submission_id, sign_url para cada signatario) salva na tabela docuseal_submissions
- CA-932.6: Em caso de erro da DocuSeal API, retorna mensagem descritiva -- sem criar registro pending inconsistente

---

**US-933 -- Acompanhar status de contratos no job detail**
Como PE, quero ver o status de cada contrato gerado para o job, para saber quem ja assinou e quem esta pendente.

Criterios de aceite:
- CA-933.1: Aba Equipe do job detail exibe badge de contrato por membro: Sem Contrato / Enviado / Aguardando Assinatura / Assinado / Expirado
- CA-933.2: Tooltip no badge exibe: data de envio, link direto para o documento no DocuSeal, quem gerou
- CA-933.3: Card Contratos do Job na aba Equipe lista todos os contratos com filtro de status
- CA-933.4: Contagem de contratos pendentes visivel no header do job (badge)
- CA-933.5: Contratos expirados geram notificacao in-app

---

**US-934 -- Receber webhook de assinatura do DocuSeal**
Como sistema, quero receber a notificacao do DocuSeal quando um contrato for assinado, para atualizar o status no ELLAHOS automaticamente.

Criterios de aceite:
- CA-934.1: Edge Function docuseal-integration com handler POST /webhook recebe callbacks do DocuSeal (evento submission.completed e submission.expired)
- CA-934.2: Webhook valida a autenticidade da chamada (X-Docuseal-Signature header ou token secreto configurado)
- CA-934.3: Ao receber submission.completed, atualiza docuseal_submissions.status para completed, registra signed_at
- CA-934.4: Ao receber submission.expired, atualiza status para expired e cria notificacao in-app
- CA-934.5: URL do webhook configurada em /settings/integrations aba DocuSeal para que o admin copie e cole no painel DocuSeal

---

**US-935 -- Acessar contrato assinado**
Como PE, quero baixar o PDF do contrato assinado diretamente do ELLAHOS, para nao precisar entrar no painel DocuSeal.

Criterios de aceite:
- CA-935.1: Apos assinatura, docuseal_submissions.document_url preenchido com URL do PDF final (recebido no webhook)
- CA-935.2: Botao Baixar PDF disponivel para contratos com status completed
- CA-935.3: PDF tambem salvo automaticamente na pasta 05_CONTRATOS/ do job no Drive via integration_events
- CA-935.4: Link para PDF no Drive exibido no tooltip do badge de contrato

---

**US-936 -- Reenviar contrato para assinatura**
Como PE, quero reenviar o link de assinatura para um signatario especifico, para casos onde o email se perdeu ou o contrato expirou.

Criterios de aceite:
- CA-936.1: Botao Reenviar disponivel para contratos com status sent ou expired
- CA-936.2: Para status sent: chama DocuSeal API para reenviar o email de assinatura para o signatario pendente
- CA-936.3: Para status expired: cria nova submissao no DocuSeal (mesmo template e dados) e arquiva a antiga
- CA-936.4: Reenvio registrado em log da submissao com timestamp e usuario
- CA-936.5: Maximo de 3 reenvios por submissao -- alem disso, exibe mensagem Limite de reenvios atingido. Gere um novo contrato.

---

**US-937 -- Geracao em lote para multiplos membros**
Como PE, quero gerar contratos para todos os membros da equipe de um job de uma vez, para nao precisar gerar um por um.

Criterios de aceite:
- CA-937.1: Botao Gerar Contratos em Lote na aba Equipe do job detail seleciona todos os membros sem contrato ativo
- CA-937.2: Modal de confirmacao lista os membros que receberao contrato com tipo sugerido (baseado no role do membro)
- CA-937.3: Usuario pode desmarcar membros individuais antes de confirmar
- CA-937.4: Geracao em lote cria uma submissao DocuSeal por membro (nao uma unica submissao com todos)
- CA-937.5: Progress indicator exibe: X de Y contratos gerados com status individual de cada um
- CA-937.6: Membros sem email cadastrado sao pulados e listados separadamente com alerta Cadastrar email

---

**US-938 -- Configurar DocuSeal no tenant**
Como admin, quero configurar as credenciais e templates DocuSeal para o meu tenant, para que a geracao de contratos use os templates corretos da minha produtora.

Criterios de aceite:
- CA-938.1: Pagina /settings/integrations aba DocuSeal exibe: URL da instancia, status de conexao, lista de templates disponiveis
- CA-938.2: Campo URL + Token autenticados (token armazenado no Vault)
- CA-938.3: Botao Testar Conexao chama DocuSeal API /api/templates e exibe os templates encontrados
- CA-938.4: Mapeamento de tipos de contrato para template_id configuravel: Elenco to 3, Equipe Tecnica to ?, Prestacao to ?
- CA-938.5: Campo Email do signatario Produtora -- email que representa a produtora nos contratos (segundo signatario)

---
