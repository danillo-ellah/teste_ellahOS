# Análise do Ecossistema Google/Apps Script da Ellah Filmes
## Briefing para Claude Code — Fase 5: Integrações Core

**Data:** 19/02/2026
**Objetivo:** Mapear tudo que existe hoje no Google Workspace da Ellah para que a Fase 5 do ELLAHOS integre/substitua corretamente.

---

## 1. VISÃO GERAL — O que existe hoje

A Ellah Filmes opera com um ecossistema de Google Sheets + Apps Script + Google Forms + Drive que funciona como um ERP caseiro. Tudo gira em torno de **uma planilha mestre por job** (o "GG") e uma **planilha de controle geral** com todos os jobs.

### Planilhas-chave:
| Planilha | Função | Dados |
|----------|--------|-------|
| CRIAÇÃO PASTA E CONTROLE DE JOB | Master list de todos os jobs (40+ jobs) | INDEX, número, nome, cliente, agência, valor, diretor, PE, status, fase, URLs de todas as pastas/docs |
| GG_{JOB} | Planilha operacional por job (o "carro-chefe") | 8 abas: OC, CUSTOS_REAIS, EQUIPE, PRODUCAO, DEPOSITOS, PEDIDO EMISSAO NF, CALENDARIO, DASHBOARD |
| BANCO DE DADOS EQUIPE | Banco central de freelancers (~286 pessoas) | Nome, função, CPF, RG, nascimento, DRT, endereço, email, telefone, CTPS, cachê, banco, PIX |
| CADASTRO ELENCO_{JOB} | Elenco por job + dados de agências | Nome, tipo (principal/figurante), CPF, RG, valores (prestação, imagem, taxa), diárias |
| CRONOGRAMA_{JOB} | Timeline do job | Fases (assinatura → briefing → pré → filmagem → pós → entrega), datas, dias úteis |

---

## 2. PLANILHA DE CONTROLE DE JOBS — Estrutura completa (50 colunas)

Esta é a "tabela jobs" do mundo Google. Campos que já existem no ELLAHOS estão marcados.

| Coluna | Campo | Já no ELLAHOS? | Observação |
|--------|-------|----------------|------------|
| A | INDEX | ✅ (id interno) | Sequencial 1,2,3... |
| B | NUMERO DO JOB | ✅ (code) | Igual ao index |
| C | NOME DO JOB | ✅ (title) | |
| D | AGENCIA | ✅ (agency) | |
| E | CLIENTE | ✅ (client_name) | |
| F | VALOR FECHADO | ✅ (closed_value) | |
| G | PLANILHA PRODUCAO | ❌ | Link para o GG desse job |
| H | JOB_ABA | ❌ | Slug tipo "038_Quer_Fazer_Senac" |
| I | EMAIL DO ATENDIMENTO | ❌ | Email do contato na agência |
| J | Valor Produção | ✅ (production_cost) | |
| K | Valor Imposto | ❌ | Calculado |
| L | Valor W | ❌ | "Valor W" = margem? |
| M | Valor Liquido | ❌ | Calculado |
| N | DIRETOR | ✅ (director) | |
| O | PRODUTOR EXECUTIVO | ✅ (executive_producer) | |
| P | DATA DE ENTREGA FINAL | ✅ (delivery_date) | |
| Q | LINK DO BOARD TRELLO | ❌ | Migrar para ELLAHOS? |
| R | CONTRATOS | ❌ | Link pasta contratos |
| S | DATA_PAGAMENTO | ❌ | Data que o cliente paga |
| T | URL_ENTREGAS_FINAIS | ❌ | Link pasta entregas |
| U | CATEGORIA DE JOB | ✅ (category) | |
| V | NÍVEL DE COMPLEXIDADE | ✅ (complexity) | |
| W | AUDIO | ❌ | Produtora de áudio |
| X | FASE | ✅ (phase/status) | |
| Y | STATUS | ✅ (status) | "✅ Concluído", etc |
| Z | NUMERO ANCINE | ❌ | CRT para registro na Ancine |
| AA-AK | URLs (roteiro, elenco, equipe, PPM, etc) | ❌ | 15+ URLs para subpastas/docs do Drive |
| AL | RESPONSÁVEL COMERCIAL | ❌ | |
| AM | VALIDADE PROPOSTA | ❌ | |
| AN | TIPO DE PROJETO | ❌ | |
| AO | TIPO DE MÍDIA | ❌ | |
| AP-AR | Mockup, cenografia, comp gráfica | ❌ | |
| AS | PASTA_URL | ❌ → 🎯 drive_folder_url | URL raiz da pasta do job no Drive |
| AT | OBSERVAÇÕES COMERCIAIS | ❌ | |
| AU | URL_CARTA_ORCAMENTO | ❌ | |
| AW | URL_EQUIPE_DO_JOB_ATUAL | ❌ | Link para form de equipe |

**🎯 Insight para Fase 5:** A coluna PASTA_URL é exatamente o `drive_folder_url` planejado. As 15+ URLs de subpastas (AA-AK) confirmam que a estrutura de pastas no Drive é muito mais granular que as 9 subpastas planejadas.

---

## 3. GG (PLANILHA OPERACIONAL) — 8 Abas

### 3.1 OC (Orçamento)
- Cabeçalho: Título, Número Job, Cliente, Agência, Secundagem, Atendimento
- Estrutura de orçamento por itens/subitens

### 3.2 CUSTOS_REAIS (34 colunas) — ⭐ MAIS IMPORTANTE
Controle financeiro real de cada custo do job:

| Colunas | Campos |
|---------|--------|
| A-D | ID, JOB ID, Item, Sub Item |
| E | Destino da Verba (ex: "Uber equipe", "Verba de Arte") |
| F-I | Valor Unitário, Qtde, Valor Total s/HE, Valor TOTAL |
| J-K | Fornecedor, C/NF ou S/NF |
| L-P | Hora Entrada, Hora Saída, Total Horas, Horas Extras, Valor HE |
| Q | Observações |
| R | DATA PAGAMENTO |
| S-AB | Dados bancários do fornecedor (telefone, email, razão, CPF/CNPJ, banco, agência, conta, PIX) |
| AC | PEDIDO NF (status: "PEDIDO") |
| AD | FORNECEU NF? ("SIM"/"NÃO") |
| AE | NF (link do arquivo) |
| AF | PAGO? |
| AG | Quando? |
| AH | COMPROVANTE PAGAMENTO |

**🎯 Insight:** Esta aba é o coração do financeiro. O fluxo PEDIDO NF → FORNECEU NF → PAGO já tem automação via Apps Script (enviar email, buscar resposta no Gmail, salvar PDF no Drive).

### 3.3 EQUIPE
Lista simplificada: Nome, Email, Banco, PIX (puxa do banco de dados central)

### 3.4 PRODUCAO
Mega planilha (102 colunas!) com subpastas: Produtor, Figurino, Arte, Objeto

### 3.5 DEPOSITOS
Controle de pagamentos feitos: INDEX, JOB ID, ITEM, CACHE/VERBA, DEPOSITADO, Quando, COMPROVANTE

### 3.6 PEDIDO EMISSAO NF
Interface para gerar pedido de NF por fornecedor. Campos: INDEX → puxa dados do CUSTOS_REAIS → gera email com tabela formatada → envia ao fornecedor → acompanha resposta

### 3.7 CALENDARIO
Datas de pagamento do job com valores. Usado para criar eventos no Google Calendar com lembretes (10 dias, 3 dias, 1 dia antes).

### 3.8 DASHBOARD
(Vazia no exemplo — provavelmente tem gráficos/pivot tables)

---

## 4. APPS SCRIPTS — O que cada um faz

### 4.1 Gerador de Claquete (`gerarClaqueteInterface`)
- **Input:** Planilha "Dados" com info do filme (título, duração, produto, cliente, diretor, tipo, etc)
- **Processo:** Copia template do Google Slides → substitui placeholders → exporta PDF + PNG
- **Output:** PDF e PNG na pasta do job (ID vem de CODIGO_ROBO.B1)
- **🎯 Relevância Fase 5:** Baixa para agora. Mas o template de claquete poderia ser gerado automaticamente ao criar o job no ELLAHOS.

### 4.2 Gerador de Contratos de Elenco (`gerarContratos`)
- **Input:** Aba ELENCO (dados pessoais, valores) + aba CODIGO_ROBO (IDs das pastas/docs)
- **Processo:** 
  - Lê dados do cliente/agência de um Google Doc separado ("Docs - Fonte") via regex
  - Para cada ator na planilha: copia template Google Docs → substitui 40+ placeholders → gera PDF
  - Inclui: valor por extenso, formatação BR de moeda, data formatada
- **Output:** PDFs de contratos individuais na pasta do job
- **🎯 Relevância Fase 5:** ALTA — quando DocuSeal for implementado (fase futura), esse fluxo será substituído. Por ora, manter como está.
- **⚠️ Nota:** Já existe aba DOCUSEAL_LOG no cadastro de elenco — indica que já começaram a testar DocuSeal!

### 4.3 Pedido e Processamento de NF (`verificarRespostasEProcessarNFEmLote`)
- **Input:** CUSTOS_REAIS com status "PEDIDO" na coluna AC
- **Processo COMPLEXO:**
  1. Para cada item com status "PEDIDO", busca no Gmail por emails com o assunto correspondente
  2. Se encontra resposta com PDF anexo → salva na pasta do job → atualiza planilha (NF link, status "SIM")
  3. Se não encontra por assunto → busca por email do fornecedor
  4. Arquivos duvidosos vão para pasta temporária → abre interface HTML de revisão
  5. Interface permite aprovar (mover para pasta do job) ou descartar
- **Output:** PDFs de NF organizados, planilha atualizada
- **🎯 Relevância Fase 5:** MÉDIA — o fluxo de NF pode ser parcialmente automatizado via n8n (monitorar Gmail → salvar no Drive → atualizar ELLAHOS). Mas é complexo.

### 4.4 OCR de Notas Fiscais (`processarNotas`)
- **Input:** Links de PDFs na coluna AE do CUSTOS_REAIS
- **Processo:** Para cada PDF → OCR via api.ocr.space → extrai valor com regex → preenche coluna AL
- **Output:** Valores extraídos automaticamente
- **🎯 Relevância Fase 5:** BAIXA por agora. Futuramente poderia usar IA para extrair dados de NFs.

### 4.5 Google Calendar (`criarEventosNoGoogleAgenda`)
- **Input:** Aba CALENDARIO do GG
- **Processo:** Para cada data com valor > 0 → cria evento no Google Calendar às 14h com lembretes
- **🎯 Relevância Fase 5:** MÉDIA — o ELLAHOS deveria ter notificações de prazo de pagamento (deadline_approaching, já planejado).

### 4.6 Envio de Email de Pedido NF (`enviarEmail`)
- **Input:** Aba PEDIDO EMISSAO NF
- **Processo:** Monta email HTML com tabela formatada + assinatura → mostra preview → envia pelo Gmail → atualiza status "PEDIDO" no CUSTOS_REAIS
- **🎯 Relevância Fase 5:** MÉDIA — pode ser orquestrado via n8n (workflow de pedido de NF).

### 4.7 Processador de Equipe (`processarColaboradores`)
- **Input:** Respostas do formulário de equipe do job
- **Processo:** 
  - Se "Já trabalhou? = Sim" → puxa dados do banco central pelo nome
  - Se "Não" → cadastra novo no banco central
  - Preenche a planilha do projeto com dados do banco
- **🎯 Relevância Fase 5:** ALTA — o ELLAHOS já tem `team_members` e `profiles`. Esse fluxo confirma a necessidade de um cadastro de equipe integrado.

---

## 5. FORMULÁRIOS E FLUXOS

### Form de Cadastro de Equipe (por job)
- Pergunta: "Já trabalhou com a gente antes?"
  - **Sim** → seleciona nome → puxa dados do banco
  - **Não** → preenche tudo (nome, CPF, RG, endereço, banco, PIX...)
- **Problema reportado:** "às vezes buga" — o Apps Script processarColaboradores corrige
- **🎯 Insight:** O ELLAHOS pode resolver isso nativamente com autocomplete de `profiles`

### Banco de Dados de Equipe
- ~286 profissionais cadastrados
- Campos: Nome, Função, CPF, RG, Nascimento, DRT, Endereço, Cidade, CEP, Email, Telefone, CTPS, Série, Valor, Diárias, Banco, Agência, Conta, C/C ou C/P, PIX
- **🎯 Insight:** Muito disso já está na tabela `profiles` do ELLAHOS. Faltam campos financeiros (banco, agência, conta, PIX) que são essenciais para o fluxo de pagamento.

---

## 6. DOCUMENTOS DO JOB

### Aprovação Interna
PDF gerado com todas as informações do job:
- Dados do cliente/anunciante (razão social, CNPJ, endereço)
- Dados do job (número, nome, título do filme, campanha, produto)
- Diretor, produtora de som
- Detalhes técnicos: secundagem, peças, diárias, datas filmagem
- Elenco (com texto? menor?), período veiculação, mídias
- Formato, legendagem, computação gráfica, modelo contrato
- **🎯 Relevância:** Este documento é basicamente um "resumo do job" que poderia ser gerado automaticamente pelo ELLAHOS

### Pedido de ANCINE
Formulário com dados para registro na ANCINE:
- Produtora, agência, anunciante, diretor
- Dados da obra (título, duração, suporte, mídias, ano)
- **🎯 Relevância:** Campo `numero_ancine` existe na planilha de controle mas não no ELLAHOS

### Contrato de Elenco
Contrato formal completo (8 páginas) com:
- Quadro 1: Qualificação das partes (produtora, agência, anunciante, contratado)
- Quadro 2: Serviço e qualificação da obra
- Quadro 3: Valor do contrato (prestação + imagem + agenciamento)
- Quadro 4: Observações
- Quadro 5: Cláusulas (14 cláusulas completas)
- **🎯 Relevância:** DocuSeal (deferido). Mas os DADOS vêm do ELLAHOS.

---

## 7. ESTRUTURA DE PASTAS NO DRIVE (Inferida)

Com base nas URLs da planilha de controle e nos Apps Scripts:

```
{JOB_CODE} - {TITULO}/
├── Roteiro/
├── Cadastro Elenco/        (planilha + contratos PDF)
├── Cadastro Equipe/        (form respostas)
├── PPM/
├── Pré-Produção/
│   ├── PD/
│   ├── Arte/
│   └── Figurino/
├── Fechamento/
│   ├── PD/
│   ├── Arte/
│   └── Figurino/
├── Cronograma/
├── Material Bruto/
├── Entregas Finais/
├── Carta Orçamento/
├── Contratos/              (PDFs gerados)
├── Notas Fiscais/          (PDFs recebidos)
└── Claquetes/              (PDFs/PNGs gerados)
```

**⚠️ IMPORTANTE:** A estrutura real tem MAIS subpastas que as 9 planejadas na Fase 5. São pelo menos 15 subpastas/docs referenciados na planilha de controle.

---

## 8. WORKFLOWS N8N — Análise dos 3 workflows existentes

### 8.1 JOB_FECHADO_CRIACAO (20 nodes)
**Trigger:** Webhook POST
**O que faz:** Quando um job é criado/fechado, automatiza TUDO no WhatsApp:

**Fluxo:**
1. Recebe dados do job via webhook (número, cliente, agência, projeto, links)
2. Monta mensagem rica com emoji + dados + todos os links do job
3. Cria **4 grupos no WhatsApp** automaticamente:
   - 👩‍💼 EXTERNO || {JOB_ABA} — grupo com o cliente
   - 🎬 PRODUCAO || {JOB_ABA} — grupo da equipe de produção
   - ✂️ POS_PD || {JOB_ABA} — grupo de pós-produção
   - 💬 ATENDIMENTO INTERNO || {JOB_ABA} — grupo interno
4. Para cada grupo: Cria → Wait → Dá admin → Muda descrição

**API usada:** Z-API (NÃO Evolution API!)
- URL base: `https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/`
- Endpoints: `send-text`, `create-group`, `add-admin`, `update-group-description`

**⚠️ IMPORTANTE:** O plano da Fase 5 menciona Evolution API, mas o n8n atual usa **Z-API**! Confirmar qual será usado no ELLAHOS.

**Links que o workflow envia na mensagem:**
- Pasta Principal, Planilha Produção, Carta Orçamento, Cronograma
- Roteiro, Cadastro Equipe, Cadastro Elenco, PPM
- Pré PD, Pré Arte, Pré Figurino
- Fechamento PD, Fechamento Arte, Fechamento Figurino
- Equipe do Job

**🎯 Relevância Fase 5:** ALTÍSSIMA — este workflow é exatamente o que a Sub-fase 5.5 quer fazer. Pode ser adaptado para disparar pelo ELLAHOS ao aprovar job.

---

### 8.2 WORKFLOW_PRINCIPAL (95 nodes!) — ⭐ O CÉREBRO
**Trigger:** Webhook POST (recebe mensagens do WhatsApp)
**O que faz:** Um assistente de IA completo via WhatsApp com múltiplos agentes:

**Stack de IA:**
- **4 AI Agents** (LangChain): Supervisora, Especialista Carta Orçamento, Verificador de Transcrição, Classificador
- **LLMs:** OpenAI (GPT), Groq, Anthropic (Claude)
- **Banco Postgres** próprio com tabelas: `usuarios`, `conversas`, `carta_orcamento_versions`, `grupo_inbox`

**Fluxo principal:**
1. Recebe mensagem WhatsApp (texto, áudio, imagem, documento)
2. Se áudio → transcreve (OpenAI Whisper) → verifica qualidade → classifica
3. Se imagem/doc → analisa com OpenAI Vision ou Claude (Anthropic)
4. **AI Supervisora (Ellaih)** classifica a intenção:
   - **Criar job** → coleta dados → chama Apps Script → cria pasta/planilha → dispara JOB_FECHADO_CRIACAO
   - **Status do job** → busca na planilha → responde
   - **Carta orçamento** → AI Especialista gera/edita → salva versões no Postgres → envia PDF via WhatsApp
   - **Consulta projeto** → busca por nome na Google Sheets → retorna info
5. Salva toda conversa no Postgres para histórico/contexto

**Tabelas Postgres (banco separado do Supabase):**
- `usuarios` (id, user_id, nome, papel) — cadastro por WhatsApp
- `conversas` (remetente_id, destinatario_id, job_id, mensagem, tipo) — histórico
- `carta_orcamento_versions` (num_orc, cliente, projeto, versao, texto_md, doc_url, pdf_url)
- `grupo_inbox` (group_id, group_name, sender_id, texto, meta)

**🎯 Relevância Fase 5:**
- A Supervisora IA é um asset enorme — pode ser o ponto de entrada para interação com o ELLAHOS via WhatsApp
- O Postgres separado precisa ser considerado — migrar para Supabase ou manter?
- O fluxo de carta orçamento com versionamento é sofisticado e já funciona
- Calcula até custo de tokens em BRL (busca cotação USD/BRL)

---

### 8.3 TESTE2_JURIDICO_CONTRATO_ELENCO (11 nodes) — DocuSeal
**Trigger:** Manual (em teste)
**O que faz:** Gera e envia contratos de elenco via DocuSeal para assinatura digital

**Fluxo:**
1. Recebe array de contratos a gerar
2. Split por contrato individual
3. Para cada contrato:
   - Valida dados (email, nome, etc)
   - Chama DocuSeal API (`POST /api/submissions`) com template_id: 3
   - Cria submissão com roles: "Modelo(a)/Ator(triz)" + "Produtora"
   - send_email: false, send_sms: false (envia manualmente?)
4. Se erro → loga no Google Sheets (aba DOCUSEAL_LOG)
5. Se sucesso → chama Apps Script para gerar PDF
6. Verifica duplicatas (safe_key)

**DocuSeal config:**
- URL: `https://assinaturas.ellahfilmes.com` (self-hosted!)
- Auth: X-Auth-Token header
- Template: id 3 (contrato de elenco)

**🎯 Relevância Fase 5:** Confirmado como DEFERIDO, mas bom saber que:
- DocuSeal já está self-hosted em assinaturas.ellahfilmes.com
- Template de contrato de elenco já existe (id: 3)
- Lógica de split/validate/log já está pronta no n8n
- Quando for implementar, pode reaproveitar este workflow

---

### 8.4 Resumo: O que o n8n já faz vs. O que o ELLAHOS vai fazer

| Funcionalidade | n8n atual | ELLAHOS Fase 5 |
|----------------|-----------|----------------|
| Criar grupos WhatsApp por job | ✅ Z-API | 🆕 Pode integrar |
| Notificar equipe sobre novo job | ✅ Via grupo | ✅ WhatsApp individual + in-app |
| Assistente IA via WhatsApp | ✅ 4 agents (GPT/Groq/Claude) | ⏳ Fase futura |
| Criar job via WhatsApp | ✅ AI Supervisora | ⏳ Fase 8 |
| Gerar carta orçamento com IA | ✅ AI Especialista | ⏳ Fase futura |
| Classificar docs/imagens recebidos | ✅ Claude/GPT Vision | ⏳ Fase futura |
| DocuSeal contratos elenco | 🧪 Em teste | ⏳ Deferido |
| Criar pastas Drive | ❌ (via Apps Script) | ✅ Sub-fase 5.4 |
| Alertas de margem | ❌ | ✅ Sub-fase 5.5 |
| Notificações in-app | ❌ | ✅ Sub-fase 5.2 |

---

## 9. ⚠️ DESCOBERTAS IMPORTANTES DOS WORKFLOWS

1. **Z-API vs Evolution API:** O n8n usa Z-API, não Evolution API. Precisa alinhar qual será usado na Fase 5. Se já tem Z-API funcionando, pode ser melhor manter.

2. **Postgres separado:** O WORKFLOW_PRINCIPAL usa um Postgres separado (não Supabase) com tabelas próprias (usuarios, conversas, carta_orcamento_versions). Decisão necessária: migrar para Supabase ou manter separado?

3. **IA já existe e é sofisticada:** 4 AI agents, transcrição de áudio, análise de imagem, versionamento de documentos. A Fase 5 precisa ser compatível com isso.

4. **Criação de 4 grupos WhatsApp por job:** Isso não estava no plano da Fase 5. Considerar adicionar?

5. **DocuSeal self-hosted:** Já está em `assinaturas.ellahfilmes.com` com template pronto. Quando for implementar, é só conectar.

---

## 10. INSTRUÇÕES PARA AGENTES ESPECIALIZADOS

> **PM, Tech Lead, Integrations Engineer:** Este documento mapeia o ecossistema real da Ellah Filmes (Google Sheets, Apps Script, Forms, Drive, n8n). Antes de iniciar a implementação da Fase 5, cada agente deve:
>
> 1. **Ler este documento completo** para entender o que já existe e funciona
> 2. **Identificar gaps** entre o que foi planejado na Fase 5 e o que a análise revelou
> 3. **Propor melhorias** na seção abaixo — podem ser ajustes no plano, novos campos, novos fluxos, ou alertas de risco
> 4. **Priorizar** o que entra na Fase 5 vs o que vai para fases futuras
> 5. **Editar este documento diretamente** com suas recomendações nos espaços indicados
>
> O objetivo é que a Fase 5 não apenas implemente o planejado, mas incorpore o conhecimento real de como a Ellah opera hoje.

### 📝 Espaço para Contribuições dos Agentes

#### PM — Product Manager
<!-- PM: Analise os fluxos de usuário mapeados acima. Considere:
- Há algo que muda a priorização das sub-fases?
- O formulário de equipe que "buga" é um pain point crítico — antecipar para Fase 5?
- A estrutura de 9 subpastas planejada precisa virar ~15 (baseado na realidade)?
- O fluxo de pedido de NF é usado diariamente — vale automatizar via n8n agora?
- Google Calendar → notificações ELLAHOS: migrar na Fase 5 ou manter em paralelo?
- O n8n já faz MUITA coisa (95 nodes no workflow principal!) — risco de duplicar lógica?
- Os alertas de prazo/pagamento são um quick win de alto valor?
-->

_Pendente: PM deve revisar e adicionar suas recomendações aqui._

#### Tech Lead
<!-- Tech Lead: Revise a arquitetura considerando:
- A planilha CUSTOS_REAIS tem 34 colunas de dados financeiros que eventualmente migrarão — isso impacta o schema atual?
- O fluxo de NF (Gmail → PDF → Drive → planilha) é complexo — vale um ADR sobre como/quando migrar?
- Dados bancários nos profiles: implicações de segurança (PIX, conta bancária) — guardar no Vault ou na tabela?
- O CODIGO_ROBO usa IDs de pastas/docs do Google como referência cruzada — como mapear no ELLAHOS?
- A aba DOCUSEAL_LOG indica que já testaram DocuSeal — há schema/infra a reaproveitar?
- O n8n já tem 3 workflows rodando (126 nodes total) — a Fase 5 deve estender esses workflows ou criar novos?
- O workflow principal usa Supabase nodes nativos — confirmar que as tabelas/RLS do ELLAHOS são compatíveis
- Rate limiting da Evolution API (1msg/s) com ~286 contatos potenciais — precisa de queue no ELLAHOS?
-->

_Pendente: Tech Lead deve revisar e adicionar suas recomendações aqui._

#### Integrations Engineer
<!-- Integrations Engineer: Foque em:
- Os Apps Scripts fazem chamadas a: Gmail API, Drive API, Slides API, Docs API, Calendar API, OCR.space API — quais precisam de service account vs OAuth?
- O fluxo de NF usa busca no Gmail por assunto E por email de fornecedor — é viável replicar via n8n?
- O n8n já orquestra: criação de pastas Drive, cópia de planilhas, webhook Supabase, envio WhatsApp — a Fase 5 deve ESTENDER esses workflows, não recriar do zero
- O workflow DocuSeal já existe no n8n — quando for hora, é só ativar
- Google Calendar: os eventos de pagamento poderiam ser notificações no ELLAHOS em vez de eventos no Calendar?
- Shared Drive vs My Drive: impacta parâmetros da API (supportsAllDrives) — confirmar com Ellah
- A pasta temporária de NFs pendentes (ID fixo no CONFIG) — como mapear no ELLAHOS?
- Evolution API: webhook já configurado no n8n para receber status de mensagem — reaproveitar
- O workflow principal cria subpastas com IDs fixos de templates — a Fase 5 precisa ser compatível com essa lógica
-->

_Pendente: Integrations Engineer deve revisar e adicionar suas recomendações aqui._

---

## 11. RECOMENDAÇÕES PARA A FASE 5

### Ajustes no plano original:

1. **Estrutura de pastas:** Expandir de 9 para ~15 subpastas, baseado na estrutura real. Ou melhor: tornar o template configurável pelo tenant (já planejado, mas reforçar).

2. **Campos novos no ELLAHOS a considerar:**
   - `audio_company` (produtora de áudio)
   - `ancine_number` (CRT da ANCINE)
   - `agency_contact_email` (email do atendimento)
   - Dados bancários nos profiles (banco, agência, conta, PIX) — essencial para o fluxo financeiro

3. **Fluxos que podem entrar na Fase 5:**
   - ✅ Criar pastas Drive ao aprovar job (já planejado)
   - ✅ Notificar equipe via WhatsApp (já planejado)
   - 🆕 Notificação de prazos de pagamento (dados existem no CALENDARIO)
   - 🆕 Alerta de diárias próximas (shooting_date)

4. **Fluxos para fases futuras:**
   - Geração de contratos (DocuSeal — já deferido)
   - OCR de NFs
   - Pedido/processamento de NF automatizado
   - Geração de claquete
   - Geração de Aprovação Interna (PDF)
   - Cadastro de equipe via form integrado

5. **Shared Drive vs My Drive:** Confirmar com a Ellah qual tipo usam. O parâmetro `supportsAllDrives` é obrigatório para Shared Drives.

---

## 12. MAPA DE PRIORIDADES

| Automação | Hoje (Apps Script) | Fase 5 (ELLAHOS) | Complexidade |
|-----------|-------------------|-------------------|-------------|
| Criar pastas no Drive | Manual/semi-auto | ✅ Automatizado ao aprovar | Média |
| Notificar equipe | WhatsApp manual | ✅ WhatsApp + In-App | Média |
| Alertas de margem | Não existe | ✅ Planejado | Baixa |
| Alertas de prazo/pagamento | Google Calendar | 🆕 Pode entrar | Baixa |
| Pedido de NF por email | Apps Script complexo | 🔜 n8n workflow | Alta |
| Processar NF recebida | Apps Script + Gmail | 🔜 n8n workflow | Alta |
| OCR de NFs | Apps Script + OCR.space | ⏳ Fase futura | Média |
| Gerar contratos elenco | Apps Script + Docs | ⏳ DocuSeal (deferido) | Alta |
| Gerar claquete | Apps Script + Slides | ⏳ Fase futura | Média |
| Cadastro equipe via form | Google Forms + Script | ⏳ Frontend ELLAHOS | Média |
| Gerar Aprovação Interna | Manual (Google Docs) | ⏳ Auto-gerar PDF | Média |
