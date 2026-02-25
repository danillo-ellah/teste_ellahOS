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

## 7. ESTRUTURA DE PASTAS NO DRIVE (Real — extraída do Shared Drive)

Mapeada diretamente do Google Drive da Ellah, job 038 como referência:

```
038_Quer Fazer? Senac!_SENAC SP/              ← pasta raiz do job
├── 01_DOCUMENTOS/                             ← aprovação interna, briefing, roteiro
├── 02_FINANCEIRO/                             ← ⭐ MEGA PASTA com 8 subpastas
│   ├── 01_CARTAORCAMENTO/
│   ├── 02_DECUPADO/
│   ├── 03_GASTOS GERAIS/
│   ├── 04_NOTAFISCAL_RECEBIMENTO/             ← NFs recebidas de fornecedores
│   ├── 05_COMPROVANTES_PG/                    ← comprovantes de pagamento
│   ├── 06_NOTINHAS_EM_PRODUCAO/               ← notas do set
│   ├── 07_NOTAFISCAL_FINAL_PRODUCAO/          ← NF que a Ellah emite
│   └── 08_FECHAMENTO_LUCRO_PREJUIZO/          ← resultado final do job
├── 03_MONSTRO_PESQUISA_ARTES/                 ← pesquisa visual, referências
├── 04_CRONOGRAMA/
├── 05_CONTRATOS/                              ← contratos de elenco (PDFs gerados)
├── 06_FORNECEDORES/
├── 07_CLIENTES/
├── 08_POS_PRODUCAO/                           ← ⭐ 8 subpastas de pós
│   ├── 01_MATERIAL BRUTO/
│   ├── 02_MATERIAL LIMPO/
│   ├── 03_PESQUISA/
│   ├── 04_STORYBOARD/
│   ├── 05_MONTAGEM/
│   ├── 06_COLOR/
│   ├── 07_FINALIZACAO/
│   └── 08_COPIAS/
├── 09_ATENDIMENTO/                            ← comunicação com agência/cliente
└── 10_VENDAS/PRODUTOR_EXECUTIVO/              ← propostas, negociação
```

**Total: 10 pastas de nível 1 + 16 subpastas de nível 2 = 26 pastas por job**

**⚠️ MUITO DIFERENTE das 9 subpastas planejadas na Fase 5!** A estrutura real é mais granular e organizada por departamento, não por fase de produção. Os 3 agentes concordam: o template deve ser configurável via `tenant.settings.drive.folder_template` como array de objetos com `name`, `key`, `children[]`.

**Observações:**
- Naming convention: `{NN}_{NOME}` (numerado para ordenação)
- Pasta raiz: `{JOB_CODE}_{TITULO}_{CLIENTE}` (ex: 038_Quer Fazer? Senac!_SENAC SP)
- FINANCEIRO e POS_PRODUCAO têm sub-hierarquia profunda
- Subpastas de pré-produção (PD/Arte/Figurino) ficam DENTRO do FINANCEIRO, não separadas
- Owner: danillo@ellahfilmes.com (Shared Drive corporativo)
- Criadas em Nov/2025, atualizadas até Fev/2026 (ativas)

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

### ✅ Respostas às 7 Perguntas Bloqueantes

| # | Pergunta | Resposta | Impacto |
|---|----------|----------|---------|
| 1 | My Drive ou Shared Drive? | **Shared Drive (corporativo)** | Usar `supportsAllDrives: true` em todas as chamadas da API |
| 2 | Google Workspace pago ou Gmail? | **Workspace pago** | Domain-wide delegation disponível para Service Account |
| 3 | Z-API tem custo mensal? | **Sim, pago** | Reforça migração gradual para Evolution API (gratuita) |
| 4 | Service Account tem acesso ao Drive? | **Sim, cria pastas, mas permissões são manuais** | Automatizar `permissions.create` após criar pastas (dar acesso à equipe do job) |
| 5 | Volume Docker da Evolution/Z-API persistido? | **Não — QR Code precisa ser reescaneado ao reiniciar** | ⚠️ Persistir volume Docker é pré-requisito. Documentar no setup |
| 6 | "Valor W" = gross_profit? | **Não — Valor W e um buffer de risco (chuva, imprevistos). Entra no calculo do gross_profit quando presente.** | Criar `risk_buffer NUMERIC(12,2)`. Formula: `gross_profit = closed_value - production_cost - tax_value - other_costs - risk_buffer` |
| 7 | Subpastas Pré-Produção ficam onde? | **Dentro do FINANCEIRO (02_FINANCEIRO/)** | Estrutura real mapeada acima (seção 7) — 26 pastas total, não 9 |

---

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

**1. Priorizacao das sub-fases:** Sequencia atual (5.1→5.2/5.3→5.4/5.5→5.6) se mantem. Porem, Sub-fase 5.5 deve ser dividida internamente: "notificacoes WhatsApp por eventos do job" (Fase 5) vs "criacao automatica de 4 grupos WhatsApp" (deferir Fase 6 — risco de bloqueio de conta pelo WhatsApp).

**2. Form de equipe bugado:** Deferir frontend para Fase 6. Na Fase 5, apenas preparar o terreno: padronizar a estrutura do JSONB `bank_info` em `people` e documentar a interface `BankInfo` nos types compartilhados. O form substituto requer autocomplete de profiles + campos bancarios no frontend — escopo grande demais para esta fase.

**3. Estrutura de pastas:** Expandir de 9 para **26 pastas** (10 nivel-1 + 16 nivel-2), replicando a estrutura real mapeada na secao 7. Template configuravel via `tenant.settings.drive.folder_template` como array de objetos com `name`, `key`, `children[]`. Naming convention: `{NN}_{NOME}` numerado para ordenacao.

**4. Fluxo de NF:** Deferir para Fase 6. Prerequisito e migrar dados financeiros do CUSTOS_REAIS para `financial_records`. Na Fase 5, apenas garantir que a pasta `04_NOTAFISCAL_RECEBIMENTO/` seja criada no template de pastas.

**5. Google Calendar → notificacoes:** Implementar notificacoes ELLAHOS na Fase 5 (alertas de prazo/pagamento). Manter Calendar em paralelo — desligar e decisao operacional da equipe, nao tecnica.

**6. Risco de duplicar logica n8n:** Protocolo claro — criar 4 workflows NOVOS no n8n, NAO alterar os 3 existentes. O `wf-job-approved` pode chamar o `JOB_FECHADO_CRIACAO` existente como ultimo passo para manter a criacao de grupos funcionando.

**7. Quick wins — promover para scope obrigatorio da Fase 5:**
- Pagamento se aproximando (7d, 3d, 1d antes de `due_date`) → pg_cron diario
- Diaria de filmagem em 3 dias (`job_shooting_dates.date`) → pg_cron diario
- Entregavel atrasado (`job_deliverables.delivery_date` passou) → pg_cron diario
- Custo: 1 pg_cron job, ~30 linhas SQL, alto valor imediato

**8. Campos novos para Fase 5:**
- `audio_company TEXT` na tabela `jobs` — presente em quase todo job audiovisual
- `risk_buffer NUMERIC(12,2)` na tabela `jobs` — o "Valor W" que inclui analise de risco (chuva, imprevistos), confirmado como diferente de `gross_profit`
- `external_id TEXT` + `external_source TEXT` em `job_files` — para mapear IDs do Google Drive/DocuSeal

**9. Z-API vs Evolution API:** Evolution API para fluxos novos do ELLAHOS (gratuita, self-hosted). Manter Z-API nos workflows existentes do n8n. Migrar gradualmente para Evolution API na Fase 6+ para eliminar custo mensal.

**10. Postgres separado do n8n:** Manter separado. Documentar no ADR-006 como banco auxiliar do assistente IA. Consolidacao na Fase 8 quando redesenhar o assistente.

#### Tech Lead

**1. Schema impact (CUSTOS_REAIS):** NAO alterar schema financeiro na Fase 5. As tabelas `financial_records`, `budget_items`, `invoices`, `payment_history` cobrem ~70% do caso. Os 30% restantes (horas extras, sub_item granular, comprovante_url) entram na Fase 6 como migration incremental. Campos futuros documentados: `work_hours JSONB`, `receipt_url TEXT`, `sub_category TEXT`.

**2. Fluxo de NF — ADR-007 (proposto para Fase 6):** Registrar como ADR mas NAO implementar na Fase 5. Esboço: n8n monitora Gmail (IMAP/poll) → extrai PDF → salva Drive → cria registro em `invoices` → UI de validacao no ELLAHOS. Na Fase 5, apenas adicionar event_types futuros ao ENUM de `integration_events`: `nf_request_sent`, `nf_received`, `nf_validated`.

**3. Dados bancarios:** Manter em `people.bank_info JSONB` (opcao C). RLS protege por tenant, Supabase encripta at-rest. Controles compensatorios: nunca expor service_role_key no frontend, Column-Level Security na Fase 6. LGPD: base legal = execucao de contrato. Padronizar interface `BankInfo`: `{ bank_name, bank_code, agency, account, account_type, pix_key, pix_key_type, holder_name, holder_document }`.

**4. CODIGO_ROBO → drive_folders:** A tabela `drive_folders` (Fase 5.1) cobre o mapeamento. Usar **TEXT** (nao ENUM) para `folder_type` — permite flexibilidade sem migrations. Para documentos individuais, adicionar `external_id TEXT` + `external_source TEXT` em `job_files`. IDs de templates ficam em `tenant.settings.drive.templates`.

**5. DocuSeal prep:** Na migration 5.1, adicionar event_types futuros (`docuseal_submission_created/signed/failed`). Na Sub-fase 5.3, adicionar `docuseal_token` e `docuseal_url` ao Vault/Settings como campos opcionais desabilitados. NAO criar tabela `docuseal_submissions` — Fase 6.

**6. Workflows n8n:** Criar 4 novos, NAO alterar os 3 existentes. `JOB_FECHADO_CRIACAO` pode ser chamado pelo `wf-job-approved` como sub-workflow. `WORKFLOW_PRINCIPAL` intocavel — escopo completamente diferente. `TESTE2_JURIDICO` manter inativo ate Fase 6.

**7. Supabase nodes no n8n:** Novos workflows usam `service_role_key` com filtro explicito por `tenant_id` em toda query. service_role_key armazenada no Vault. Documentar que e aceitavel porque n8n roda em VPS privada.

**8. Rate limiting:** `integration_events` JA E a queue. Processar em FIFO, batch de 20 msgs por execucao do pg_cron (1min / 3s delay = ~20 msgs). Se exceder, proximo ciclo processa o restante. Alarme se fila pendente > 100 registros.

**9. Z-API vs Evolution API — ADR-008:** Evolution API como primario, interface abstrata `IWhatsAppProvider` com duas implementacoes (`EvolutionApiClient`, `ZApiClient`). Feature flag em `tenant.settings` decide qual usar. Migrar JOB_FECHADO_CRIACAO para Evolution API na Fase 6.

**10. Postgres separado:** Manter. Nenhuma acao na Fase 5. Documentar no diagrama de infra.

**11. Campos novos confirmados para migration 5.1:**
- `audio_company TEXT` em `jobs` (unico campo realmente faltando)
- `risk_buffer NUMERIC(12,2)` em `jobs` ("Valor W" — buffer de risco, NAO e gross_profit)
- `external_id TEXT` + `external_source TEXT` em `job_files`
- CHECK constraint em `people.bank_info` (validacao basica)
- `ancine_number` ja existe, `agency_contact_email` coberto por `contacts` FK

**12. Shared Drive confirmado:** `supportsAllDrives: true` + `includeItemsFromAllDrives: true` em toda chamada. `driveId` e `corpora: 'drive'` nos list. Automatizar `permissions.create` apos criar pastas para dar acesso a equipe do job.

**13. Volume Docker — PRE-REQUISITO BLOQUEANTE:** Evolution API perde sessao QR Code ao reiniciar. Persistir volume Docker (`evolution_data`) e tarefa de infra obrigatoria ANTES da Sub-fase 5.5.

**ADRs propostos:**
| ADR | Titulo | Fase |
|-----|--------|------|
| ADR-007 | Migracao do Fluxo de NF (Gmail→n8n→ELLAHOS) | 6 |
| ADR-008 | Z-API vs Evolution API (WhatsApp Provider) | 5.5 |
| ADR-009 | Dados Sensiveis e LGPD (bank_info, CPF) | 6 |

#### Integrations Engineer

**1. APIs e autenticacao para Fase 5:**
| API | Tipo | Motivo | Fase 5? |
|-----|------|--------|---------|
| Drive API | Service Account | Pastas criadas em nome da Ellah. Shared Drive exige SA como "Content manager". | SIM (5.4) |
| Gmail API | OAuth (user) ou SA + domain-wide delegation | NF monitoring precisa ler caixa especifica. Workspace pago habilita delegation. | NAO (Fase 6+) |
| Calendar API | SA + delegation | Calendario compartilhado "ELLAHOS Financeiro" via SA. | NAO (substituido por notificacoes) |
| Slides/Docs API | Service Account | Templates. SA com acesso de leitura. | NAO (Fase 7+) |
| OCR.space | API Key (Vault) | SaaS externo. | NAO (Fase 7+) |

**2. Fluxo de NF via n8n:** Viavel tecnicamente (n8n tem node Gmail com `q` query string). Porem: requer OAuth/delegation, pasta temporaria mapeada, interface de revisao. Deferir para Fase 6.

**3. Workflows n8n — estrategia NOVOS ao lado:**
```
ELLAHOS aprovar job
  → integration_events (fila)
    → integration-processor Edge Function
      → n8n wf-job-approved (NOVO)
        → Drive API (cria 26 pastas)
        → Evolution API (msg individual PE + Diretor)
        → [opcional] dispara JOB_FECHADO_CRIACAO (existente, Z-API, grupos)
        → callback /sync-urls (salva links no ELLAHOS)
```
Principio: cada workflow novo recebe dados via webhook do `integration-processor` e faz callback de conclusao. Falhas nao afetam o ELLAHOS (ADR-006).

**4. DocuSeal prep:** Adicionar `docuseal_token` + `docuseal_url` ao Vault na Sub-fase 5.3 (campos opcionais, toggle desabilitado). DocuSeal ja funciona em `assinaturas.ellahfilmes.com`, template id:3 pronto. Quando Fase 6 chegar, e so ativar o workflow TESTE2_JURIDICO adaptado.

**5. Google Calendar → notificacoes ELLAHOS:** Implementar pg_cron diario (08h) que verifica `financial_records.due_date` e `job_shooting_dates.date` com vencimento em 1, 3, 7 dias → cria `notifications` + `integration_events` (WhatsApp). Manter Calendar em paralelo ate equipe confirmar confianca no ELLAHOS.

**6. Shared Drive — impacto confirmado:** Todos os endpoints precisam de `supportsAllDrives: true`, `includeItemsFromAllDrives: true`. List precisa de `driveId` + `corpora: 'drive'`. Adicionar `drive_type` (enum: `my_drive`|`shared_drive`) e `shared_drive_id` em `tenant.settings`. Botao "Testar Conexao" deve validar esse parametro.

**7. Pasta NFs pendentes:** Adicionar `nf_pending_folder_id` em `tenant.settings` (config, nao secret). Campo preenchido manualmente pelo admin em Settings. Usado na Fase 6 quando fluxo NF for implementado.

**8. Evolution API webhook como relay via n8n:**
```
Evolution API → webhook → n8n (normaliza) → POST /whatsapp/webhook (ELLAHOS)
  → payload normalizado: { message_id, status, timestamp }
  → atualiza whatsapp_messages.status
```
Beneficio: se Evolution API mudar formato do webhook, so n8n precisa ajustar.

**9. Z-API vs Evolution API:** Evolution API para fluxos novos (gratuita, self-hosted, controle total). Manter Z-API nos existentes. Interface abstrata `IWhatsAppProvider` garante troca transparente. **Persistir volume Docker e bloqueante** — sem isso, mensagens automaticas sao inviaveis.

**10. Templates no Drive — dois estagios:**
- **Fase 5 (minimo viavel):** Criar 26 pastas vazias com nomes corretos. Retornar links para o ELLAHOS.
- **Fase 6 (completo):** Copiar templates (GG_, cronograma, form equipe) para dentro das pastas. IDs dos templates em `tenant.settings.drive.templates`.
- O `drive-integration` na Fase 5 ja deve aceitar template IDs como campo opcional: se presentes, chama `files.copy`; se vazios, cria pastas vazias (graceful degradation).

**11. Grupos WhatsApp (4 por job):** Deferir para Fase 6. Criacao de grupos via API e fragil (WhatsApp bloqueia contas). O `wf-job-approved` pode chamar `JOB_FECHADO_CRIACAO` (existente, Z-API) como ultimo passo para manter a funcionalidade.

**12. Estrutura de pastas real (26 pastas) — mapeamento para `drive_folders`:**
Cada pasta criada = 1 registro em `drive_folders` com `folder_key` (TEXT, nao ENUM). Keys sugeridas:
```
root, documentos, financeiro, fin_carta_orcamento, fin_decupado,
fin_gastos_gerais, fin_nf_recebimento, fin_comprovantes_pg,
fin_notinhas_producao, fin_nf_final, fin_fechamento,
monstro_pesquisa, cronograma, contratos, fornecedores, clientes,
pos_producao, pos_material_bruto, pos_material_limpo, pos_pesquisa,
pos_storyboard, pos_montagem, pos_color, pos_finalizacao, pos_copias,
atendimento, vendas
```

**7 confirmacoes obtidas — status:**
| # | Item | Status |
|---|------|--------|
| 1 | Shared Drive | ✅ Confirmado — `supportsAllDrives: true` |
| 2 | Workspace pago | ✅ Confirmado — delegation disponivel |
| 3 | Z-API pago | ✅ Confirmado — migrar gradualmente |
| 4 | SA tem acesso ao Drive | ✅ Confirmado — permissoes manuais, automatizar |
| 5 | Volume Docker NAO persiste | ⚠️ BLOQUEANTE — resolver antes de 5.5 |
| 6 | Valor W ≠ gross_profit | ✅ Confirmado — criar `risk_buffer` |
| 7 | Estrutura real = 26 pastas | ✅ Mapeado na secao 7 |

---

## 11. RECOMENDACOES CONSOLIDADAS PARA A FASE 5

> Consolidado apos revisao dos 3 agentes (PM, Tech Lead, Integrations Engineer) + respostas do Danillo as 7 perguntas bloqueantes.

### Ajustes confirmados no plano original:

**A. Estrutura de pastas: 9 → 26 pastas**
Expandir para a estrutura real (secao 7): 10 pastas nivel-1 + 16 nivel-2. Template configuravel via `tenant.settings.drive.folder_template`. Fase 5 cria pastas vazias; Fase 6 copia templates (GG_, cronograma, etc.) via `files.copy`.

**B. Campos novos na migration 5.1:**
- `audio_company TEXT` em `jobs` — presente em quase todo job audiovisual
- `risk_buffer NUMERIC(12,2)` em `jobs` — "Valor W", buffer de risco (chuva, imprevistos), NAO e gross_profit
- `external_id TEXT` + `external_source TEXT` em `job_files` — mapear IDs do Google Drive/DocuSeal
- CHECK constraint em `people.bank_info` (validacao basica do JSONB)
- Event types futuros em `integration_events`: `nf_request_sent`, `nf_received`, `nf_validated`, `docuseal_*`
- Campos ja existentes confirmados: `ancine_number`, `agency_contact_email` (via contacts FK), `bank_info` JSONB

**C. Alertas automaticos — promovidos para scope obrigatorio:**
- Pagamento se aproximando (7d, 3d, 1d) → pg_cron diario 08h
- Diaria de filmagem em 3 dias → pg_cron diario 08h
- Entregavel atrasado → pg_cron diario 08h
- Custo: 1 pg_cron job, ~30 linhas SQL

**D. Shared Drive confirmado:**
- `supportsAllDrives: true` em toda chamada Drive API
- `drive_type` + `shared_drive_id` em `tenant.settings`
- Automatizar `permissions.create` apos criar pastas
- Service Account ja tem acesso (permissoes manuais hoje)

**E. WhatsApp — interface abstrata + bloqueante Docker:**
- `IWhatsAppProvider` com `EvolutionApiClient` + `ZApiClient` (ADR-008)
- Evolution API para fluxos novos, Z-API nos existentes
- **BLOQUEANTE:** Persistir volume Docker da Evolution API antes de 5.5

**F. DocuSeal prep na Sub-fase 5.3:**
- Adicionar `docuseal_token` + `docuseal_url` ao Vault (campos opcionais, toggle off)
- DocuSeal ja funciona em `assinaturas.ellahfilmes.com`, template id:3 pronto

**G. Workflows n8n — 4 NOVOS, 0 alterados:**
- `wf-job-approved`, `wf-margin-alert`, `wf-status-change`, `wf-budget-sent`
- `wf-job-approved` pode chamar `JOB_FECHADO_CRIACAO` (existente) como sub-workflow para grupos

**H. ADRs novos:**
| ADR | Titulo | Fase |
|-----|--------|------|
| ADR-007 | Migracao do Fluxo de NF | 6 |
| ADR-008 | Z-API vs Evolution API | 5.5 |
| ADR-009 | Dados Sensiveis e LGPD | 6 |

### Fluxos DEFERIDOS (fases futuras):
- Geracao de contratos (DocuSeal) — Fase 6
- OCR de NFs — Fase 7+
- Pedido/processamento de NF automatizado — Fase 6
- Geracao de claquete — Fase 7+
- Geracao de Aprovacao Interna (PDF) — Fase 7+
- Cadastro de equipe via form integrado — Fase 6
- Criacao automatica de 4 grupos WhatsApp por job — Fase 6
- Copia de templates Google Docs/Sheets — Fase 6
- Migrar Postgres separado do n8n para Supabase — Fase 8

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
