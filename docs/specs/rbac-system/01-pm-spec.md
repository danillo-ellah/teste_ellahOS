# RBAC System — Spec PM

**Versao:** 1.0
**Data:** 2026-03-05
**Status:** RASCUNHO — aguardando revisao CEO
**Autor:** PM (Claude Sonnet 4.6)
**Origem:** Decisoes do CEO nas 31 perguntas de permissoes (06/03/2026) + auditoria do frontend

---

## 1. Problema

Hoje no EllaOS **todos os usuarios autenticados veem todas as paginas e dados de todos os jobs**. Nao existe controle de acesso sistematico no frontend nem nas Edge Functions de leitura de dados.

### Exemplos concretos do problema

- Um Diretor de Cena (freelancer criativo) abre qualquer job e ve: valor fechado, margem de lucro, orcamento total, custos reais, adiantamentos da equipe. Isso e inaceitavel.
- Um Editor de pos-producao ve contratos de producao, carta de orcamento do cliente, valores negociados. Isso e confidencial.
- O Financeiro ve informacoes de storyboard e direcao criativa que nao sao relevantes para sua funcao.
- Qualquer usuario acessa o Portal do Cliente e pode criar ou ver sessoes de aprovacao.
- Um tecnico de set (gaffer, som direto) acessa a area de Contratos e ve o cache de toda a equipe.

### Impacto

- Risco de vazamento de dados financeiros sensiveis (margem, closed_value, orcamento)
- Risco de picaretagem: membros que conhecem o cache uns dos outros podem negociar mal
- Falta de foco: usuarios veem informacoes irrelevantes para sua funcao
- Contrario ao que o CEO definiu explicitamente nas 31 perguntas de permissoes

---

## 2. Principio de Fonte Unica de Verdade

O mapa de permissoes e **unico e compartilhado** entre o Drive e o sistema EllaOS.

As mesmas regras que determinam se o Financeiro tem acesso a pasta `02A_ORCAMENTO_CARTA` no Drive determinam se ele ve a sub-pagina de Orcamento no sistema.

**Implementacao:** o arquivo `_shared/drive-permission-map.ts` (ja existe para o Drive) sera complementado por `frontend/src/lib/access-control-map.ts` que mapeia roles para paginas/abas do sistema. Ambos derivam do mesmo mapa de negocio definido pelo CEO.

### Hierarquia de controle de acesso

```
profiles.role    (user_role enum)        ->  acesso GLOBAL (sidebar, modulos do sistema)
job_team.role    (team_role enum)        ->  acesso POR JOB (abas, sub-secoes)
job_team.access_override  (JSONB novo)  ->  override especifico por membro+job (PE/Admin configura)
```

**Regra de combinacao:** O acesso efetivo e o MAXIMO entre o role global do perfil e o role no job_team. Se uma pessoa e `user_role=freelancer` mas esta no `job_team` com `role=produtor_executivo`, ela tem acesso de PE *naquele job especifico*.

---

## 3. Glossario: Roles do Sistema

### 3.1 Roles Globais (profiles.role = user_role enum no banco)

| user_role (enum) | Papel na Empresa | Status no Enum | Observacao |
|---|---|---|---|
| `admin` | Administrador do sistema | Existe | Acesso total |
| `ceo` | CEO / Danillo | Existe | Acesso total |
| `produtor_executivo` | Produtor Executivo | Existe | Acesso amplo |
| `diretor_producao` | Diretor de Producao | **NOVO** | Ve custo producao, NAO orcamento total |
| `coordenador` | Coordenador de Producao | Existe | Configuravel por job |
| `financeiro` | Financeiro | Existe | So financeiro e contratos (leitura) |
| `juridico` | Juridico | **NOVO** | So contratos |
| `atendimento` | Atendimento / Account | Existe | Ponte cliente-equipe |
| `comercial` | CCO | Existe | Vendas, CRM |
| `diretor` | Diretor de Cena | Existe | Criativo, NUNCA financeiro |
| `freelancer` | Freelancer generico | Existe | Acesso minimo |

### 3.2 Roles de Projeto (job_team.role = team_role enum no banco)

| team_role (enum) | Papel no Job | Status | Mapa para user_role |
|---|---|---|---|
| `diretor` | Diretor de Cena | Existe | `diretor` |
| `produtor_executivo` | PE do job | Existe | `produtor_executivo` |
| `coordenador_producao` | Coordenador | Existe | `coordenador` |
| `dop` | Dir. Fotografia | Existe | `freelancer` |
| `primeiro_assistente` | 1a AD | Existe | `diretor` |
| `editor` | Editor | Existe | `freelancer` (pos) |
| `colorista` | Colorista | Existe | `freelancer` (pos) |
| `motion_designer` | Motion | Existe | `freelancer` (pos) |
| `finalizador` | Finalizador | **NOVO** | `freelancer` (pos amplo) |
| `diretor_arte` | Dir. Arte | Existe | `freelancer` (arte) |
| `figurinista` | Figurinista | Existe | `freelancer` (figurino) |
| `produtor_casting` | Casting | Existe | `freelancer` (elenco) |
| `produtor_locacao` | Locacao | Existe | `freelancer` |
| `diretor_producao` | Dir. Producao | **NOVO** | `diretor_producao` |
| `gaffer` | Gaffer | Existe | `freelancer` (tecnico) |
| `som_direto` | Som Direto | Existe | `freelancer` (tecnico) |
| `maquiador` | Maquiador | Existe | `freelancer` (tecnico) |
| `outro` | Outro | Existe | `freelancer` |

---

## 4. User Stories

### US-RBAC-01: Diretor de Cena nao ve aba Financeiro
**Como** Diretor de Cena, **quero** ver apenas abas relevantes ao trabalho criativo.
- Financeiro, Contratos, Portal, Historico: ocultos
- Equipe: sem campo fee/cache
- Abas visiveis: Geral (sem valores), Equipe (sem fees), Entregaveis, PPM, Diarias, Locacoes, Storyboard, Ordem do Dia, Diario, Cronograma, Aprovacoes, Claquete

### US-RBAC-02: Financeiro ve o que e relevante
**Como** Financeiro, **quero** acessar areas financeiras e contratos (readonly).
- NAO ve: PPM, Storyboard, Diario, Figurino, Elenco, Portal, Historico
- CRM/Pipeline: nao aparece na sidebar

### US-RBAC-03: Atendimento — acesso amplo ao relacionamento com cliente
**Como** Atendimento, **quero** ver tudo que envolve relacionamento com cliente.
- Ve Financeiro APENAS sub-pagina Orcamento (readonly)
- NAO ve: custos reais, dashboard com margem, verbas, contratos prod/equipe, cache da equipe

### US-RBAC-04: Admin e CEO veem tudo
**Como** admin/CEO, **quero** acesso completo a tudo.

### US-RBAC-05: Dir. Producao ve custo mas nao orcamento total
**Como** Dir. Producao, **quero** ver custos e logistica do projeto.
- Dashboard: graficos de gasto, mas "Valor Fechado", "Lucro Bruto", "Margem" mascarados
- NAO ve: Orcamento, Verbas, Calendario Pagamentos, Storyboard, PPM, Elenco, Contratos

### US-RBAC-06: PE pode dar override por membro por job
**Como** PE, **quero** expandir/restringir acesso de membro especifico naquele job.
- Override em `job_team.access_override` (JSONB)
- Isolado por job

### US-RBAC-07: Abas sem acesso ficam ocultas (Opcao A)
- Ocultas, nao "desabilitadas"
- URL direto redireciona pra Geral

### US-RBAC-08: Tecnicos veem so cronograma + ordem do dia
**Como** gaffer/som/maquiador, **quero** ver so quando e onde preciso estar.

### US-RBAC-09: Sidebar filtrada por role
- `diretor`: Jobs, Calendario, Pessoas
- `financeiro`: Jobs + toda area Financeiro
- `comercial`: Jobs + Comercial + Clientes/Agencias

### US-RBAC-10: Mapa centralizado
- `access-control-map.ts` como fonte unica
- Remover arrays hardcoded: `BUDGET_ALLOWED_ROLES`, `APPROVAL_PDF_ROLES`, etc.

---

## 5. Mapa de Acesso — Abas do Job

**Legenda:** VE = Ver+Editar | V = Somente Ver | V* = Ver com restricoes | [cfg] = Configuravel por job | — = Oculto

| Aba do Job | ADM/CEO | PE | DP | CO | FIN | JUR | ATD | CCO | DC/1AD | DOP | ED | DA | FIG | CAS | TEC |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Geral** | VE | VE | V* | V | V* | — | V | V* | V* | V | V* | V | — | — | — |
| **Equipe** | VE | VE | V* | V | V* | — | V* | — | V* | — | V* | — | — | — | — |
| **Entregaveis** | VE | VE | V | V | V | V | V | V | V | — | V | — | — | — | — |
| **PPM** | VE | VE | — | [cfg] | — | — | V | — | VE | — | — | VE | — | — | — |
| **Diarias** | VE | VE | V | V | — | — | — | — | VE | V | V | V | V | V | V |
| **Locacoes** | VE | VE | V | V | — | — | — | — | VE | V | — | — | — | — | — |
| **Storyboard** | VE | VE | — | — | — | — | — | — | VE | — | — | — | — | — | — |
| **Elenco** | VE | VE | — | — | — | VE | — | — | — | — | — | — | — | VE | — |
| **Ordem do Dia** | VE | VE | V | V | — | — | — | — | VE | V | V | V | V | V | V |
| **Diario** | VE | VE | V | V | — | — | — | — | VE | V | V | — | — | — | — |
| **Figurino/Arte** | VE | VE | — | — | — | — | — | — | — | — | — | VE | VE | — | — |
| **Financeiro** | VE | VE | V* | — | VE | — | V* | — | — | — | — | — | — | — | — |
| **Cronograma** | VE | VE | V | V | V | — | V | V | VE | V | V | V | V | V | V |
| **Aprovacoes** | VE | VE | V | V | — | — | V | — | VE | — | V | — | — | — | — |
| **Contratos** | VE | VE | — | — | V | VE | — | — | — | — | — | — | — | V* | — |
| **Claquete** | VE | VE | V | V | — | — | V | — | VE | V | V | — | — | — | V |
| **Horas Extras** | VE | VE | V | V | VE | — | — | — | — | — | — | — | — | — | — |
| **Historico** | VE | VE | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **Portal** | VE | VE | — | — | — | — | VE | — | — | — | — | — | — | — | — |

**Notas:**
1. `[cfg]` = desativado por padrao, PE/Admin ativa via override
2. Coordenador (CO) acesso conservador, PE expande via override
3. CCO acessa jobs quando adicionado ao job_team
4. ED/Color/Motion/Finalizador veem Aprovacoes (recebem notas do cliente)
5. CAS ve Contratos readonly so para elenco (filtrado por tipo)
6. ATD ve Financeiro apenas sub-pagina Orcamento (readonly)
7. DP ve Financeiro apenas Custos e Dashboard parcial

---

## 6. Detalhamento: Sub-secoes Financeiras

| Sub-pagina | ADM/CEO | PE | DP | FIN | ATD | Outros |
|---|---|---|---|---|---|---|
| **Custos** | VE | VE | V | VE | — | — |
| **Dashboard** | VE | VE | V* | VE | V* | — |
| **Orcamento** | VE | VE | — | VE | V | — |
| **Verbas** | VE | VE | — | VE | — | — |
| **Calendario** | VE | VE | — | VE | — | — |

- DP no Dashboard: graficos ok, cards "Valor Fechado"/"Lucro"/"Margem" mascarados
- ATD no Dashboard: so card "Orcamento Aprovado"
- ATD no Orcamento: readonly

---

## 7. Detalhamento: Campos Ocultos na Aba Geral

| Campo | ADM/CEO | PE | DP | FIN | ATD | DC/1AD | Outros |
|---|---|---|---|---|---|---|---|
| Titulo, tipo, status, cliente | V | V | V | V | V | V | V |
| **Valor fechado** | V | V | — | V | — | — | — |
| **Budget estimado/aprovado** | V | V | — | V | — | — | — |
| **Lucro bruto / Margem** | V | V | — | V | — | — | — |
| Custo de producao | VE | VE | V | V | — | — | — |

---

## 8. Detalhamento: Campos Ocultos na Aba Equipe

| Dado | ADM/CEO | PE | DP | FIN | ATD | DC/1AD | Outros |
|---|---|---|---|---|---|---|---|
| Nome, papel | V | V | V | V | V | V | V |
| **Fee/Cache** | V | V | V | V | — | — | — |
| Botoes adicionar/editar/remover | E | E | — | — | — | — | — |
| Override de acesso | E | E | — | — | — | — | — |

---

## 9. Acesso ao Modulo Global (Sidebar)

| Item | ADM/CEO | PE | DP | FIN | JUR | ATD | CCO | DC | Freelancer |
|---|---|---|---|---|---|---|---|---|---|
| Jobs | V | V | V | V | — | V | V | V | V |
| Calendario | V | V | V | V | — | V | V | V | V |
| Dashboard CRM | V | V | — | — | — | — | V | — | — |
| Pipeline | V | V | — | — | — | — | V | — | — |
| Clientes/Agencias | V | V | — | — | — | V | V | — | — |
| Financeiro (todas) | V | V | — | V | — | — | — | — | — |
| Pessoas | V | V | V | V | V | V | V | V | V |
| Portal | V | V | — | — | — | V | — | — | — |
| Admin/Config | V | — | — | — | — | — | — | — | — |

---

## 10. Diagnostico: Estado Atual

### Gaps criticos
1. Nenhuma aba do job e ocultada por role
2. Sub-paginas financeiras (custos, dashboard, calendario) sem gate
3. `job_team.role` completamente IGNORADO no frontend
4. Nenhum mecanismo de override por job
5. Backend nao valida role para leitura de dados sensiveis
6. Arrays de roles hardcoded INCONSISTENTES em 8+ componentes

---

## 11. Arquitetura Tecnica

### 11.1 Arquivo Central: `frontend/src/lib/access-control-map.ts`
- Mapa: role -> (aba_id -> nivel_de_acesso)
- Abas nao listadas = 'hidden'

### 11.2 Hook: `useJobAccess(jobId)`
- Combina profiles.role + job_team.role + access_override
- Retorna: canViewTab(), canEditTab(), canViewField(), visibleTabs[]

### 11.3 Migration: Override por Job
```sql
ALTER TABLE job_team ADD COLUMN IF NOT EXISTS access_override JSONB;
```

### 11.4 Backend (Fase 4): mascarar dados sensiveis na API

---

## 12. Implementacao em Fases

### Fase 1 — Ocultamento de Abas (Frontend Only) ~1.5 dia
1. `access-control-map.ts` com mapa completo
2. Hook `useJobAccess(jobId)`
3. `JobDetailTabs` com filtragem
4. Redirect automatico

### Fase 2 — Guards + Sidebar + Campos ~1 dia
1. Guards sub-paginas financeiras
2. Sidebar filtrada por role
3. Campos financeiros ocultos na aba Geral
4. Fee oculto na aba Equipe

### Fase 3 — Override + job_team Role ~2 dias
1. Migration access_override
2. useJobAccess combinando profiles.role + job_team.role
3. UI override na aba Equipe

### Fase 4 — Backend Validation ~2 dias
1. Mascarar campos financeiros na API
2. Filtrar dados de custo/orcamento por role

---

## 13. Criterios de Aceite (14 itens)

CA-01 a CA-14: ver user stories acima.

---

## 14. Fora de Escopo

- Portal publico do cliente (token separado)
- Drive permissions (spec separada)
- Multi-tenant Colorbar (futuro)
- Permissoes para IAs (service role)
- Auditoria de acesso negado (futuro)
- UI para editar mapa (mudanca de codigo)
- Controle por status do job (futuro)
- Roles de RH (futuro)

---

## 15. Traducao Drive -> Sistema

| Pasta Drive | Aba/Area no Sistema |
|---|---|
| 01A_ROTEIRO_BRIEFING | Geral + PPM |
| 01B_DOCS_PRODUTORA | Geral |
| 02A_ORC_CARTA | Financeiro > Orcamento |
| 02B_DECUPADO | Financeiro > Orcamento |
| 02C_GASTOS_GERAIS | Financeiro > Custos |
| 02D_NFS_RECEB | Financeiro > Custos |
| 02E_COMPROVANTES | Financeiro > Verbas |
| 02F_NOTINHAS | Financeiro > Verbas |
| 02G_NF_FINAL | /financeiro/nf-request |
| 02H_FECHAMENTO | Financeiro > Dashboard |
| 03_MONSTRO | PPM |
| 04_CRONOGRAMA | Cronograma |
| 05A-D | Contratos (por tipo) |
| 06A_PRODUCAO_PRE | Diarias + Locacoes + OD |
| 06B_ARTE_PRE | Figurino/Arte |
| 06C_FIGURINO_PRE | Figurino/Arte |
| 06D_DIRECAO | Storyboard |
| 07_CLIENTES | Geral (logistica) |
| 08A-E | Pos-Producao (futuro) + Aprovacoes |
| 09_ATENDIMENTO | Portal |
| 10_VENDAS_PE | CRM / Pipeline |

---

## 16. Perguntas Abertas

**PO-01 [ALTA]:** CCO (comercial) = exclusivamente Telma? Ou pode haver outros?
**PO-02 [ALTA]:** Dir. Producao pode EDITAR custos ou apenas visualizar?
**PO-03 [MEDIA]:** Coord. Producao = sem acesso por padrao (como Drive)?
**PO-04 [MEDIA]:** CCO precisa ser adicionado ao job_team por PE ou ve todos os jobs?
**PO-05 [MEDIA]:** Juridico precisa ver fee/cache pra redigir contratos?
**PO-06 [BAIXA]:** Finalizador = team_role separado ou flag no editor?
**PO-07 [BAIXA]:** Atendimento pode criar sessoes no Portal?
