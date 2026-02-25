# Fase 9: Automacoes Operacionais — Spec Completa

**Data:** 24/02/2026
**Status:** COMPLETO — 53 user stories (US-901 a US-983)
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
### 5.5 F9.5 -- Copia de Templates do Drive (US-941 a US-945)

**Contexto:** Na Fase 5, a funcao create-structure do drive-integration cria 26 pastas vazias no Drive ao criar um job. Porem, os templates operacionais (GG_, cronograma, formulario de equipe) precisam ser copiados manualmente para cada novo job. A Fase 9 expande o drive-integration para copiar automaticamente os templates configurados ao criar a estrutura de pastas.

---

**US-941 -- Configurar templates do Drive por tenant**
Como admin, quero configurar quais templates do Google Drive devem ser copiados automaticamente para cada novo job, para que a equipe nao precise copiar manualmente.

Criterios de aceite:
- CA-941.1: Pagina /settings/integrations aba Drive exibe secao Templates de Job com lista de templates configurados
- CA-941.2: Para cada template, usuario define: nome (com placeholders {JOB_ABA}, {JOB_CODE}, {CLIENT}), ID do arquivo fonte no Drive (source_id), pasta destino (folder_key da tabela drive_folders), tipo (spreadsheet/form/document)
- CA-941.3: Botao Adicionar Template com modal para preencher os campos
- CA-941.4: Templates salvos em tenant.settings.integrations.drive.templates (array JSON, nao Vault -- nao sao secrets)
- CA-941.5: Botao Testar Template que verifica se o source_id existe e e acessivel pela Service Account (Drive API files.get)

---

**US-942 -- Copiar templates automaticamente ao criar estrutura de pastas**
Como sistema, quero copiar os templates configurados automaticamente apos criar as pastas do job no Drive, para que a estrutura fique completa sem intervencao manual.

Criterios de aceite:
- CA-942.1: Ao final do fluxo create-structure do drive-integration, se tenant.settings.integrations.drive.templates estiver configurado, executar copia automatica dos templates
- CA-942.2: Para cada template: Drive API files.copy com name substituindo placeholders ({JOB_ABA} -> jobs.job_aba, {JOB_CODE} -> jobs.code, {CLIENT} -> clients.name)
- CA-942.3: Arquivo copiado movido para a pasta correta via Drive API files.update (parents) usando drive_folders do job
- CA-942.4: Referencia do arquivo copiado salva em job_files com external_source = 'google_drive' e external_id = copied_file_id
- CA-942.5: Se um template falhar na copia, os demais continuam (nao bloqueia o fluxo inteiro). Erro logado em integration_events
- CA-942.6: Copia automatica pode ser desabilitada com toggle em tenant.settings.integrations.drive.auto_copy_templates (boolean, default true)

---

**US-943 -- Copiar templates manualmente para jobs existentes**
Como coordenador, quero copiar templates para jobs que foram criados antes da configuracao de templates, para nao precisar copiar manualmente arquivos antigos.

Criterios de aceite:
- CA-943.1: Novo endpoint POST /drive-integration/:jobId/copy-templates na Edge Function existente
- CA-943.2: Endpoint aceita payload opcional com lista de template IDs especificos. Se vazio, copia todos os configurados
- CA-943.3: Verificacao de idempotencia: se um template ja foi copiado para aquele job (mesmo source_id em job_files), o arquivo nao e duplicado
- CA-943.4: Botao Copiar Templates disponivel na secao Drive do job detail, visivel para roles admin, ceo, produtor
- CA-943.5: Resposta exibe: X de Y templates copiados, lista de erros (se houver)

---

**US-944 -- Visualizar status dos templates copiados no job detail**
Como coordenador, quero ver no job detail quais templates ja foram copiados para as pastas do job, para saber se a estrutura esta completa.

Criterios de aceite:
- CA-944.1: Secao Templates na aba Drive do job detail lista os templates configurados com status: Copiado (verde) / Nao copiado (cinza) / Erro (vermelho)
- CA-944.2: Para cada template copiado, exibe link para o arquivo no Drive
- CA-944.3: Badge no header da aba Drive indica X/Y templates copiados
- CA-944.4: Se nenhum template configurado no tenant, secao exibe mensagem Configure templates em Configuracoes > Integracoes > Drive

---

**US-945 -- Log de copia de templates**
Como admin, quero ver o historico de copias de templates, para diagnosticar falhas e auditar o processo.

Criterios de aceite:
- CA-945.1: Cada operacao de copia cria registro em integration_events com event_type = drive_copy_templates
- CA-945.2: Payload inclui: job_id, templates_requested, templates_copied, templates_failed, duration_ms
- CA-945.3: Logs visiveis na pagina /settings/integrations aba Drive com filtro de data
- CA-945.4: Erros individuais (ex: source_id nao encontrado, permissao negada) logados com mensagem descritiva

---
### 5.6 F9.6 -- Geracao de Aprovacao Interna PDF (US-951 a US-956)

**Contexto:** O documento de Aprovacao Interna e um PDF formal com todos os dados do job que e gerado para formalizar a aprovacao interna antes de iniciar a producao. Hoje e montado manualmente em Google Docs pelo PE. A Fase 9 automatiza a geracao desse PDF a partir dos dados ja cadastrados no ELLAHOS.

---

**US-951 -- Gerar PDF de aprovacao interna a partir dos dados do job**
Como PE, quero gerar automaticamente o PDF de aprovacao interna com todos os dados do job, para nao ter que montar o documento manualmente no Google Docs.

Criterios de aceite:
- CA-951.1: Botao Gerar Aprovacao Interna no header do job detail (ao lado dos botoes de acao), visivel para roles PE, admin, ceo
- CA-951.2: Ao clicar, chama POST /pdf-generator/aprovacao-interna com job_id
- CA-951.3: Edge Function busca todos os dados do job no banco e gera PDF com layout formatado
- CA-951.4: Dados incluidos no PDF: (1) dados do cliente (razao social, CNPJ, endereco), (2) dados do job (numero, nome, titulo do filme, campanha, produto), (3) diretor, produtora de som, (4) detalhes tecnicos (secundagem, pecas, diarias, datas de filmagem), (5) elenco (tipo, cache), (6) periodo de veiculacao e midias, (7) formato, legendagem, computacao grafica, (8) modelo de contrato
- CA-951.5: PDF gerado com layout profissional: header com logo da produtora (configuravel), tabelas formatadas, tipografia limpa
- CA-951.6: Loading state exibido durante a geracao (~2-5 segundos)

---

**US-952 -- Preview do PDF antes de salvar**
Como PE, quero ver um preview do PDF gerado antes de salvar, para verificar se os dados estao corretos.

Criterios de aceite:
- CA-952.1: Modal de preview exibe o HTML renderizado do PDF (endpoint GET /pdf-generator/preview/aprovacao-interna/:jobId)
- CA-952.2: Botoes no modal: Salvar no Drive (gera PDF final e salva), Baixar PDF (download direto), Fechar
- CA-952.3: Se algum dado obrigatorio estiver faltando no job (ex: cliente sem CNPJ), preview exibe alerta com campos ausentes destacados em amarelo
- CA-952.4: Preview renderizado em iframe sandbox para seguranca

---

**US-953 -- Salvar PDF no Drive e registrar no ELLAHOS**
Como sistema, quero salvar o PDF de aprovacao interna no Drive e registrar no ELLAHOS, para manter historico e rastreabilidade.

Criterios de aceite:
- CA-953.1: PDF salvo na pasta de documentos do job no Drive (folder_key: documentos da tabela drive_folders)
- CA-953.2: Nome do arquivo: Aprovacao_Interna_{JOB_ABA}_{YYYYMMDD}.pdf
- CA-953.3: Referencia salva em job_files com file_type = 'approval_internal', external_source = 'google_drive', external_id = drive_file_id
- CA-953.4: Se ja existe um PDF de aprovacao interna para o job, o novo sobrescreve o anterior (versionamento via job_files -- o anterior nao e deletado, apenas marcado com superseded_by)
- CA-953.5: Registro criado em job_history com action = 'approval_internal_generated' e link para o PDF

---

**US-954 -- Acessar PDFs de aprovacao gerados anteriormente**
Como PE, quero acessar os PDFs de aprovacao interna gerados anteriormente para um job, para consultar versoes passadas.

Criterios de aceite:
- CA-954.1: Secao Aprovacao Interna na aba Documentos do job detail lista todos os PDFs gerados com data e quem gerou
- CA-954.2: Botao Abrir abre o PDF no Drive em nova aba
- CA-954.3: Botao Baixar faz download direto do PDF
- CA-954.4: Badge Ultima versao no PDF mais recente para diferenciar de versoes anteriores

---

**US-955 -- Configurar logo e dados da produtora no PDF**
Como admin, quero configurar o logo e os dados da produtora que aparecem no PDF de aprovacao interna, para personalizar o documento.

Criterios de aceite:
- CA-955.1: Pagina /settings/integrations aba Documentos (nova aba) exibe: campo para upload do logo da produtora (PNG/JPG, max 500KB), campos para razao social, CNPJ, endereco, telefone, email
- CA-955.2: Logo armazenado no Supabase Storage (bucket logos, path {tenant_id}/logo.png)
- CA-955.3: Dados salvos em tenant.settings.company_info (JSON)
- CA-955.4: Preview do PDF usa os dados configurados. Se nao configurados, usa valores padrao da Ellah Filmes

---

**US-956 -- Enviar PDF de aprovacao por email**
Como PE, quero enviar o PDF de aprovacao interna por email para os aprovadores, para formalizar o processo de aprovacao.

Criterios de aceite:
- CA-956.1: Botao Enviar por Email no modal de preview do PDF
- CA-956.2: Modal de envio com campos: destinatarios (email, multi-select com sugestao de CEO e socios do tenant), assunto (pre-preenchido: Aprovacao Interna - {JOB_ABA}), mensagem (editavel)
- CA-956.3: Email enviado via n8n (mesmo fluxo do wf-nf-request, reutilizando a credencial Gmail)
- CA-956.4: PDF anexado ao email (nao apenas link)
- CA-956.5: Registro de envio criado em job_history com action = 'approval_internal_sent' e destinatarios

---
### 5.7 F9.7 -- OCR de NFs com IA (US-961 a US-965)

**Contexto:** Quando uma NF e recebida (F9.1), os dados como numero da NF, valor, CNPJ do emissor e data de emissao precisam ser preenchidos manualmente. A Fase 9 usa Claude Vision para extrair esses dados automaticamente do PDF, apresentando como sugestao que requer validacao humana.

---

**US-961 -- Extrair dados de NF via Claude Vision**
Como sistema, quero extrair automaticamente os dados estruturados de um PDF de NF usando IA, para preencher os campos sem digitacao manual.

Criterios de aceite:
- CA-961.1: Endpoint POST /nf-processor/ocr-analyze recebe nf_document_id e processa o PDF associado
- CA-961.2: PDF convertido para imagem (PNG) antes de enviar para Claude -- conversao via n8n (ImageMagick/Ghostscript na VPS) ou via library no Deno
- CA-961.3: Prompt estruturado enviado ao Claude Sonnet via Vision API solicitando: nf_number, nf_value (numerico), issuer_name (razao social), issuer_cnpj, issue_date (YYYY-MM-DD), service_description
- CA-961.4: Resposta do Claude parseada e salva em nf_documents.extracted_data (JSONB)
- CA-961.5: Campo match_confidence atualizado com base na qualidade da extracao (1.0 se todos os campos extraidos, proporcional se parcial)
- CA-961.6: Status do nf_document NAO muda automaticamente -- dados extraidos sao apenas sugestao

---

**US-962 -- Exibir dados extraidos por OCR na UI de validacao**
Como financeiro, quero ver os dados extraidos pela IA ao lado do PDF original, para validar rapidamente se a extracao esta correta.

Criterios de aceite:
- CA-962.1: Modal de validacao de NF (NfValidationDialog) exibe secao Dados Extraidos por IA com os campos: numero, valor, CNPJ, razao social, data emissao
- CA-962.2: Campos pre-preenchidos com os valores extraidos (editaveis antes de confirmar)
- CA-962.3: Indicador de confianca por campo: verde (alta), amarelo (media), vermelho (baixa/nao encontrado)
- CA-962.4: Botao Aceitar Sugestao preenche todos os campos de uma vez
- CA-962.5: Se OCR ainda nao foi executado para aquela NF, exibe botao Analisar com IA

---

**US-963 -- Configurar OCR automatico ou sob demanda**
Como admin, quero configurar se o OCR deve rodar automaticamente ao receber NFs ou apenas sob demanda, para controlar custos com IA.

Criterios de aceite:
- CA-963.1: Toggle OCR automatico de NFs em /settings/integrations aba IA / NF
- CA-963.2: Com toggle ativo, o endpoint ocr-analyze e chamado automaticamente apos cada ingest (via integration_events com event_type = nf_ocr_analyze)
- CA-963.3: Com toggle desativado, OCR so e executado quando o usuario clica Analisar com IA no modal de validacao
- CA-963.4: Exibir estimativa de custo mensal baseada no volume de NFs processadas (custo medio ~R$0,05 por NF)
- CA-963.5: Configuracao salva em tenant.settings.nf_processor.auto_ocr (boolean, default false)

---

**US-964 -- Fallback para preenchimento manual**
Como financeiro, quero preencher os dados da NF manualmente quando o OCR falhar ou nao estiver disponivel, para nao ficar bloqueado.

Criterios de aceite:
- CA-964.1: Modal de validacao sempre permite preenchimento manual dos campos (nf_number, nf_value, nf_issuer_cnpj, nf_issuer_name, nf_issue_date) independente do OCR
- CA-964.2: Se Claude API estiver indisponivel, botao Analisar com IA exibe mensagem Servico de IA temporariamente indisponivel em vez de erro generico
- CA-964.3: Campos preenchidos manualmente marcados com match_method = 'manual' para diferenciar de dados extraidos por OCR (match_method = 'ocr_ai')

---

**US-965 -- Rate limiting e controle de custo do OCR**
Como admin, quero que o sistema limite o uso do OCR para evitar custos excessivos, para manter o orcamento sob controle.

Criterios de aceite:
- CA-965.1: Limite de 200 analises OCR por mes por tenant (configuravel em tenant.settings.nf_processor.ocr_monthly_limit)
- CA-965.2: Cada analise registrada em ai_usage_logs (tabela existente da Fase 8) com feature = 'nf_ocr'
- CA-965.3: Ao atingir 80% do limite, notificacao in-app para admin
- CA-965.4: Ao atingir 100% do limite, OCR automatico desativado ate proximo mes. OCR manual ainda permitido com aviso Limite mensal atingido -- uso adicional sera cobrado
- CA-965.5: Dashboard de uso em /settings/integrations aba IA / NF com grafico de consumo mensal

---
### 5.8 F9.8 -- Geracao de Claquete (US-971 a US-974)

**Contexto:** A claquete e o documento visual usado no set de filmagem com os dados do job (titulo, duracao, produto, cliente, diretor, diaria). Hoje e gerada via Apps Script usando um template Google Slides. A Fase 9 automatiza essa geracao via n8n (wf-claquete) usando Google Slides API para substituir placeholders e exportar como PDF e PNG.

---

**US-971 -- Gerar claquete a partir dos dados do job**
Como coordenador, quero gerar a claquete do job automaticamente a partir dos dados do ELLAHOS, para nao precisar preencher manualmente no Google Slides.

Criterios de aceite:
- CA-971.1: Botao Gerar Claquete na aba Geral do job detail, visivel para roles PE, coordenador, admin
- CA-971.2: Ao clicar, chama endpoint que enfileira integration_event com event_type = claquete_generate e payload com job_id
- CA-971.3: Workflow n8n wf-claquete recebe o webhook, copia o template de claquete do Slides, substitui placeholders ({TITULO}, {DURACAO}, {PRODUTO}, {CLIENTE}, {DIRETOR}, {DIARIA}, {DATA}, {PECAS})
- CA-971.4: Slides exportado como PDF e PNG via Google Slides API
- CA-971.5: Arquivos salvos na pasta de documentos do job no Drive
- CA-971.6: Referencia salva em job_files com file_type = 'claquete'

---

**US-972 -- Configurar template de claquete**
Como admin, quero configurar qual template de claquete usar, para personalizar o visual por tenant.

Criterios de aceite:
- CA-972.1: Campo ID do Template de Claquete em /settings/integrations aba Drive (ou aba Documentos)
- CA-972.2: Template deve ser um Google Slides com placeholders no formato {CAMPO}
- CA-972.3: Lista de placeholders suportados exibida na pagina de configuracao: {TITULO}, {DURACAO}, {PRODUTO}, {CLIENTE}, {AGENCIA}, {DIRETOR}, {PE}, {DIARIA}, {DATA}, {PECAS}, {JOB_CODE}
- CA-972.4: Botao Testar Template que gera uma claquete de teste com dados ficticios
- CA-972.5: Template ID salvo em tenant.settings.documents.claquete_template_id

---

**US-973 -- Visualizar e baixar claquete gerada**
Como coordenador, quero visualizar e baixar a claquete gerada para enviar para o set de filmagem.

Criterios de aceite:
- CA-973.1: Apos geracao, modal exibe preview da claquete (PNG) e botoes: Baixar PDF, Baixar PNG, Abrir no Drive
- CA-973.2: Claquetes anteriores do job listadas na secao Claquete da aba Documentos
- CA-973.3: Se ja existe claquete para o job, botao muda para Regerar Claquete com aviso de que a anterior sera mantida como versao antiga
- CA-973.4: PNG otimizado para compartilhamento via WhatsApp (resolucao adequada, tamanho < 2MB)

---

**US-974 -- Gerar claquete para diaria especifica**
Como coordenador, quero gerar claquetes diferentes para cada diaria de filmagem quando o job tem multiplas diarias, para que cada diaria tenha sua propria claquete com data correta.

Criterios de aceite:
- CA-974.1: Se o job tem multiplas diarias em job_shooting_dates, o botao Gerar Claquete abre seletor de diaria
- CA-974.2: Usuario pode selecionar uma diaria especifica ou todas
- CA-974.3: Para cada diaria selecionada, uma claquete e gerada com o placeholder {DIARIA} substituido pelo numero da diaria e {DATA} pela data correspondente
- CA-974.4: Claquetes de multiplas diarias geradas em batch (uma por diaria) com progress indicator

---
### 5.9 F9.9 -- Persistir Volume Docker Evolution API (US-981 a US-983)

**Contexto:** A Evolution API roda em Docker na VPS Hetzner. Atualmente, o volume nao esta persistido, o que significa que ao reiniciar o container Docker, a sessao WhatsApp e perdida e o QR Code precisa ser reatrelado manualmente. Isso causa downtime nos workflows que dependem do WhatsApp (JOB_FECHADO_CRIACAO, notificacoes).

---

**US-981 -- Persistir volume Docker da Evolution API**
Como admin, quero que a sessao WhatsApp da Evolution API persista entre reinicializacoes do Docker, para eliminar a necessidade de reatrelar o QR Code manualmente.

Criterios de aceite:
- CA-981.1: docker-compose.yml da Evolution API atualizado com volume bind mount para o diretorio de dados da instancia
- CA-981.2: Diretorio do host: /opt/evolution-api/data (ou equivalente configurado na VPS)
- CA-981.3: Apos reiniciar o container (docker compose restart), a sessao WhatsApp permanece ativa sem necessidade de re-escanear QR Code
- CA-981.4: Backup do volume incluido no script de backup da VPS (se existir)
- CA-981.5: Documentacao do procedimento em docs/infra/evolution-api-docker.md

---

**US-982 -- Healthcheck da Evolution API**
Como admin, quero que o sistema monitore se a Evolution API esta ativa e a sessao WhatsApp conectada, para ser alertado antes que os workflows falhem.

Criterios de aceite:
- CA-982.1: Endpoint de healthcheck da Evolution API verificado a cada 5 minutos (via n8n schedule ou pg_cron)
- CA-982.2: Verificar: (a) container rodando (HTTP 200 no /), (b) sessao WhatsApp conectada (API status endpoint)
- CA-982.3: Se sessao desconectada, notificacao in-app para admin com acao rapida Verificar Evolution API
- CA-982.4: Status da conexao visivel em /settings/integrations aba WhatsApp com ultimo check e historico de uptime

---

**US-983 -- Procedimento de recuperacao documentado**
Como admin, quero ter documentacao clara do procedimento de recuperacao quando a sessao WhatsApp for perdida, para resolver rapidamente.

Criterios de aceite:
- CA-983.1: Documentacao em docs/infra/evolution-api-docker.md com: comandos para verificar status do container, procedimento para re-escanear QR Code, como verificar que a sessao esta ativa via API
- CA-983.2: Pagina /settings/integrations aba WhatsApp exibe link para a documentacao de troubleshooting
- CA-983.3: Botao Gerar novo QR Code (admin only) que chama Evolution API para iniciar nova sessao

---

## 6. Requisitos Nao-Funcionais

### 6.1 Performance

| Fluxo | Latencia maxima | Frequencia estimada |
|-------|----------------|---------------------|
| Email NF recebido -> aparece na UI | < 10 min (polling 5 min + processamento) | ~30-100 NFs/mes |
| Pedido de NF -> email enviado | < 2 min | ~30-100/mes |
| Contrato DocuSeal criado | < 30 seg | ~10-50/mes |
| Webhook DocuSeal -> status atualizado | < 5 min | ~10-50/mes |
| PDF aprovacao interna gerado | < 10 seg | ~20-50/mes |
| Templates Drive copiados | < 30 seg | ~10-20/mes |
| Claquete gerada (Slides -> PDF + PNG) | < 60 seg | ~10-30/mes |
| OCR de NF (Claude Vision) | < 30 seg | ~30-100/mes |

### 6.2 Disponibilidade e Resiliencia

- Falha em integracao externa (Gmail, DocuSeal, Drive, Slides API) NAO bloqueia operacoes do ELLAHOS
- Retry automatico com backoff exponencial para todas as integration_events (padrao ADR-003)
- Max 5 tentativas por evento. Apos falha permanente, notificacao in-app para admin
- Fallback manual disponivel para todos os fluxos automatizados (upload manual de NF, envio manual de email, preenchimento manual de dados)

### 6.3 Seguranca

- Webhooks autenticados: n8n via X-Cron-Secret, DocuSeal via HMAC signature
- Dados sensiveis (CPF, CNPJ, dados bancarios) protegidos por RLS, nunca em logs
- Tokens e secrets armazenados no Supabase Vault, nunca no frontend
- Emails de fornecedores: validacao de formato antes de envio
- Input sanitization: nomes de arquivos, HTML de emails, webhook payloads validados com Zod
- Rate limiting: ingest 100/h, request-send 50/h, docuseal 20/h, webhook 200/h por IP

### 6.4 Idempotencia

| Operacao | Chave de deduplicacao | Comportamento |
|----------|----------------------|---------------|
| Ingest NF | file_hash (SHA-256) | Retorna registro existente |
| Pedido NF | financial_record_id + data | Idempotency key no integration_events |
| DocuSeal submission | job_id + person_id + template_id | Verifica se ja existe submission ativa |
| Drive copy template | job_id + source_id | Verifica se arquivo ja existe na pasta |
| PDF aprovacao | job_id + tipo | Sobrescreve anterior, versiona em job_files |

### 6.5 Observabilidade

- Todos os fluxos automatizados geram registro em integration_events (audit trail)
- Metricas de sucesso/falha visiveis em /settings/integrations por aba
- n8n: execucoes visiveis na UI do n8n com alertas para falhas
- Admin notificado via app para falhas permanentes

---

## 7. Sub-fases de Implementacao

A implementacao segue o plano detalhado em docs/architecture/fase-9-execution-plan.md.

| Sub-fase | Escopo | Prioridade | Dependencias |
|----------|--------|------------|-------------|
| 9.1 | Schema + _shared modules | Foundation | Nenhuma |
| 9.2 | Fluxo NF: recebimento (Edge Function + n8n + frontend) | P0 | 9.1 |
| 9.3 | Pedido NF: envio email (Edge Function + n8n + frontend) | P0 | 9.1 |
| 9.4 | Conectar wf-job-approved ao JOB_FECHADO_CRIACAO | P0 | Nenhuma |
| 9.5 | DocuSeal Contracts (Edge Function + n8n + frontend) | P1 | 9.1 |
| 9.6 | Drive Template Copy (Edge Function + frontend) | P1 | 9.1 |
| 9.7 | Aprovacao Interna PDF (Edge Function + frontend) | P1 | 9.1 |
| 9.8 | QA + Polish + Security Review | QA | 9.2-9.7 |
| 9.9 | OCR NFs + Claquete + Docker Volume | P2 | 9.2 (OCR) |

**Paralelismo:** Sub-fases 9.2, 9.3 e 9.4 sao independentes apos 9.1. Sub-fases 9.5, 9.6 e 9.7 tambem sao independentes. Com paralelismo maximo, o cronograma cai de ~37 para ~15-18 dias uteis.

---

## 8. Riscos e Mitigacoes

| # | Risco | Prob. | Impacto | Mitigacao |
|---|-------|-------|---------|-----------|
| R1 | Gmail OAuth token expira sem aviso | Media | Alto (NFs param de ser processadas) | Refresh token automatico no n8n + notificacao se refresh falhar + healthcheck diario |
| R2 | DocuSeal self-hosted cai | Baixa | Medio (contratos param) | Healthcheck periodico + retry automatico + botao reenviar manual |
| R3 | Volume Docker Evolution API nao persistido (estado atual) | Alta | Alto (sessao WhatsApp perdida a cada restart) | Resolver na 9.9 como P2. Documentar procedimento de recuperacao |
| R4 | Formato de NF varia entre fornecedores | Alta | Baixo (match automatico falha) | Match manual via UI sempre disponivel. OCR e sugestao, nao decisao final |
| R5 | Z-API descontinua ou muda pricing | Baixa | Alto (JOB_FECHADO_CRIACAO para) | Interface abstrata IWhatsAppProvider ja existe (ADR-008). Migrar para Evolution API na Fase 10 |
| R6 | Gmail rate limit (500 msgs/dia) | Baixa | Medio (pedidos NF bloqueados) | Agrupar itens por fornecedor em 1 email. Monitorar cota |
| R7 | jspdf insuficiente para layout PDF | Media | Baixo (layout simples na v1) | Fallback: n8n + Puppeteer na VPS (ADR-020) |
| R8 | n8n VPS fica sem espaco em disco | Baixa | Alto (tudo para) | PDFs armazenados no Drive, nao no n8n. Monitorar disco |
| R9 | Emails de NF nao seguem padrao esperado | Alta | Medio (match automatico falha) | Fila de revisao manual. Treinar fornecedores com template padrao |
| R10 | Claude Vision OCR impreciso para NFs escaneadas | Media | Baixo (OCR e sugestao) | Validacao humana sempre obrigatoria. Campo de confianca visivel |

---

## 9. Scope Exclusions (O que NAO faz parte da Fase 9)

| Item excluido | Razao | Quando |
|---------------|-------|--------|
| Migracao de Z-API para Evolution API | Escopo grande, requer rewrite do JOB_FECHADO_CRIACAO | Fase 10 |
| Multi-tenant real (dominio customizado, billing) | Escopo de plataforma, nao operacional | Fase 10 |
| App mobile / PWA offline | Nao relacionado a automacoes operacionais | Fase 11+ |
| Alterar workflows n8n existentes (JOB_FECHADO_CRIACAO, WORKFLOW_PRINCIPAL, TESTE2_JURIDICO) | Risco de quebrar fluxos em producao. Apenas chamar como sub-workflow | Nunca na Fase 9 |
| Integracao com sistemas de contabilidade (Conta Azul, Omie) | Fora do escopo de automacoes operacionais | Fase 11+ |
| Geracao de callsheet (PDF completo de producao) | Complexidade alta, layout rico. Avaliar apos v1 do pdf-generator | Fase 10+ |
| Assinatura digital de contratos de equipe tecnica (template diferente) | Template DocuSeal nao existe ainda. Apenas elenco na v1 | Fase 9 P1 cobre apenas elenco. Equipe tecnica quando template estiver pronto |
| Integracao com Pipefy, Monday ou ClickUp | ELLAHOS substitui essas ferramentas, nao integra com elas | Nunca |
| Notificacoes via WhatsApp (mensagens automaticas de status) | Depende de Evolution API estavel + volume persistido | Fase 10 |
| Relatorios automatizados por email (report semanal) | Nice-to-have, nao e automacao operacional critica | Fase 11+ |

---

## 10. Metricas de Sucesso

### 10.1 Metricas Operacionais (medir apos 30 dias de uso)

| Metrica | Baseline (atual) | Meta | Como medir |
|---------|------------------|------|------------|
| Tempo para processar NF recebida | ~2-4 horas (manual) | < 10 min (automatico) | Diferenca entre received_at e confirmed_at em nf_documents |
| NFs processadas automaticamente (sem revisao manual) | 0% | > 60% | nf_documents com status auto_matched que foram confirmados sem alteracao |
| Tempo para enviar pedido de NF | ~30 min (GG_ + email manual) | < 2 min (1 clique) | Tempo entre selecao e envio confirmado |
| Contratos DocuSeal assinados | 0 (manual por email) | > 80% em 7 dias | docuseal_submissions com signed_at < 7 dias apos sent_at |
| Templates copiados automaticamente | 0% | 100% dos novos jobs | job_files com file_type template / total de jobs criados |
| PDFs de aprovacao gerados pelo sistema | 0 (manual) | 100% dos jobs aprovados | job_files com file_type approval_internal / jobs com status aprovado |
| Grupos WhatsApp criados automaticamente | 0% (planilha) | 100% dos jobs aprovados | integration_events com type whatsapp_groups_created / transicoes para status aprovado |

### 10.2 Metricas Tecnicas

| Metrica | Meta |
|---------|------|
| Uptime dos workflows n8n | > 99% |
| Taxa de sucesso do match automatico de NF | > 60% |
| Tempo medio de geracao de PDF | < 5 seg |
| Taxa de erro em webhooks DocuSeal | < 1% |
| Falhas permanentes (apos 5 retries) por semana | < 2 |

### 10.3 Criterio de Conclusao da Fase 9

A Fase 9 e considerada concluida quando:
1. **P0 completo:** Fluxo NF (recebimento + pedido) e wf-job-approved funcionando em producao
2. **P1 completo:** DocuSeal, Drive templates e PDF aprovacao funcionando em producao
3. **QA verde:** Zero bugs Blocker ou Critical abertos
4. **Security review:** Nenhum finding critico aberto
5. **Documentacao:** ADRs 018-021 escritos, CLAUDE.md e MEMORY.md atualizados
6. **P2 entregues ou documentados:** OCR, claquete e Docker volume implementados ou com justificativa de adiamento

---

## 11. Perguntas Abertas

| # | Pergunta | Status | Decisao |
|---|----------|--------|---------|
| 1 | Gmail: usar OAuth do usuario ou Service Account com domain-wide delegation? | DECIDIDO | OAuth via n8n (financeiro@ellahfilmes.com). Mais simples, n8n gerencia o token. |
| 2 | DocuSeal: campo whatsapp_groups em jobs -- JSONB direto ou tabela separada? | ABERTO | Recomendar JSONB em jobs.metadata por simplicidade (4 grupos fixos). Se crescer, migrar para tabela. |
| 3 | Templates Drive: manter files.copy ou usar Sheets API para duplicar planilhas com dados? | DECIDIDO | files.copy -- mais simples, funciona para Sheets e Docs. Dados especificos do job preenchidos depois manualmente. |
| 4 | PDF: usar jspdf direto ou delegar para n8n + Puppeteer? | DECIDIDO | v1 com jspdf na Edge Function. Fallback para n8n se layout insuficiente (ADR-020). |
| 5 | OCR: rodar na Edge Function ou no n8n? | DECIDIDO | Conversao PDF->PNG no n8n (Ghostscript). Chamada Claude na Edge Function (reutiliza claude-client existente). |

---

*Documento gerado pelo PM Agent -- ELLAHOS. Ultima atualizacao: 25/02/2026.*
