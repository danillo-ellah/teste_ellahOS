# Arquitetura: Fase 10 — Sistema Multi-Agente com LangGraph

**Data:** 25/02/2026
**Status:** Proposta
**Autor:** Tech Lead + CEO — ELLAHOS
**Roadmap:** Evolução pós-Fase 9 (ai-evolution-roadmap.md, Estágio 2→3)
**ADRs relacionados:** ADR-022 (LangGraph vs CrewAI), ADR-023 (Agent Hierarchy), ADR-024 (Escalation Protocol)

---

## 1. Visão Geral

A Fase 10 transforma as 4 features de IA isoladas da Fase 8 em um **sistema multi-agente hierárquico** usando LangGraph. Cada departamento da Ellah Filmes ganha uma equipe de agentes IA com 3 níveis (Estagiário → Analista → Supervisor), orquestrada por uma Diretora Geral: a **Ellaih**.

O humano (CEO/PE) é escalado apenas quando o sistema não tem confiança suficiente para resolver sozinho.

### 1.1 Por que LangGraph (e não CrewAI)

| Critério | CrewAI | LangGraph | Vencedor |
|----------|--------|-----------|----------|
| Controle de fluxo | Sequencial/hierárquico fixo | Grafos com edges condicionais, loops, paralelismo | **LangGraph** |
| State management | Limitado (share via delegation) | Estado tipado (TypedDict) persistente entre nós | **LangGraph** |
| Escalation logic | Manual (callback) | Edges condicionais nativos (if confidence < X → escala) | **LangGraph** |
| Comunicação lateral | Não nativa | Nós podem chamar outros grafos como sub-grafos | **LangGraph** |
| Persistência/Checkpoints | Não nativo | Checkpointer nativo (SQLite, PostgreSQL) | **LangGraph** |
| Human-in-the-loop | Workaround | `interrupt_before` / `interrupt_after` nativo | **LangGraph** |
| Streaming | Limitado | Streaming de eventos nativo (token-level) | **LangGraph** |
| Observabilidade | Básica | LangSmith integration nativa | **LangGraph** |
| Maturidade | v0.x, breaking changes frequentes | v0.2+, mantido pelo LangChain (empresa $25M+) | **LangGraph** |
| Complexidade inicial | Menor | **Maior** (vale pelo controle) | CrewAI |

**Decisão:** LangGraph. A complexidade extra é justificada pelo controle total sobre escalation, estado, e comunicação entre agentes — que são core do sistema proposto.

### 1.2 Hierarquia de Agentes

```
                         ┌─────────────────────┐
                         │   CEO (Humano)       │
                         │   Danillo            │
                         │   Escalation final   │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   ELLAIH              │
                         │   Diretora Geral IA   │
                         │   Orquestradora        │
                         │   (LangGraph Router)   │
                         └──────────┬───────────┘
                                    │
              ┌─────────────┬───────┼───────┬──────────────┐
              │             │       │       │              │
     ┌────────▼──┐  ┌──────▼──┐ ┌──▼───┐ ┌─▼────────┐ ┌──▼────────┐
     │ FINANCEIRO │  │PRODUÇÃO │ │  RH  │ │ JURÍDICO │ │ COMERCIAL │
     │ Supervisor │  │Supervisor│ │Super.│ │Supervisor│ │Supervisor │
     └─────┬──────┘  └────┬────┘ └──┬───┘ └────┬─────┘ └─────┬─────┘
           │              │         │           │             │
     ┌─────▼──────┐ ┌────▼────┐ ┌──▼───┐ ┌────▼─────┐ ┌─────▼─────┐
     │  Analista   │ │Analista │ │Anal. │ │ Analista │ │ Analista  │
     │ Financeiro  │ │Produção │ │ RH   │ │ Jurídico │ │ Comercial │
     └─────┬──────┘ └────┬────┘ └──┬───┘ └────┬─────┘ └─────┬─────┘
           │              │         │           │             │
     ┌─────▼──────┐ ┌────▼────┐ ┌──▼───┐ ┌────▼─────┐ ┌─────▼─────┐
     │ Estagiário │ │Estag.   │ │Estag.│ │ Estag.   │ │ Estagiário│
     │ Financeiro │ │Produção │ │ RH   │ │ Jurídico │ │ Comercial │
     └────────────┘ └─────────┘ └──────┘ └──────────┘ └───────────┘
```

### 1.3 Princípios

1. **IA sugere, humano decide**: Nenhuma ação irreversível sem aprovação humana
2. **Confiança numérica**: Todo agente retorna `confidence: 0-100`. Thresholds configuráveis por tenant
3. **Escalation determinística**: Se `confidence < threshold` → escala. Sem ambiguidade
4. **Fail gracefully**: Se o LangGraph cair, o sistema degrada para Fase 8 (features isoladas)
5. **Custo controlado**: Estagiários usam Haiku, Analistas usam Sonnet, Supervisores usam Opus quando necessário
6. **Comunicação lateral**: Agente financeiro pode consultar agente de produção diretamente
7. **Memória por agente**: Cada agente tem contexto persistente (preferências do tenant, calibragem por feedback)
8. **Observabilidade total**: Toda decisão logada com reasoning, confidence, tokens, tempo

---

## 2. Arquitetura Técnica

### 2.1 Stack

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│  Copilot Drawer ── Agent Dashboard ── Escalation Queue   │
└──────────────────────┬───────────────────────────────────┘
                       │ fetch() + Bearer token
┌──────────────────────▼───────────────────────────────────┐
│              EDGE FUNCTIONS (Supabase/Deno)               │
│  ai-copilot ── ai-agents-gateway ── ai-escalation        │
│                       │                                   │
│              Proxy HTTP para LangGraph API                │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (internal network)
┌──────────────────────▼───────────────────────────────────┐
│            LANGGRAPH SERVER (Python/FastAPI)               │
│  ┌─────────────────────────────────────────────────┐     │
│  │              ELLAIH (Router Graph)                │     │
│  │  classify_intent → route_department → merge      │     │
│  └─────────────┬───────────────────────────────────┘     │
│                │                                          │
│  ┌─────────────▼──────────────────────────────┐          │
│  │        DEPARTMENT SUBGRAPHS                  │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │          │
│  │  │Financeiro│ │ Produção │ │    RH    │    │          │
│  │  │ (graph)  │ │ (graph)  │ │ (graph)  │    │          │
│  │  └──────────┘ └──────────┘ └──────────┘    │          │
│  │  ┌──────────┐ ┌──────────┐                  │          │
│  │  │ Jurídico │ │Comercial │                  │          │
│  │  │ (graph)  │ │ (graph)  │                  │          │
│  │  └──────────┘ └──────────┘                  │          │
│  └─────────────────────────────────────────────┘          │
│                       │                                   │
│              Checkpointer (PostgreSQL)                    │
│              LangSmith (Observabilidade)                  │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│                 SUPABASE (PostgreSQL)                      │
│  ai_agent_logs ── ai_escalations ── ai_agent_memory      │
│  + 30 tabelas existentes do ELLAHOS                       │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Onde roda cada coisa

| Componente | Runtime | Onde | Justificativa |
|------------|---------|------|---------------|
| LangGraph Server | Python 3.12 + FastAPI | **VPS Hetzner** (mesmo do n8n) | LangGraph é Python-only. Docker container dedicado |
| Edge Functions (gateway) | Deno | Supabase Edge | Proxy autenticado. Mantém pattern existente |
| Checkpointer | PostgreSQL | Supabase (mesma instância) | Sem infra extra. Dados junto dos dados do app |
| Frontend | Next.js | Vercel | Já está lá |
| n8n | Node.js | VPS Hetzner | Já está lá. Pode triggar o LangGraph via HTTP |

### 2.3 Fluxo de uma Request

```
1. Usuário envia mensagem no Copilot
2. Frontend → POST /ai-copilot/chat (Edge Function)
3. Edge Function valida auth + tenant_id
4. Edge Function → POST http://langgraph-server:8000/invoke (rede interna VPS↔Supabase)
5. LangGraph Router (Ellaih) classifica intent
6. Ellaih roteia para subgrafo correto (ex: Financeiro)
7. Subgrafo executa: Estagiário → Analista → Supervisor (se necessário)
8. Se confidence < threshold → cria ai_escalation + notifica CEO
9. Se confidence >= threshold → retorna resposta
10. Edge Function → SSE stream para frontend
11. Log em ai_agent_logs
```

---

## 3. LangGraph: Estrutura dos Grafos

### 3.1 Estado Global (TypedDict)

```python
from typing import TypedDict, Literal, Optional, List
from langgraph.graph import StateGraph

class AgentState(TypedDict):
    # Input
    tenant_id: str
    user_id: str
    message: str
    conversation_id: Optional[str]
    context: dict  # job_id, page, etc.
    
    # Routing
    intent: Optional[str]  # ex: "financial_nf_validation", "production_status_check"
    department: Optional[Literal["financial", "production", "hr", "legal", "commercial"]]
    
    # Processing
    current_level: Literal["intern", "analyst", "supervisor", "ceo"]
    confidence: float  # 0-100
    reasoning: str
    data_gathered: dict  # dados coletados pelos agentes
    actions_proposed: List[dict]  # ações sugeridas
    
    # Escalation
    escalation_reason: Optional[str]
    needs_human: bool
    
    # Output
    response: str
    sources: List[dict]
    tokens_used: dict
    agent_path: List[str]  # ["ellaih", "financial_intern", "financial_analyst"]
```

### 3.2 Grafo Principal: Ellaih (Router)

```python
from langgraph.graph import StateGraph, END

def classify_intent(state: AgentState) -> AgentState:
    """Ellaih classifica a intenção e identifica o departamento."""
    # Claude Haiku: rápido e barato para classificação
    prompt = f"""Classifique a intenção do usuário:
    Mensagem: {state["message"]}
    Contexto: {state["context"]}
    
    Departamentos: financial, production, hr, legal, commercial
    Retorne JSON: {{"department": "...", "intent": "...", "confidence": 0-100}}
    """
    result = call_claude(prompt, model="haiku")
    return {
        **state,
        "department": result["department"],
        "intent": result["intent"],
        "confidence": result["confidence"],
        "agent_path": ["ellaih_router"]
    }

def route_department(state: AgentState) -> str:
    """Edge condicional: roteia para o subgrafo correto."""
    dept = state["department"]
    if dept == "financial":
        return "financial_graph"
    elif dept == "production":
        return "production_graph"
    elif dept == "hr":
        return "hr_graph"
    elif dept == "legal":
        return "legal_graph"
    elif dept == "commercial":
        return "commercial_graph"
    else:
        return "general_response"  # Ellaih responde diretamente

def merge_response(state: AgentState) -> AgentState:
    """Ellaih formata a resposta final."""
    if state["needs_human"]:
        # Criar escalation no banco
        create_escalation(state)
        state["response"] += "\n\n⚠️ Escalonei essa questão para o CEO. Você será notificado."
    return state

# Construir grafo
ellaih = StateGraph(AgentState)
ellaih.add_node("classify", classify_intent)
ellaih.add_node("financial_graph", financial_subgraph)  # subgrafo
ellaih.add_node("production_graph", production_subgraph)
ellaih.add_node("hr_graph", hr_subgraph)
ellaih.add_node("legal_graph", legal_subgraph)
ellaih.add_node("commercial_graph", commercial_subgraph)
ellaih.add_node("general_response", general_responder)
ellaih.add_node("merge", merge_response)

ellaih.set_entry_point("classify")
ellaih.add_conditional_edges("classify", route_department)

# Todos os departamentos convergem para merge
for dept in ["financial_graph", "production_graph", "hr_graph", 
             "legal_graph", "commercial_graph", "general_response"]:
    ellaih.add_edge(dept, "merge")

ellaih.add_edge("merge", END)
graph = ellaih.compile()
```

### 3.3 Subgrafo: Departamento Financeiro (exemplo detalhado)

```python
# Thresholds configuráveis por tenant
INTERN_CONFIDENCE_THRESHOLD = 70   # < 70 → escala para analista
ANALYST_CONFIDENCE_THRESHOLD = 50  # < 50 → escala para supervisor
SUPERVISOR_CONFIDENCE_THRESHOLD = 30  # < 30 → escala para CEO

def financial_intern(state: AgentState) -> AgentState:
    """
    Estagiário Financeiro IA
    - Tarefas: validar NFs, verificar duplicatas, classificar despesas
    - Modelo: Haiku (rápido, barato)
    - Dados: acesso READ a financial_records, invoices, nf_documents
    """
    prompt = f"""Você é o Estagiário Financeiro da {get_tenant_name(state["tenant_id"])}.
    
    Sua tarefa: {state["intent"]}
    Dados disponíveis: {state["data_gathered"]}
    
    Instruções:
    - Verifique se a NF é válida (CNPJ, valor, data)
    - Cruze com registros financeiros existentes
    - Se encontrar match exato (mesmo fornecedor + valor ±5%), confirme
    - Se houver dúvida, diga que precisa de análise mais profunda
    
    Retorne JSON:
    {{
        "analysis": "...",
        "confidence": 0-100,
        "data_gathered": {{...dados novos...}},
        "actions_proposed": [{{...}}],
        "needs_escalation": true/false,
        "escalation_reason": "..." 
    }}
    """
    result = call_claude(prompt, model="haiku")
    return {
        **state,
        "confidence": result["confidence"],
        "data_gathered": {**state["data_gathered"], **result["data_gathered"]},
        "actions_proposed": result["actions_proposed"],
        "reasoning": result["analysis"],
        "current_level": "intern",
        "agent_path": state["agent_path"] + ["financial_intern"],
    }

def should_escalate_to_analyst(state: AgentState) -> str:
    """Edge condicional: estagiário precisa de ajuda?"""
    if state["confidence"] < INTERN_CONFIDENCE_THRESHOLD:
        return "analyst"
    return "respond"

def financial_analyst(state: AgentState) -> AgentState:
    """
    Analista Financeiro IA
    - Tarefas: análise profunda, projeções, detecção de anomalias
    - Modelo: Sonnet (análise complexa)
    - Dados: acesso READ a tudo do financeiro + jobs + clients
    """
    prompt = f"""Você é o Analista Financeiro da {get_tenant_name(state["tenant_id"])}.
    
    O estagiário analisou isso com confiança {state["confidence"]}%:
    Análise do estagiário: {state["reasoning"]}
    Dados coletados: {state["data_gathered"]}
    
    Sua tarefa: aprofundar a análise.
    - Verificar padrões históricos do fornecedor
    - Comparar com valores de mercado
    - Projetar impacto no fluxo de caixa
    - Detectar anomalias (valor muito acima/abaixo do padrão)
    
    Retorne JSON com mesma estrutura, com sua análise adicional.
    """
    result = call_claude(prompt, model="sonnet")
    return {
        **state,
        "confidence": result["confidence"],
        "data_gathered": {**state["data_gathered"], **result["data_gathered"]},
        "actions_proposed": result["actions_proposed"],
        "reasoning": state["reasoning"] + "\n\n[Analista]: " + result["analysis"],
        "current_level": "analyst",
        "agent_path": state["agent_path"] + ["financial_analyst"],
    }

def should_escalate_to_supervisor(state: AgentState) -> str:
    if state["confidence"] < ANALYST_CONFIDENCE_THRESHOLD:
        return "supervisor"
    return "respond"

def financial_supervisor(state: AgentState) -> AgentState:
    """
    Supervisor Financeiro IA
    - Tarefas: decisões estratégicas, aprovações, comunicação lateral
    - Modelo: Sonnet (ou Opus para decisões críticas)
    - Pode consultar outros departamentos
    """
    # Supervisor pode fazer comunicação lateral
    # Ex: consultar agente de Produção para validar custo de equipamento
    lateral_data = {}
    if needs_lateral_check(state):
        lateral_data = invoke_subgraph("production_graph", {
            "message": f"Valide este custo de equipamento: {state['data_gathered'].get('equipment_cost')}",
            "intent": "validate_cost",
            **state
        })
    
    prompt = f"""Você é o Supervisor Financeiro da {get_tenant_name(state["tenant_id"])}.
    
    Estagiário ({state["agent_path"][-2]} - confiança: ...):
    {state["reasoning"]}
    
    Dados laterais (outros departamentos): {lateral_data}
    
    Tome a decisão final ou escale para o CEO se necessário.
    """
    result = call_claude(prompt, model="sonnet")
    return {
        **state,
        "confidence": result["confidence"],
        "reasoning": state["reasoning"] + "\n\n[Supervisor]: " + result["analysis"],
        "needs_human": result["confidence"] < SUPERVISOR_CONFIDENCE_THRESHOLD,
        "escalation_reason": result.get("escalation_reason"),
        "current_level": "supervisor",
        "agent_path": state["agent_path"] + ["financial_supervisor"],
    }

def format_financial_response(state: AgentState) -> AgentState:
    """Formata resposta final do departamento financeiro."""
    state["response"] = state["reasoning"]
    return state

# Construir subgrafo financeiro
financial = StateGraph(AgentState)
financial.add_node("intern", financial_intern)
financial.add_node("analyst", financial_analyst)
financial.add_node("supervisor", financial_supervisor)
financial.add_node("respond", format_financial_response)

financial.set_entry_point("intern")
financial.add_conditional_edges("intern", should_escalate_to_analyst)
financial.add_conditional_edges("analyst", should_escalate_to_supervisor)
financial.add_edge("supervisor", "respond")

financial_subgraph = financial.compile()
```

### 3.4 Comunicação Lateral (entre departamentos)

```python
def invoke_lateral(source_dept: str, target_dept: str, query: str, state: AgentState) -> dict:
    """
    Permite que um agente consulte outro departamento.
    Ex: Financeiro pergunta pra Produção se um custo faz sentido.
    """
    lateral_state = AgentState(
        tenant_id=state["tenant_id"],
        user_id="system",  # Request interna
        message=query,
        context={"source_department": source_dept, "lateral": True},
        department=target_dept,
        current_level="analyst",  # Começa no analista (não precisa do estagiário)
        confidence=0,
        reasoning="",
        data_gathered=state["data_gathered"],  # Compartilha dados já coletados
        actions_proposed=[],
        needs_human=False,
        response="",
        sources=[],
        tokens_used={},
        agent_path=[f"lateral_{source_dept}_to_{target_dept}"]
    )
    
    target_graph = get_department_graph(target_dept)
    result = target_graph.invoke(lateral_state)
    
    return {
        "department": target_dept,
        "response": result["response"],
        "confidence": result["confidence"],
        "data": result["data_gathered"]
    }
```

---

## 4. Departamentos e Responsabilidades

### 4.1 Departamento Financeiro

| Nível | Tarefas | Modelo | Dados (Supabase) |
|-------|---------|--------|-------------------|
| **Estagiário** | Validar NFs, classificar despesas, checar duplicatas, verificar CNPJ | Haiku | nf_documents, financial_records, invoices |
| **Analista** | Projeção fluxo de caixa, análise de margem, detecção anomalias, comparar fornecedores | Sonnet | + jobs, clients, budget_items, payment_history |
| **Supervisor** | Alertas proativos de margem, aprovação de gastos acima do teto, relatórios executivos | Sonnet/Opus | + lateral: Produção, Comercial |

**Cenários de escalation:**
- NF com valor >20% acima do orçado → Estagiário escala para Analista
- Margem do job caindo abaixo de 15% → Analista escala para Supervisor
- Fluxo de caixa negativo nos próximos 30 dias → Supervisor escala para CEO

### 4.2 Departamento de Produção

| Nível | Tarefas | Modelo | Dados |
|-------|---------|--------|-------|
| **Estagiário** | Checklist diário, status de entregáveis, alertas de deadline | Haiku | jobs, job_deliverables, job_shooting_dates |
| **Analista** | Análise de dailies, previsão de atrasos, otimização de cronograma | Sonnet | + allocations, job_team, job_history |
| **Supervisor** | Recomendações de replanejamento, comunicação com cliente, risk assessment | Sonnet | + lateral: Financeiro, RH |

### 4.3 Departamento de RH/Casting

| Nível | Tarefas | Modelo | Dados |
|-------|---------|--------|-------|
| **Estagiário** | Buscar freelancers disponíveis, verificar conflitos de agenda | Haiku | people, allocations, job_team |
| **Analista** | Matching inteligente (skills + histórico + avaliação), detecção de burnout | Sonnet | + supplier_reviews, jobs (histórico) |
| **Supervisor** | Sugestão proativa de equipe ao criar job, recomendação de backup | Sonnet | + lateral: Produção, Financeiro (custo) |

### 4.4 Departamento Jurídico

| Nível | Tarefas | Modelo | Dados |
|-------|---------|--------|-------|
| **Estagiário** | Gerar contratos via DocuSeal, checklist de documentos | Haiku | docuseal_submissions, people |
| **Analista** | Revisão de cláusulas, compliance ANCINE, alertas de prazo | Sonnet | + jobs, job_files |
| **Supervisor** | Revisão de contratos complexos, recomendação de alterações | Sonnet/Opus | + lateral: Financeiro |

### 4.5 Departamento Comercial

| Nível | Tarefas | Modelo | Dados |
|-------|---------|--------|-------|
| **Estagiário** | Follow-up de propostas, status de leads | Haiku | clients, agencies, jobs (pipeline) |
| **Analista** | Qualificação de leads, proposta comercial, estimativa de orçamento | Sonnet | + ai_budget_estimates, budget_items |
| **Supervisor** | Estratégia de pricing, análise de mercado, win/loss analysis | Sonnet | + lateral: Financeiro, Produção |

---

## 5. Schema do Banco de Dados

### 5.1 Tabelas Novas

```sql
-- ============================================================
-- Migration: Fase 10 — Sistema Multi-Agente
-- ============================================================

-- Logs de todas as decisões dos agentes
CREATE TABLE IF NOT EXISTS ai_agent_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    
    -- Identificação do agente
    department      TEXT NOT NULL,  -- 'financial', 'production', 'hr', 'legal', 'commercial'
    agent_level     TEXT NOT NULL,  -- 'router', 'intern', 'analyst', 'supervisor'
    agent_name      TEXT NOT NULL,  -- 'financial_intern', 'ellaih_router', etc.
    
    -- Input/Output
    input_message   TEXT,
    input_context   JSONB DEFAULT '{}',
    output_response TEXT,
    output_data     JSONB DEFAULT '{}',
    
    -- Métricas
    confidence      NUMERIC(5,2),  -- 0.00 - 100.00
    was_escalated   BOOLEAN NOT NULL DEFAULT false,
    escalated_to    TEXT,  -- 'analyst', 'supervisor', 'ceo'
    escalation_reason TEXT,
    
    -- Performance
    model_used      TEXT NOT NULL,  -- 'claude-haiku-4', 'claude-sonnet-4', 'claude-opus-4'
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    duration_ms     INTEGER,
    estimated_cost  NUMERIC(10,6),  -- USD
    
    -- Lateral communication
    lateral_calls   JSONB DEFAULT '[]',  -- [{target_dept, query, response_confidence}]
    
    -- Path
    agent_path      TEXT[] DEFAULT '{}',  -- ARRAY de agentes na chain
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_agent_department CHECK (
        department IN ('financial', 'production', 'hr', 'legal', 'commercial', 'general')
    ),
    CONSTRAINT chk_agent_level CHECK (
        agent_level IN ('router', 'intern', 'analyst', 'supervisor')
    )
);

COMMENT ON TABLE ai_agent_logs IS 'Log de todas as decisões e ações dos agentes IA. Append-only para auditoria.';

-- Fila de escalações para humanos
CREATE TABLE IF NOT EXISTS ai_escalations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_log_id    UUID NOT NULL REFERENCES ai_agent_logs(id) ON DELETE CASCADE,
    
    -- Contexto
    department      TEXT NOT NULL,
    escalation_type TEXT NOT NULL,  -- 'low_confidence', 'high_impact', 'anomaly', 'policy_violation'
    priority        TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    
    -- Conteúdo
    summary         TEXT NOT NULL,  -- Resumo para o CEO
    full_context    JSONB NOT NULL DEFAULT '{}',  -- Toda a cadeia de análise
    proposed_action JSONB,  -- O que a IA faria se tivesse confiança
    
    -- Resolução
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'resolved', 'dismissed'
    resolved_by     UUID REFERENCES profiles(id),
    resolved_at     TIMESTAMPTZ,
    resolution      TEXT,  -- O que o humano decidiu
    feedback_score  INTEGER,  -- 1-5: quão útil foi a análise da IA
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_escalation_status CHECK (status IN ('pending', 'resolved', 'dismissed')),
    CONSTRAINT chk_escalation_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_feedback_score CHECK (feedback_score IS NULL OR (feedback_score >= 1 AND feedback_score <= 5))
);

COMMENT ON TABLE ai_escalations IS 'Fila de decisões que a IA escalou para humanos. Inclui feedback loop.';

-- Memória de longo prazo por agente por tenant
CREATE TABLE IF NOT EXISTS ai_agent_memory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department      TEXT NOT NULL,
    memory_type     TEXT NOT NULL,  -- 'preference', 'calibration', 'pattern', 'rule'
    memory_key      TEXT NOT NULL,
    memory_value    JSONB NOT NULL,
    source          TEXT,  -- 'feedback', 'observation', 'explicit'
    confidence      NUMERIC(5,2) DEFAULT 50.00,
    times_used      INTEGER DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Um memory_key por department por tenant
    CONSTRAINT uq_agent_memory_key UNIQUE (tenant_id, department, memory_key)
);

COMMENT ON TABLE ai_agent_memory IS 'Memória de longo prazo dos agentes. Calibragem por feedback e observação.';

-- Configurações dos agentes por tenant
CREATE TABLE IF NOT EXISTS ai_agent_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department      TEXT NOT NULL,
    
    -- Thresholds de confiança
    intern_threshold    INTEGER NOT NULL DEFAULT 70,
    analyst_threshold   INTEGER NOT NULL DEFAULT 50,
    supervisor_threshold INTEGER NOT NULL DEFAULT 30,
    
    -- Modelos
    intern_model    TEXT NOT NULL DEFAULT 'claude-haiku-4-20250514',
    analyst_model   TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    supervisor_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    
    -- Comportamento
    auto_escalate_to_ceo BOOLEAN NOT NULL DEFAULT true,
    lateral_calls_enabled BOOLEAN NOT NULL DEFAULT true,
    proactive_alerts     BOOLEAN NOT NULL DEFAULT false,  -- V2
    
    -- Limites
    max_tokens_per_request INTEGER NOT NULL DEFAULT 4000,
    max_lateral_calls      INTEGER NOT NULL DEFAULT 3,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_agent_config_dept UNIQUE (tenant_id, department)
);

COMMENT ON TABLE ai_agent_config IS 'Configurações customizáveis dos agentes por departamento por tenant.';
```

### 5.2 Índices

```sql
-- Logs: busca por tenant + data (dashboard de métricas)
CREATE INDEX idx_agent_logs_tenant_date ON ai_agent_logs(tenant_id, created_at DESC);

-- Logs: filtro por departamento
CREATE INDEX idx_agent_logs_dept ON ai_agent_logs(tenant_id, department, created_at DESC);

-- Escalações pendentes
CREATE INDEX idx_escalations_pending ON ai_escalations(tenant_id, status, priority DESC)
    WHERE status = 'pending';

-- Memória: lookup rápido
CREATE INDEX idx_agent_memory_lookup ON ai_agent_memory(tenant_id, department, memory_type);

-- RLS
ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_logs_tenant" ON ai_agent_logs
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "ai_escalations_tenant" ON ai_escalations
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "ai_agent_memory_tenant" ON ai_agent_memory
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "ai_agent_config_tenant" ON ai_agent_config
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT get_tenant_id()));
```

---

## 6. LangGraph Server (Deploy)

### 6.1 Docker Compose (VPS Hetzner)

```yaml
# docker-compose.langgraph.yml
version: '3.8'

services:
  langgraph-server:
    build:
      context: ./langgraph
      dockerfile: Dockerfile
    ports:
      - "8100:8000"  # Expor na porta 8100 (8000 é do n8n)
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}  # Observabilidade
      - LANGSMITH_PROJECT=ellahos-agents
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}
    volumes:
      - ./langgraph/src:/app/src
    restart: unless-stopped
    networks:
      - ellahos-network
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

networks:
  ellahos-network:
    external: true  # Compartilha com n8n
```

### 6.2 Estrutura do Projeto Python

```
langgraph/
├── Dockerfile
├── pyproject.toml
├── src/
│   ├── main.py                   # FastAPI app + endpoints
│   ├── config.py                 # Settings, env vars
│   ├── models.py                 # Pydantic models (request/response)
│   ├── state.py                  # AgentState TypedDict
│   │
│   ├── graphs/
│   │   ├── __init__.py
│   │   ├── ellaih_router.py      # Grafo principal (Ellaih)
│   │   ├── financial.py          # Subgrafo financeiro
│   │   ├── production.py         # Subgrafo produção
│   │   ├── hr.py                 # Subgrafo RH
│   │   ├── legal.py              # Subgrafo jurídico
│   │   └── commercial.py         # Subgrafo comercial
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py               # BaseAgent class
│   │   ├── financial/
│   │   │   ├── intern.py
│   │   │   ├── analyst.py
│   │   │   └── supervisor.py
│   │   ├── production/
│   │   │   ├── intern.py
│   │   │   ├── analyst.py
│   │   │   └── supervisor.py
│   │   └── ... (hr, legal, commercial)
│   │
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── router.py             # System prompts da Ellaih
│   │   ├── financial.py          # Prompts do dept financeiro
│   │   ├── production.py
│   │   └── ... 
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── supabase_reader.py    # Leitura de dados do Supabase
│   │   ├── supabase_writer.py    # Escrita (logs, escalations)
│   │   ├── lateral.py            # Comunicação entre departamentos
│   │   └── n8n_trigger.py        # Disparar workflows n8n
│   │
│   └── checkpointer/
│       ├── __init__.py
│       └── postgres.py           # PostgreSQLCheckpointer
│
└── tests/
    ├── test_router.py
    ├── test_financial.py
    └── ...
```

### 6.3 Dependências (pyproject.toml)

```toml
[project]
name = "ellahos-langgraph"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "langgraph>=0.2.0",
    "langchain-anthropic>=0.3.0",
    "langchain-core>=0.3.0",
    "fastapi>=0.115.0",
    "uvicorn>=0.32.0",
    "supabase>=2.0.0",
    "pydantic>=2.0.0",
    "httpx>=0.27.0",           # Para chamadas HTTP (n8n, etc)
    "langsmith>=0.2.0",        # Observabilidade
    "psycopg[binary]>=3.0.0",  # Para checkpointer PostgreSQL
]

[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "ruff"]
```

---

## 7. Integração com o ELLAHOS Existente

### 7.1 Edge Function Gateway (ai-agents-gateway)

Nova Edge Function que serve como proxy autenticado entre o frontend e o LangGraph Server.

```typescript
// supabase/functions/ai-agents-gateway/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";

const LANGGRAPH_URL = Deno.env.get("LANGGRAPH_SERVER_URL") || "http://langgraph-server:8000";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  const { user, tenantId, supabase } = await getAuthContext(req);
  
  const url = new URL(req.url);
  const path = url.pathname.replace("/ai-agents-gateway", "");

  // Proxy para LangGraph com contexto de tenant
  const body = await req.json();
  const enrichedBody = {
    ...body,
    tenant_id: tenantId,
    user_id: user.id,
  };

  const response = await fetch(`${LANGGRAPH_URL}${path}`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-Tenant-ID": tenantId,
    },
    body: JSON.stringify(enrichedBody),
  });

  // Se streaming, retornar SSE
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const data = await response.json();
  return successResponse(data);
});
```

### 7.2 Evolução do ai-copilot existente

O `ai-copilot` da Fase 8 passa a rotear para o LangGraph quando disponível:

```typescript
// ai-copilot/handlers/chat.ts (modificação)

async function handleChat(req: Request, supabase, tenantId, userId) {
  const { message, conversation_id, context } = await req.json();
  
  const LANGGRAPH_ENABLED = await getTenantSetting(supabase, tenantId, "langgraph_enabled");
  
  if (LANGGRAPH_ENABLED) {
    // Fase 10: rotear para LangGraph (multi-agente)
    return proxyToLangGraph(message, conversation_id, context, tenantId, userId);
  } else {
    // Fase 8: fallback para Claude direto (single-agent)
    return directClaudeResponse(message, conversation_id, context, tenantId, userId);
  }
}
```

### 7.3 Integração com n8n

O LangGraph pode disparar workflows n8n quando uma ação requer integração externa:

```python
# src/tools/n8n_trigger.py

import httpx

N8N_WEBHOOK_BASE = "https://ia.ellahfilmes.com/webhook"

async def trigger_n8n_workflow(workflow_name: str, payload: dict) -> dict:
    """Agente IA dispara workflow n8n para ações no mundo real."""
    
    workflows = {
        "send_nf_request": f"{N8N_WEBHOOK_BASE}/nf-request",
        "create_docuseal_contract": f"{N8N_WEBHOOK_BASE}/docuseal-contract",
        "send_whatsapp_notification": f"{N8N_WEBHOOK_BASE}/whatsapp-notify",
        "create_drive_folder": f"{N8N_WEBHOOK_BASE}/drive-folder",
    }
    
    url = workflows.get(workflow_name)
    if not url:
        raise ValueError(f"Workflow {workflow_name} não encontrado")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=30)
        return response.json()
```

---

## 8. Implementação com os Agents do Claude Code

### 8.1 Mapa de Responsabilidades

| Agent (.claude/agents/) | Responsabilidade na Fase 10 | Carga |
|------------------------|----------------------------|-------|
| **ai-engineer** | Líder: arquitetura LangGraph, grafos, prompts, state design | **ALTA** |
| **backend-dev** | Edge Functions gateway, integração Supabase, API FastAPI | **ALTA** |
| **db-architect** | Migration (4 tabelas), índices, RLS | Média |
| **devops** | Docker compose, deploy VPS, networking | **ALTA** |
| **n8n-architect** | Webhooks para LangGraph triggers, novos endpoints | Média |
| **integrations-engineer** | Conectar LangGraph com n8n, DocuSeal, Drive, WhatsApp | Média |
| **frontend-dev** | Dashboard de agentes, escalation queue, config UI | Média |
| **security-engineer** | Auth entre Edge Functions↔LangGraph, secrets, RBAC | Média |
| **qa-engineer** | Testes E2E multi-agente, chaos testing | Média |
| **tech-lead** | ADRs, code review, decisions | Média |
| **ui-designer** | Specs visuais: agent dashboard, escalation queue | Baixa |

### 8.2 Plano de Execução (4 semanas)

#### Semana 1: Foundation

| Dia | Agent | Tarefa |
|-----|-------|--------|
| 1-2 | **db-architect** | Migration: ai_agent_logs, ai_escalations, ai_agent_memory, ai_agent_config |
| 1-2 | **devops** | Setup Docker: Python 3.12 + FastAPI + LangGraph no VPS Hetzner |
| 1-2 | **ai-engineer** | Scaffolding do projeto Python: state.py, config.py, main.py |
| 2-3 | **ai-engineer** | Implementar Ellaih Router Graph (classify_intent + route) |
| 3-4 | **backend-dev** | Edge Function ai-agents-gateway (proxy autenticado) |
| 4-5 | **devops** | Networking: VPS↔Supabase, testes de conectividade |

#### Semana 2: Departamentos Core

| Dia | Agent | Tarefa |
|-----|-------|--------|
| 6-7 | **ai-engineer** | Subgrafo Financeiro (intern + analyst + supervisor + edges) |
| 6-7 | **ai-engineer** | Subgrafo Produção (idem) |
| 8-9 | **ai-engineer** | Subgrafo RH (idem) |
| 8-9 | **backend-dev** | tools/supabase_reader.py (queries de contexto por departamento) |
| 9-10 | **backend-dev** | tools/supabase_writer.py (logs, escalations, memory) |
| 10 | **ai-engineer** | Comunicação lateral entre departamentos |

#### Semana 3: Integração + Frontend

| Dia | Agent | Tarefa |
|-----|-------|--------|
| 11-12 | **backend-dev** | Modificar ai-copilot para rotear para LangGraph |
| 11-12 | **n8n-architect** | Webhooks para LangGraph (n8n ↔ agentes) |
| 12-13 | **frontend-dev** | Agent Dashboard (métricas, logs, path visualization) |
| 13-14 | **frontend-dev** | Escalation Queue UI (pendentes, resolver, feedback) |
| 14-15 | **frontend-dev** | Agent Config page (thresholds, modelos, toggles) |

#### Semana 4: QA + Polish + Deploy

| Dia | Agent | Tarefa |
|-----|-------|--------|
| 16-17 | **qa-engineer** | Testes E2E: mensagem → routing → escalation → resolution |
| 17-18 | **security-engineer** | Audit: auth gateway, secrets, data isolation |
| 18-19 | **ai-engineer** | Fine-tuning de prompts baseado em testes |
| 19-20 | **devops** | Deploy production, monitoring, health checks |
| 20 | **all** | Bug fixes + documentação final |

---

## 9. Feedback Loop e Melhoria Contínua

### 9.1 Como a IA melhora com o tempo

```
Usuário interage
       │
       ▼
Agente decide (confidence: X)
       │
       ├── confidence >= threshold → Ação executada
       │       │
       │       ▼
       │   Resultado observado
       │       │
       │       ▼
       │   Salvar em ai_agent_memory:
       │   "para jobs tipo X com cliente Y, valor médio é Z"
       │
       └── confidence < threshold → Escalation
               │
               ▼
           CEO resolve
               │
               ▼
           feedback_score (1-5)
               │
               ▼
           Atualizar ai_agent_memory:
           "CEO preferiu abordagem A em vez de B neste cenário"
           Ajustar prompts com novo few-shot example
```

### 9.2 Métricas do Dashboard de Agentes

| Métrica | O que mede | Target |
|---------|-----------|--------|
| Escalation Rate | % de requests que chegam ao CEO | <15% |
| Resolution Time | Tempo médio de resolução de escalations | <4h |
| Confidence Accuracy | Agente disse 80% confidence → estava certo 80% das vezes | >75% |
| Cost per Decision | Custo médio em tokens por decisão completa | <$0.05 |
| Lateral Efficiency | % de comunicações laterais que agregaram valor | >60% |
| Feedback Score Médio | Média de feedback do CEO nas escalations | >3.5/5 |
| Agent Path Length | Média de agentes na chain por request | 2-3 |

---

## 10. Riscos e Mitigações

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| LangGraph Server cai | Alto | Médio | Fallback para Fase 8 (Claude direto). Toggle `langgraph_enabled` |
| Latência alta (>15s) | Médio | Alto | Estagiário responde rápido (Haiku). Streaming desde o primeiro token |
| Custo de tokens dispara | Alto | Médio | Rate limiting por tier. Haiku para 70% das interações |
| Loop infinito entre agentes | Crítico | Baixo | Max 5 agentes por chain. Timeout de 30s |
| Decisão errada sem escalation | Alto | Médio | Thresholds conservadores iniciais. Auditoria semanal |
| Complexidade de manutenção | Médio | Alto | Prompts versionados. Testes automatizados por subgrafo |
| VPS sem recursos | Médio | Baixo | Container com limits. Escalar VPS se necessário |

---

## 11. De-risking: Implementação Gradual

A Fase 10 NÃO precisa ser big-bang. Sequência recomendada:

**Sprint 1 (Semanas 1-2):** Apenas Ellaih Router + Departamento Financeiro
- Validar que a hierarquia funciona E2E
- Testar escalation com caso real (NFs)
- Se falhar, voltar para Fase 8 sem impacto

**Sprint 2 (Semanas 3-4):** Adicionar Produção + RH
- Mais departamentos usando o padrão validado
- Comunicação lateral financeiro↔produção

**Sprint 3 (Semanas 5-6):** Jurídico + Comercial + Dashboard completo
- Sistema completo
- Feedback loop ativo
- Métricas de melhoria

**Sprint 4 (Semana 7+):** Proactive Agents (V2)
- Agentes que detectam problemas sem ser perguntados
- Notificações proativas via WhatsApp
- Ellaih como canal único (WhatsApp + Web)

---

## 12. Relação com Documentos Existentes

| Documento | Relação com Fase 10 |
|-----------|-------------------|
| ai-evolution-roadmap.md | Fase 10 implementa **Estágio 2** (Agentes com Memória) e prepara **Estágio 3** (Ellaih Integrada) |
| fase-8-ai-architecture.md | Features da Fase 8 viram "tools" dos agentes. claude-client.ts reutilizado |
| fase-9-automacoes-architecture.md | Workflows n8n da Fase 9 podem ser triggados pelos agentes |
| fase-9-execution-plan.md | Padrão de execution plan e inventário de agents replicado aqui |
| full-roadmap.md | Fase 10 é evolução natural pós-Fase 9 |

---

## 13. Conclusão

Esta arquitetura transforma o ELLAHOS de um sistema com features de IA isoladas para uma **empresa com departamentos de IA autônomos sob supervisão humana**. O LangGraph dá o controle necessário para implementar hierarquia, escalation, comunicação lateral e feedback loop de forma robusta.

A implementação gradual (1 departamento por vez) reduz risco e permite validar o modelo antes de expandir. Os agents do Claude Code já existentes são perfeitamente adequados para desenvolver cada camada.

**Próximo passo:** Após aprovação deste documento, o `ai-engineer` começa o scaffolding do projeto Python e o `devops` prepara o Docker no VPS.

---

*Documento vivo — atualizar conforme sprints são concluídos.*
