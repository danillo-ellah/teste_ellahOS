# EllaOS — Auditoria Completa de Gaps (Marco 2026)

**Data:** 2026-03-07
**Autor:** PM + Tech Lead + Product Consultant (Claude Opus 4.6)
**Origem:** Pente fino solicitado pelo CEO — cruzamento entre o que foi definido vs o que existe

---

## 1. Diagnostico Geral

O EllaOS tem **infraestrutura excelente** (60+ tabelas, RLS, CI/CD, 51 Edge Functions, 37 paginas) e **features tecnicas impressionantes** (Claquete ANCINE, CRM Kanban, DocuSeal, Portal do Cliente). Porem, o sistema foi construido como um conjunto de **ferramentas tecnicas**, nao como um **espelho da estrutura organizacional da produtora**.

O CEO descreveu areas — Atendimento, Pos-Producao, Vendas, Fornecedores por job — com minucia em 18 respostas operacionais + 10 respostas financeiras. O que foi construido: 19 abas no job detail focadas em tarefas tecnicas (claquete, storyboard, figurino), enquanto areas estrategicas do dia-a-dia nao existem como modulos.

### Numeros da auditoria
- **37 gaps identificados**
- **6 criticos** | **9 altos** | **15 medios** | **7 baixos**
- **0 modulos de area completos** (Atendimento, Pos, Fornecedores por job)
- **RBAC**: mapa perfeito, execucao incompleta

---

## 2. Inventario de Rotas Existentes (37 paginas)

### Nivel superior
| Rota | Status | Area |
|------|--------|------|
| `/` (Dashboard) | Producao | Geral |
| `/jobs` | Producao | Jobs |
| `/jobs/[id]` (19 abas) | Producao | Jobs |
| `/approvals` | Beta | Gestao |
| `/team/calendar` | Beta | Equipe |
| `/notifications` | Beta | Geral |
| `/reports` | Beta | Gestao |
| `/portal` | Beta | Atendimento/Gestao |

### CRM
| Rota | Status |
|------|--------|
| `/crm` (Pipeline Kanban) | Producao |
| `/crm/[id]` | Producao |
| `/crm/dashboard` | Beta |
| `/crm/report` | Beta |

### Cadastros
| Rota | Status |
|------|--------|
| `/clients`, `/clients/[id]` | Producao |
| `/agencies`, `/agencies/[id]` | Producao |
| `/people`, `/people/[id]` | Producao |

### Financeiro
| Rota | Status |
|------|--------|
| `/financeiro` | Producao |
| `/financeiro/vendors` | Producao |
| `/financeiro/calendario` | Producao |
| `/financeiro/nf-validation` | Beta |
| `/financeiro/nf-request` | Beta |
| `/financeiro/conciliacao` | Beta |
| `/jobs/[id]/financeiro/*` (5 sub-rotas) | Producao |

### Admin/Settings
| Rota | Status |
|------|--------|
| `/admin/equipe` | Beta |
| `/admin/settings` | Beta |
| `/admin/financeiro/categorias` | Beta |
| `/settings/*` (4 paginas) | Beta |

---

## 3. Gaps Criticos (6)

### GAP-001: Modulo de Atendimento
**Severidade: CRITICO** | **Area: Atendimento**

O CEO definiu Atendimento como "coracao da produtora". Na industria publicitaria brasileira, Atendimento e um cargo estrategico — a ponte entre cliente/agencia e equipe interna. Gerencia comunicacao, escopo, aprovacoes, logistica do cliente.

**O que o CEO pediu:**
- Pagina dedicada com dashboard de acompanhamento
- Documento "Aprovacao Interna" (detalha tudo sobre o job aprovado)
- Registro de comunicacao com cliente
- Controle de escopo vs extras
- Logistica do cliente (passagens, hoteis)

**O que existe:** Zero. Nao ha rota, componente ou arquivo. O papel `atendimento` existe no RBAC mas sem modulo proprio.

**Pasta Drive definida:** `09_ATENDIMENTO/` com sub-pastas de pre e pos-producao.

### GAP-002: Modulo de Pos-Producao Completo
**Severidade: CRITICO** | **Area: Pos-Producao**

O CEO descreveu pos-producao como ciclo completo: sub-status (Edicao, Cor, VFX, Finalizacao, Audio), controle de versoes, review com timecode, material bruto com lifecycle.

**O que existe:** Migalhas — aba Storyboard (pre-producao), aba Entregaveis (status basicos), enum pos_sub_status. Nao existe modulo integrado.

**O que falta:** Timeline de versoes, upload de cortes para review, notas com timecode, aprovacao por versao, lifecycle do material bruto (bruto → ativo → arquivado → glacier).

### GAP-003: RBAC Nao Funciona na Pratica
**Severidade: CRITICO** | **Area: Seguranca**

O access-control-map.ts define 15 RoleGroups × 19 tabs com 4 niveis de acesso. O mapa e sofisticado e correto. Porem:

- **Fase 2** (guards sub-secoes): Parcialmente implementado (financeiro layout guard, TabEquipe edit restriction, TabFinanceiro mascaramento). Sidebar filtrada. Mas rotas como `/financeiro/conciliacao` provavelmente acessiveis por URL direto para roles nao autorizados.
- **Fase 3** (override por job): AccessOverrideDialog existe no frontend, campo access_override no schema. Nao verificado se funciona end-to-end.
- **Fase 4** (backend mascaramento): NAO implementado. A API retorna campos financeiros para qualquer role autenticado.

**Impacto real:** Um freelancer provavelmente consegue ver o valor fechado do job e os caches de outros membros da equipe.

### GAP-004: Drive Automacao Morta em Producao
**Severidade: CRITICO** | **Area: Integracao**

A automacao central — criar estrutura de 30 pastas quando job e aprovado (substituir o `copiarPastaBaseAdm` do Apps Script) — depende de credenciais reais que nao estao configuradas em producao.

O backend esta implementado (google-drive-client.ts, drive-permissions). As credenciais nao estao ativas.

### GAP-005: Controle de Receitas (Faturamento ao Cliente)
**Severidade: CRITICO** | **Area: Financeiro**

O financeiro tem dois lados: custos (bem cobertos) e receitas. O sistema so rastreia custos.

**O que falta:** Modulo de receivables — parcelas que o cliente vai pagar, datas, status (recebido/pendente/atrasado), vinculado ao job. Hoje controlado em planilha separada.

### GAP-006: Portal do Fornecedor
**Severidade: ALTO** | **Area: Financeiro**

CEO pediu explicitamente (P-FIN-003): "Area onde o fornecedor faz login e gerencia seus proprios dados (dados pessoais, bancarios, documentos). Substitui o Google Forms."

**O que existe:** Nada. Nao ha rota `/portal/vendor/[token]`.

---

## 4. Gaps Altos (9)

| # | Gap | Area | Detalhe |
|---|-----|------|---------|
| 7 | CRM → Job automatico | Comercial | Oportunidade aprovada deveria criar Job pre-populado |
| 8 | Carta Orcamento automatica | Jobs | Google Doc timbrado gerado ao aprovar job |
| 9 | Aprovacao pagamento por faixa valor | Financeiro | >R$5k requer aprovacao CEO/CFO (P-FIN-002) |
| 10 | Custos fixos (overhead) | Financeiro | Aluguel, salarios, ferramentas sem job (P1) |
| 11 | Alertas WhatsApp reais | Comunicacao | Z-API configurada mas nao dispara alertas |
| 12 | IAs especializadas | IA | 6 agentes prometidos, so ELLA generica existe |
| 13 | Versionamento entregaveis | Pos-Producao | v1, v2 com correcoes (CEO resposta 9) |
| 14 | Threshold verba a vista | Financeiro | >10% orcamento requer aprovacao (P-FIN-005) |
| 15 | NF automacao n8n | Financeiro | Endpoint pronto, workflow n8n nao criado |

---

## 5. Gaps Medios (15)

| # | Gap | Area |
|---|-----|------|
| 16 | Chat interno por job | Comunicacao |
| 17 | Logistica (passagens, hoteis) | Producao |
| 18 | Historico projetos por pessoa | RH/Equipe |
| 19 | Sub-jobs com hierarquia | Jobs |
| 20 | Versionamento orcamentos (v1, v2) | Financeiro |
| 21 | Formulario cadastro equipe auto | Equipe |
| 22 | Alerta conflito agenda | Equipe |
| 23 | Customizacao status por produtora | Admin/SaaS |
| 24 | Frame.io integracao frontend | Pos-Producao |
| 25 | Cotacao comparativa fornecedores | Producao |
| 26 | Supabase Realtime | Infra |
| 27 | PWA / Mobile | UX |
| 28 | Dashboard metricas faltando | Dashboard |
| 29 | Calendario equipe conflitos | Equipe |
| 30 | Conciliacao bancaria CNAB | Financeiro |

---

## 6. Gaps Baixos (7)

| # | Gap | Area |
|---|-----|------|
| 31 | Diario producao upload direto foto | Producao |
| 32 | Storyboard exportacao PDF | Producao |
| 33 | Relatorios exportacao master | Financeiro |
| 34 | Multi-tenant Colorbar | SaaS |
| 35 | Onboarding self-service | SaaS |
| 36 | Billing Stripe | SaaS |
| 37 | Documentacao usuario | SaaS |

---

## 7. Plano de Acao — Blocos de Execucao

### Bloco 1: Fundacao Funcional (~1 semana)
| Sprint | Entregavel | Impacto |
|--------|-----------|---------|
| 1.1 | RBAC Fases 2-4 completo (guards rotas, backend mascaramento) | Seguranca real |
| 1.2 | Modulo Atendimento MVP (pagina + Aprovacao Interna + dashboard) | Area #1 do CEO |
| 1.3 | Receitas do cliente (parcelas faturamento por job) | Financeiro completo |

### Bloco 2: Operacao Completa (~1 semana)
| Sprint | Entregavel | Impacto |
|--------|-----------|---------|
| 2.1 | Pos-Producao MVP (timeline + versoes + aprovacao) | Maior gap operacional |
| 2.2 | CRM → Job conversion | Elimina trabalho duplo |
| 2.3 | Drive credenciais reais + automacao pastas | Substitui Apps Script |

### Bloco 3: Diferenciacao (~1 semana)
| Sprint | Entregavel | Impacto |
|--------|-----------|---------|
| 3.1 | IA Financeira v1 (alertas estouro, sugestao cortes) | Diferencial competitivo |
| 3.2 | IA Atendimento v1 (WhatsApp monitoring) | CEO prioridade #2 |
| 3.3 | Portal Fornecedor + aprovacao por faixa valor | Operacao financeira |

### Bloco 4: Polish + SaaS (~2 semanas)
| Sprint | Entregavel | Impacto |
|--------|-----------|---------|
| 4.1 | Alertas WhatsApp reais (Z-API) | Comunicacao |
| 4.2 | Versionamento entregaveis + Frame.io | Pos-producao |
| 4.3 | Custos fixos + threshold verba | Financeiro |
| 4.4 | PWA + mobile polish | UX |
| 4.5 | Onboarding Colorbar | Primeiro tenant externo |

---

## 8. Metricas de Sucesso

| Metrica | Meta |
|---------|------|
| % de abas corretamente filtradas por role | 100% |
| Atendimento consegue trabalhar sem WhatsApp | >50% das tarefas |
| Pos-producao gerenciada no sistema | >50% dos jobs |
| NFs processadas automaticamente | >80% |
| Jobs gerenciados end-to-end | 100% dos jobs Ellah |
| NPS da equipe interna | >8 |

---

## 9. Conclusao

O EllaOS tem fundacao tecnica solida. O que falta e transformar essa fundacao em **modulos que refletem como uma produtora realmente funciona**. O CEO definiu isso com clareza — as respostas estao documentadas, o mapa de permissoes esta pronto, a estrutura de pastas do Drive esta mapeada.

A prioridade agora e: **parar de construir features tecnicas novas e completar as areas organizacionais que o CEO definiu**. Atendimento primeiro, Pos segundo, RBAC em paralelo.

---

*Documento gerado a partir de auditoria cruzada entre: docs/ELLAHOS_Respostas_e_Contexto_Operacional.md, docs/specs/respostas-perguntas-financeiro.md, docs/specs/strategic-vision/01-product-roadmap.md, frontend/src/app/(dashboard)/*, frontend/src/lib/access-control-map.ts, e analise de 37 paginas existentes.*
