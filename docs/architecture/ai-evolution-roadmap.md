# Roadmap de Evolucao da IA -- ELLAHOS

**Data:** 22/02/2026
**Status:** Visao aprovada
**Autor:** Tech Lead + CEO

---

## 1. Visao

A Ellah Filmes evolui para um modelo de "empresa assistida por IA", onde agentes especializados por departamento operam sob supervisao humana. A IA nunca toma decisoes sozinha -- sempre sugere, e o humano aprova.

---

## 2. Estagios de Evolucao

### Estagio 1 -- Fundacao (Fase 8, atual)

- 4 features de IA como ferramentas assistivas
- **Estimativa de Orcamento AI** -- embriao do Agente Financeiro
- **Copilot de Producao** -- embriao da Supervisora (Ellaih 2.0)
- **Analise de Dailies** -- embriao do Agente de Producao
- **Matching de Freelancer** -- embriao do Agente de RH/Casting
- Claude API (Haiku para chat rapido, Sonnet para analise complexa)
- Dados: apenas Supabase (30+ tabelas, dados estruturados)
- Modo: request-response (usuario pergunta, IA responde)

### Estagio 2 -- Agentes com Memoria (Fases 9-10)

- Cada feature evolui para agente com contexto persistente
- **Agente Financeiro:** precificacao automatica, projecao de fluxo de caixa, alertas de margem proativos
- **Agente de Producao:** monitoramento continuo de dailies, checklist automatico, previsao de atrasos
- **Agente de RH:** sugestao proativa de equipe ao criar job, deteccao de burnout por alocacao
- **Agente Juridico (novo):** geracao de contratos via DocuSeal, compliance ANCINE, revisao de clausulas
- **Agente Comercial (novo):** qualificacao de leads, follow-up automatico, proposta comercial
- Memoria de longo prazo por agente (preferencias do tenant, calibragem por feedback)
- Notificacoes proativas (agente detecta risco e alerta sem ser perguntado)

### Estagio 3 -- Ellaih Integrada (Fase 11+)

- Ellaih como orquestradora central (evolucao do WORKFLOW_PRINCIPAL de 95 nodes do n8n)
- Canal unico: WhatsApp, Web, ou ambos -- mesma IA por tras
- Ellaih do WhatsApp para de ler Google Sheets e consulta ELLAHOS via API
- Agentes especializados sao "tools" que a Ellaih aciona conforme necessidade
- Usuario fala com a Ellaih, ela decide qual agente consultar
- Capacidades multimodais: analise de video/imagem de dailies via Claude Vision
- Acoes autonomas com aprovacao: "Vou alocar o Joao no job 055, confirma?" -- usuario responde "sim" no WhatsApp

---

## 3. Coexistencia: Ellaih n8n vs Copilot ELLAHOS

**Fase atual:**

- Ellaih (n8n/WhatsApp/Z-API) -- funciona, le Google Sheets, 4 AI agents LangChain
- Copilot (ELLAHOS/browser) -- novo, le Supabase, Claude API direto

**Fase de transicao:**

- Ambos coexistem. WhatsApp para mobile, browser para desktop.
- Dados migram gradualmente de Sheets para Supabase
- Quando Supabase tiver dados completos, Ellaih do n8n passa a consultar ELLAHOS via Edge Functions

**Fase final:**

- Uma unica "Ellaih" com multiplos canais (WhatsApp + Web + API)
- Backend unificado no Supabase
- n8n como orquestrador de workflows (nao mais como host da IA)

---

## 4. Arquitetura Multi-Provider (futuro)

Fase 8 usa apenas Claude API (Anthropic). O modulo `claude-client.ts` e isolado.

Evolucao prevista:

- `claude-client.ts` -- `ai-provider.ts` (interface abstrata)
- Providers: Anthropic (Claude), OpenAI (GPT), Google (Gemini)
- Roteamento por custo/qualidade: Haiku para chat, Sonnet para analise, GPT-4o como fallback
- Decisao de provider por feature, nao global

---

## 5. De-risking

- Cada estagio entrega valor independente (nao precisa chegar ao 3 para valer a pena)
- Estagio 1 ja reduz tempo de orcamento de horas para minutos
- Se a IA nao performar bem em alguma feature, o sistema degrada graciosamente (usuario faz manualmente)
- Custo controlado: rate limiting por tenant, monitoramento de tokens
- Privacidade: dados nunca saem do tenant, nunca vao para treinamento

---

## 6. Relacao com Dados Legados

Os arquivos do Google Workspace (Sheets, Docs, Forms, Apps Script) sao o "ERP caseiro" atual:

- **Planilha de controle de jobs** (50 colunas) -- ja mapeada para tabela `jobs`
- **GG por job** (8 abas) -- ja coberto por `jobs` + `financial_records` + `budget_items` + `job_team`
- **Banco de equipe** (286 pessoas) -- tabela `people`
- **Apps Scripts** (7 automacoes) -- gradualmente substituidos por Edge Functions + n8n

Migracao de dados reais e uma fase operacional separada (quando a equipe da Ellah comecar a usar o ELLAHOS no dia a dia). A IA da Fase 8 trabalha com os dados que estiverem no Supabase -- quanto mais dados reais, melhor a qualidade das sugestoes.
