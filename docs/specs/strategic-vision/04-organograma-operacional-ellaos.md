# EllaOS — Organograma Operacional Definitivo

**Data:** 2026-03-07
**Fonte:** 59 respostas diretas do CEO + auditoria de gaps + analise Drive/codebase

---

## 1. Realidade da Produtora (Resumo das Respostas)

### Estrutura Atual
- **Equipe fixa:** 1 pessoa (CEO = PE = Financeiro = Tudo)
- **Freelas por job:** de 3 a 40+ (contratados pelos chefes de area)
- **Comunicacao:** 90% WhatsApp | 8% Meet/Zoom | 2% Email
- **Ferramentas:** Google Workspace full + Planilha GG + Planilha Master + n8n + WA automatizado (5 grupos por job)
- **Dor #1:** CEO centraliza tudo, informacao espalhada em WA/Drive/planilhas/cabeca

### Fluxo Real (Inicio ao Fim)
```
CAPTACAO (mix de canais)
  |-- Comercial recebe 1o contato
  |-- Job grande = reuniao + briefing | Job pequeno = orca direto
  |
ORCAMENTO (CEO + Comercial)
  |-- Avalia risco (grande/medio/baixo)
  |-- Versoes: varia muito (v1 a v13)
  |-- ~30-50% sao concorrencias (pode perder)
  |-- Pasta: 000_Orcamentos_em_Negociacao (ORC-XXXX)
  |
APROVACAO (email/WA/PO — mix)
  |-- Gatilho: cliente confirma por escrito
  |-- Pagamento: 30/60/90/120 dias POS-filmagem (fluxo caixa critico!)
  |-- CEO ou PE cria job no sistema
  |-- Codigo: Sequencial + prefixo (ex: ELH-2026-001)
  |-- Aprovacao Interna: documento formal obrigatorio
  |-- Info minima: tudo da proposta (cliente, titulo, verba, datas, equipe, entregaveis)
  |
PRE-PRODUCAO (varia por tipo de job)
  |-- CEO + PE escalam equipe juntos
  |-- Chefes de area (diretor cena, arte, figurino, producao) indicam suas equipes
  |-- PPM: sim, 95% dos jobs de filmagem
  |-- Logistica: PE + Dir. Producao + Produtor (atendimento repassa info ao cliente)
  |-- Docs: cada pessoa salva onde quer (DOR — precisa padronizar)
  |-- Checklist "pronto pra filmar": na cabeca do Dir. Producao (DOR)
  |
PRODUCAO (diarias)
  |-- Set: Diretor + Equipe + Atendimento + Cliente/Agencia
  |-- Atendimento = ponte entre cliente e equipe (filtra pra nao estressar equipe)
  |-- Aprovacao: cliente via atendimento, diretor da opiniao, cliente da palavra final
  |-- Logger (DIT): tira do SD, salva no PC, passa pro SSD
  |-- Bruto: 2 copias SSD — 1 pra pos, 1 pro PE subir na nuvem
  |-- Diario de set: NAO TEM (gostaria de ter)
  |-- Seguro: locadora cobre
  |
POS-PRODUCAO (fluxo detalhado)
  |-- 1. Montagem + Audio + Trilha
  |-- 2. Apresentacao Offline ao cliente
  |-- 3. Alteracoes Offline (cliente/agencia)
  |-- 4. Aprovacao Offline
  |-- 5. Color + Mix Audio + Sound FX + Motion (se tiver) + 3D (se tiver)
  |-- 6. Finalizacao
  |-- 7. Apresentacao Online ao cliente
  |-- 8. Alteracoes Online
  |-- 9. Aprovacao Online
  |-- 10. Organizacao copias/formatos/janelas
  |-- 11. Entrega
  |-- 12. Satisfacao do cliente
  |-- Quem faz: depende do job (interno/freela/estudio parceiro)
  |-- Versoes: Frame.io preferido (cliente marca timecode), WA pra rapidez
  |-- Rounds revisao: SEM LIMITE FORMAL
  |-- Material bruto: entrega depende do contrato, retencao minima 5 ANOS
  |
FINANCEIRO
  |-- CEO controla praticamente tudo (contabilidade so impostos)
  |-- Fluxo pagamento: Dir. Producao registra na GG > CEO valida > NF emitida > lanca banco > CEO aprova
  |-- TODO pagamento precisa aprovacao CEO
  |-- Verba a vista: Empresa > PE > Dir. Producao (NUNCA deposita tudo — risco falcatrua)
  |-- NF cliente: CEO emite pessoalmente
  |-- Custos fixos: sim, varios (aluguel, salarios, software, contabilidade)
  |-- Dor: TUDO JUNTO (fluxo caixa + NFs + falta visao consolidada)
  |
ENCERRAMENTO
  |-- Criterio: entrega aprovada + NFs fechadas + pagamento recebido
  |-- Retrospectiva: nao tem (gostaria)
  |-- Arquivos: ficam no Drive pra sempre
  |-- Satisfacao: tem mas esquece (CEO sozinho)
  |-- Follow-up: Comercial faz
```

---

## 2. Organograma de Modulos do EllaOS (v2 — Revisado)

Baseado no fluxo real + analise de riscos + sugestoes de profissionalizacao:

```
                        ┌─────────────────────────────┐
                        |      DASHBOARD CEO          |
                        |  (Visao 360 em tempo real)  |
                        └──────────┬──────────────────┘
                                   |
       ┌───────────────────────────┼───────────────────────────┐
       |                           |                           |
┌──────▼──────┐           ┌────────▼────────┐          ┌──────▼──────────┐
|   CRM /     |           |   JOBS          |          |  FINANCEIRO     |
| COMERCIAL   |           |  (Engine Core)  |          |  (Completo)     |
└──────┬──────┘           └────────┬────────┘          └──────┬──────────┘
       |                           |                          |
┌──────▼──────┐           ┌────────▼────────┐          ┌──────▼──────────┐
| ORCAMENTOS  |           |  ATENDIMENTO   |          | RECEITAS +      |
| (Pre-Job)   |──────────>|  (Coracao)     |          | FLUXO DE CAIXA  |
└─────────────┘           └────────┬────────┘          └─────────────────┘
                                   |
           ┌───────────────────────┼───────────────────────┐
           |                       |                       |
  ┌────────▼───────┐     ┌────────▼───────┐     ┌────────▼────────┐
  | PRE-PRODUCAO   |     |  PRODUCAO      |     | POS-PRODUCAO    |
  | (Prep + PPM +  |     |  (Set/Diaria + |     | (Pipeline 12    |
  |  Checklist)    |     |   Diario Set)  |     |  etapas)        |
  └────────────────┘     └────────────────┘     └─────────────────┘
           |                       |                       |
  ┌────────▼───────┐     ┌────────▼───────┐     ┌────────▼────────┐
  | EQUIPE / RH    |     | FORNECEDORES   |     | COMUNICACAO     |
  | (Rating +      |     | (Cadastro +    |     | (WA + IA +      |
  |  Compliance +  |     |  Portal +      |     |  Resumo Diario) |
  |  Blacklist)    |     |  Cotacao)      |     └─────────────────┘
  └────────────────┘     └────────────────┘
           |                       |
  ┌────────▼───────┐     ┌────────▼───────┐
  | JURIDICO /     |     | BUSINESS       |
  | CONTRATOS      |     | INTELLIGENCE   |
  | (DocuSeal +    |     | (Margem real + |
  |  OD + NDA)     |     |  Conversao +   |
  └────────────────┘     |  Analise)      |
                         └────────────────┘
```

### Modulos Novos (v2)

**M-13: Juridico / Contratos**
- Contrato padrao (OD/OS) gerado automaticamente ao escalar freela no job
- Termo de cessao de imagem/direitos autorais
- NDA quando necessario
- Assinatura digital via DocuSeal (ja integrado)
- Status: nao assinado > enviado > assinado (bloqueia pagamento se nao assinado)

**M-14: RH / Compliance**
- Onboarding padrao: freela novo preenche cadastro completo
- Rating 1-5 estrelas + tags: "preferencial" / "nao contratar" / "ameacou" / "atrasa NF"
- Historico: quantos jobs, valor total recebido, avaliacao media
- Alerta compliance: freela com X+ jobs consecutivos = risco vinculo CLT
- Custo real por pessoa por ano
- Campo "indicado por" (qual chefe de area trouxe)

**M-15: Business Intelligence**
- Margem real por job (receita - custos - overhead rateado - tempo CEO)
- Taxa de conversao orcamentos (por canal, por tipo, por cliente)
- Motivo de perda em concorrencias
- Top clientes por lucratividade (nao por faturamento)
- Top freelas por custo-beneficio (rating + custo)
- Alerta concentracao: se 1 cliente > 30% da receita
- Score de risco por job: automatico baseado em valor, prazo, historico cliente

**M-16: Pos-Venda / Relacionamento**
- Lembrete automatico 30/60/90 dias pos-entrega
- Pesquisa de satisfacao automatica (CEO esquece — sistema nao esquece)
- Aniversario do projeto (1 ano): "faz 1 ano que fizemos X!"
- Sugestao de upsell: "cliente Y postou campanha, quer making of?"
- NPS tracking por cliente

---

## 3. Detalhamento de Cada Modulo

### M-01: Dashboard CEO (Visao 360)
**Prioridade: MAXIMA** | **Status: Parcialmente existe**

O CEO faz tudo sozinho. Precisa de um dashboard que mostre em 1 tela:
- Jobs ativos com status (pre/filmagem/pos/encerramento)
- Fluxo de caixa: o que entra (recebiveis) vs o que sai (custos) nos proximos 30/60/90 dias
- Alertas: NFs pendentes, pagamentos atrasados, jobs sem equipe, aprovacoes pendentes
- KPIs: margem por job, taxa de conversao orcamentos, satisfacao cliente

**O que existe:** Dashboard basico com jobs. Falta: financeiro consolidado, alertas, KPIs.

### M-02: CRM / Comercial
**Prioridade: ALTA** | **Status: Funcional (Kanban)**

Captacao vem de varios canais, comercial recebe. CRM ja existe com pipeline Kanban.

**Falta:**
- Orcamentos pre-job (ORC-XXXX) — hoje precisa criar Job pra orcar (ERRADO)
- Conversao CRM > Job automatica
- Registro de concorrencias (ganhou/perdeu + motivo)
- Score de risco (grande/medio/baixo)

### M-03: Orcamentos (Pre-Job) — NOVO
**Prioridade: CRITICA** | **Status: NAO EXISTE**

CEO + Comercial montam orcamento ANTES de virar job. 30-50% sao concorrencias. Versoes vao ate v13.

**Funcionalidades:**
- Criar orcamento dentro do CRM (deal = orcamento)
- Versionamento (v1, v2... v13)
- Status: rascunho > enviado > em negociacao > aprovado > perdido
- Risco: alto / medio / baixo
- "Converter para Job" quando aprovado (pre-popula tudo)
- Pasta Drive automatica: `000_Orcamentos_em_Negociacao/ORC-XXXX`
- Carta Orcamento: template Google Doc timbrado

### M-04: Jobs (Engine Core)
**Prioridade: MAXIMA** | **Status: Robusto (75 colunas, 19 abas)**

Core ja esta solido. Ajustes necessarios:
- Codigo: mudar pra `{PREFIXO_TENANT}-{ANO}-{SEQ}` (ex: ELH-2026-001)
- Aprovacao Interna: documento formal obrigatorio (ja criado MVP)
- Info minima obrigatoria na criacao (validacao)
- Status mais granular: pre-producao > producao > pos-producao > entrega > encerrado
- Criterio encerramento: entrega + NFs fechadas + pagamento recebido (3 checks)

### M-05: Atendimento (Coracao)
**Prioridade: MAXIMA** | **Status: MVP criado**

1 pessoa fixa, meta de gerenciar varios jobs com o sistema. Atendimento = ponte cliente-equipe, filtra informacao, gerencia escopo, acompanha set, participa de aprovacoes.

**Funcionalidades (alem do MVP):**
- Dashboard pessoal: meus jobs, proximas acoes, aprovacoes pendentes
- Aprovacao Interna: documento formal por job
- Registro de comunicacao: log de decisoes (nao chat, mas registro de "cliente pediu X em DD/MM")
- Controle de escopo: flag "extra" com alerta ao CEO
- Logistica cliente: passagens, hotel, transfer (com status)
- Cronograma do cliente: o que o cliente precisa saber/fazer e quando
- Satisfacao pos-entrega: lembrete automatico

### M-06: Pre-Producao
**Prioridade: ALTA** | **Status: Parcial (aba no job)**

Etapas variam por tipo de job. Hoje cada pessoa salva docs onde quer, checklist na cabeca.

**Funcionalidades:**
- Checklist configuravel por tipo de job (filmagem, foto, animacao)
- Escalacao de equipe: CEO + PE montam, chefes de area indicam abaixo
- PPM: registro de PPM (data, participantes, decisoes)
- Documentos centralizados por job (link Drive)
- Status: "pronto pra filmar" (checklist 100%)
- Logistica: passagens, hotel, alimentacao, transfer (vinculado ao job)

### M-07: Producao (Set/Diaria)
**Prioridade: MEDIA** | **Status: Parcial (diario producao, claquete)**

Logger faz ingest, 2 copias SSD, atendimento filtra aprovacoes no set.

**Funcionalidades (novas):**
- Boletim de producao / diario de set (CEO quer!)
- Tracking material bruto: cartoes > ingest > SSD 1 (pos) + SSD 2 (backup nuvem)
- Upload fotos do set (ja existe parcial)
- Registro do que foi aprovado no set

### M-08: Pos-Producao (Pipeline 12 Etapas)
**Prioridade: CRITICA** | **Status: Quase nada**

Fluxo detalhado com 12 etapas, offline/online separados, sem limite de rounds.

**Funcionalidades:**
- Pipeline de 12 etapas (conforme resposta do CEO):
  1. Montagem + Audio + Trilha
  2. Apresentacao Offline
  3. Alteracoes Offline
  4. Aprovacao Offline
  5. Color / Mix Audio / SFX / Motion / 3D
  6. Finalizacao
  7. Apresentacao Online
  8. Alteracoes Online
  9. Aprovacao Online
  10. Copias/Formatos/Janelas
  11. Entrega
  12. Satisfacao
- Versionamento: v1, v2, v3... por corte
- Integracao Frame.io (review com timecode)
- Aprovacao por etapa (offline vs online)
- Material bruto: lifecycle (bruto > ativo > arquivo > glacier), retencao 5 anos
- Quem faz cada etapa: atribuicao flexivel (interno/freela/estudio)

### M-09: Financeiro Completo
**Prioridade: MAXIMA** | **Status: Bom (custos), falta receitas e controles**

CEO faz tudo sozinho. Pagamento 30/60/90/120 dias = fluxo de caixa critico.

**Funcionalidades (alem do existente):**
- Recebiveis (job_receivables): parcelas do cliente, datas, status — JA MIGRADO
- Fluxo de caixa projetado: cruzamento recebiveis vs custos nos proximos 30/60/90 dias
- Aprovacao de pagamento: TODO pagamento precisa OK do CEO (workflow)
- Verba a vista: controle especial (deposito parcial + comprovacao de gastos)
  - NUNCA depositar 100% — campo "% liberado" + "comprovantes"
  - Alerta se Dir. Producao pedir mais que X% antes de comprovar
- Custos fixos (overhead): aluguel, salarios, ferramentas — fora de jobs
- NF cliente: emissao pelo CEO com lembrete automatico
- Conciliacao: planilha GG → sistema (import)
- Dashboard: margem real por job (receita - custos - overhead rateado)

### M-10: Equipe & Talentos
**Prioridade: ALTA** | **Status: Cadastro existe (People)**

40+ freelas por job, contratados pelos chefes de area. Precisa de rating.

**Funcionalidades (novas):**
- Rating/avaliacao por pessoa: 1-5 estrelas + flag "nao contratar"/"preferencial"
- Historico de jobs por pessoa
- Chefes de area: campo "indicado por" no job_team
- Disponibilidade: integracao com calendario (chefes controlam)
- NF/RPA: flag no cadastro (PJ = NF, PF = RPA)
- Banco de talentos com busca por funcao + rating

### M-11: Fornecedores
**Prioridade: MEDIA** | **Status: Cadastro basico existe**

Tudo terceirizado, cotacao depende do valor, cadastro por job com formulario.

**Funcionalidades:**
- Portal do Fornecedor: login, dados pessoais/bancarios, documentos (substituir Forms)
- Cotacao comparativa: 3 orcamentos quando valor alto
- Vinculacao por job: quem forneceu o que em cada job
- Contrato/OD digital (DocuSeal)
- Rating de fornecedor (similar a equipe)

### M-12: Comunicacao & IA (WhatsApp-first)
**Prioridade: ALTA** | **Status: Z-API + n8n parcial**

90% WhatsApp. Clientes/equipe NAO adotam outras ferramentas. EllaOS deve abracar WA.

**Funcionalidades:**
- 5 grupos WA automaticos por job (n8n ja tem!) — manter e melhorar
- IA que monitora grupos e extrai: decisoes, alteracoes de escopo, aprovacoes
- Notificacoes pro-ativas: "Job X precisa de aprovacao", "NF de Y esta pendente"
- Resumo diario: IA compila o que aconteceu em cada job (envia pro CEO e Atendimento)
- Portal do cliente via WA: cliente manda ajustes, IA cria ticket no sistema
- "Formalizar" decisao: comando que transforma conversa WA em registro no sistema
- Retrospectiva automatica: ao encerrar job, IA gera resumo de tudo que aconteceu

---

## 4. Conexoes entre Modulos (v2)

```
CRM ── (lead qualificado) ──> ORCAMENTO ── (aprovado) ──> JOB
          |                        |                        |
          |                   [JURIDICO]               [ATENDIMENTO]
          |                  Gera contrato            Ponte cliente-equipe
          |                   via DocuSeal                   |
          |                        |          ┌─────────────┼─────────────┐
          |                        |          |             |             |
          |                   [FINANCEIRO]  [PRE-PROD]  [PRODUCAO]  [POS-PROD]
          |                   Fluxo caixa   Checklist   Diario set  12 etapas
          |                   Verba vista   PPM         Logger      Versoes
          |                   Recebiveis    Escalacao   Aprovacoes  Frame.io
          |                        |          |             |             |
          |                   [EQUIPE/RH]  Rating + Compliance + Blacklist
          |                        |
          |                   [FORNECEDORES] Portal + Cotacao + Cadastro
          |                        |
          |                   [COMUNICACAO] WA monitoring + IA resumo
          |                        |
          |                   [BI] Margem real + Conversao + Risco
          |                        |
          └── [POS-VENDA] ────────┘
              Satisfacao, follow-up, upsell
                       |
              ┌────────▼────────┐
              | DASHBOARD CEO   |
              | (Agrega TUDO)   |
              └─────────────────┘
```

---

## 5. Prioridade de Implementacao (Roadmap v2 — Revisado com Analise de Risco)

### ONDA 0: Sobrevivencia (proteger o negocio ANTES de crescer)
| # | Item | Justificativa | Esforco |
|---|------|---------------|---------|
| 0.1 | **Fluxo de caixa projetado** | Cliente paga 30/60/90/120 dias pos-filmagem. Se 2 atrasam, quebra. Nenhuma tela mostra isso hoje | 3-4 dias |
| 0.2 | **Contrato padrao freela (DocuSeal)** | Zero contratos = risco trabalhista de R$50-200k. Freela ja ameacou CEO. DocuSeal ja integrado | 2-3 dias |
| 0.3 | **Dashboard CEO v2 (visao 360)** | CEO faz tudo sozinho e opera no escuro. Precisa ver jobs + caixa + alertas em 1 tela | 4-5 dias |

### ONDA 1: Fundacao Operacional (desbloqueia uso diario)
| # | Item | Justificativa | Esforco |
|---|------|---------------|---------|
| 1.1 | Orcamentos Pre-Job + versionamento | 30-50% nao viram job; hoje precisa criar Job pra orcar (errado) | 4-5 dias |
| 1.2 | Pos-Producao Pipeline (12 etapas) | Maior gap operacional. Fluxo detalhado pelo CEO: offline/online separados | 5-7 dias |
| 1.3 | Rating equipe + blacklist + "nao contratar" | 40+ freelas por job, ja foi ameacado, precisa saber quem chamar | 2-3 dias |
| 1.4 | Verba a vista (controle anti-falcatrua) | CEO explicitou: Dir. Producao fabrica notas. Deposito parcial + comprovacao | 3-4 dias |

### ONDA 2: Escala do Atendimento (1 pessoa = 5+ jobs)
| # | Item | Justificativa | Esforco |
|---|------|---------------|---------|
| 2.1 | Atendimento v2 (escopo + logistica + comunicacao) | Dor: 50 msgs pra entender contexto, info espalhada, filtra pra equipe | 5-7 dias |
| 2.2 | Pre-Producao (checklist configuravel + PPM + docs) | Checklist na cabeca do Dir. Producao = risco. Docs salvos sem padrao | 3-4 dias |
| 2.3 | Diario de set + boletim producao | CEO quer. Nao existe. Registro formal do que aconteceu na diaria | 2-3 dias |
| 2.4 | Escopo: flag "extra" + alerta CEO | Atendimento flagra, CEO decide. Hoje passa batido e vira servico gratis | 1-2 dias |
| 2.5 | CRM > Job conversao automatica | Eliminar trabalho duplo (copiar dados do orcamento pro job) | 2-3 dias |

### ONDA 3: Inteligencia + Diferenciacao (o que ninguem mais tem)
| # | Item | Justificativa | Esforco |
|---|------|---------------|---------|
| 3.1 | IA WhatsApp: resumo diario + extrai decisoes | Revolucionario. 90% da comunicacao e WA. IA le e organiza | 5-7 dias |
| 3.2 | BI: margem real + conversao + analise perda | Perde 30-50% de concorrencias sem saber por que. Nao sabe margem real | 4-5 dias |
| 3.3 | Portal Fornecedor (substituir Forms) | Profissionalizar cadastro. Fornecedor entra, preenche, ja tem dados | 3-4 dias |
| 3.4 | Alerta compliance (risco CLT freela) | Freela recorrente sem contrato = bomba juridica. Sistema avisa | 1-2 dias |
| 3.5 | Pos-venda automatica (satisfacao + upsell) | CEO esquece de fazer. Sistema nao esquece. Gera recompra | 2-3 dias |

### ONDA 4: SaaS + Escala (vender pra outros)
| # | Item | Justificativa | Esforco |
|---|------|---------------|---------|
| 4.1 | Codigo job multi-tenant: {TENANT}-{ANO}-{SEQ} | Preparar pra Colorbar e outros | 1-2 dias |
| 4.2 | Colorbar onboarding (2o tenant) | Validar multi-tenant com caso real | 2-3 dias |
| 4.3 | Custos fixos + overhead rateado | Margem REAL = receita - custos - overhead. Hoje overhead e invisivel | 3-4 dias |
| 4.4 | Conciliacao bancaria | Import extratos, cruzar com pagamentos | 3-4 dias |
| 4.5 | Onboarding self-service | Produtora nova cria conta sozinha | 3-4 dias |

---

## 6. Analise de Mercado & Viabilidade SaaS

### Competidores Globais
| Sistema | Origem | Foco | Preco | Falta |
|---------|--------|------|-------|-------|
| Shotgun (Autodesk) | EUA | VFX/Pipeline | US$30+/user | Financeiro, WA, portugues |
| ftrack | Suecia | Pipeline pos | US$25+/user | Financeiro, pre-prod, WA |
| StudioBinder | EUA | Pre-producao | US$30+/user | Pos, financeiro, WA |
| Wrapbook | EUA | Payroll/contratos | US$- | Producao, WA, portugues |
| Monday/Asana | EUA | Generico | R$80-300/user | Nao entende producao |
| Yampi/Omie | Brasil | ERP generico | R$100-500 | Nao entende job/producao |

**Nenhum e brasileiro, integra WhatsApp, ou cobre ciclo completo. EllaOS e unico.**

### Modelo de Receita
| Plano | Preco | Publico |
|-------|-------|---------|
| Starter | R$297/mes | Produtora solo (1-3 usuarios) |
| Pro | R$697/mes | Produtora media (5-15 usuarios) |
| Enterprise | R$1.497/mes | Produtora grande (15+ usuarios) |

### Projecao
| Cenario | Clientes | MRR | ARR |
|---------|----------|-----|-----|
| Conservador (1% de 12k) | 120 | R$70k | R$840k |
| Moderado (3%) | 360 | R$210k | R$2.5M |
| Otimista (5%) | 600 | R$350k | R$4.2M |

### Diferenciais Competitivos (Moat)
1. **WhatsApp-first**: unico sistema que abraca WA em vez de lutar contra
2. **Feito por produtor**: features que so quem vive o caos pensaria (verba anti-falcatrua, blacklist freela)
3. **Ciclo completo**: CRM > orcamento > job > pre > set > pos > financeiro > pos-venda
4. **Brasileiro nativo**: portugues, NF, ANCINE, impostos BR, cultura WA
5. **IA contextual**: nao e chatbot generico, e IA que entende producao audiovisual

---

## 7. Principios de Design (v2 — 12 principios)

Baseados nas 59 respostas do CEO + analise de risco:

1. **WhatsApp e rei** — NAO lutar contra. Integrar, monitorar, extrair valor.
2. **CEO faz tudo** — Sistema deve AUTOMATIZAR, nao adicionar mais trabalho.
3. **Informacao num lugar so** — Fim do "ta no WA", "ta na planilha", "ta na cabeca".
4. **Confianca zero na verba** — Controle parcial de depositos, comprovacao obrigatoria.
5. **Flexibilidade por tipo de job** — Nao forcar fluxo rigido (filme != foto != animacao).
6. **Concorrencia e real** — 30-50% dos orcamentos podem nao virar job. Sistema deve suportar.
7. **Atendimento e a ponte** — Tudo que envolve cliente passa pelo atendimento.
8. **Rating de pessoas** — Saber quem chamar e quem NUNCA mais chamar.
9. **Sobrevivencia primeiro** — Fluxo de caixa e contratos antes de features novas.
10. **Sistema nao esquece** — Satisfacao, follow-up, compliance: automatizar o que CEO nao tem tempo.
11. **Dados geram decisao** — Margem real, taxa conversao, motivo perda: operar com dados, nao intuicao.
12. **Protecao juridica embutida** — Contrato automatico em cada escalacao. Sem contrato = sem pagamento.

---

## 8. Respostas Compiladas (Referencia Completa)

### Bloco 1: Comercial & Captacao
| # | Pergunta | Resposta |
|---|----------|----------|
| 1.1 | Como chega oportunidade | Mix de tudo (agencia, indicacao, prospecao) |
| 1.2 | Quem recebe 1o contato | Comercial |
| 1.3 | Processo pre-orcamento | Depende do tamanho: grande = reuniao, pequeno = orca direto |
| 1.4 | Quem monta orcamento | CEO + Comercial (CEO sabe custo diaria, Comercial sabe quanto cliente quer pagar, avaliam risco) |
| 1.5 | Versoes de orcamento | Varia muito (v1 a v13) |
| 1.6 | Como cliente aprova | Mix: WhatsApp + email + PO |
| 1.7 | Negociacao de escopo | CEO + Comercial negociam juntos |
| 1.8 | Concorrencias | Sim, ~30-50% sao concorrencias |

### Bloco 2: Aprovacao & Abertura do Job
| # | Pergunta | Resposta |
|---|----------|----------|
| 2.1 | O que define job aprovado | Email/WA aprovando (cliente confirma por escrito) |
| 2.2 | Quem cria job | CEO e/ou Produtor Executivo |
| 2.3 | Aprovacao Interna | Sim, documento formal (escopo, equipe, datas, verba) |
| 2.4 | Info minima obrigatoria | Tudo da proposta (cliente, titulo, verba, datas, equipe, entregaveis) |
| 2.5 | Sinal/adiantamento | Varia — geralmente cliente paga em 30/60/90/120 dias POS-filmagem. Fluxo de caixa critico |
| 2.6 | Codigo do job | Sequencial + prefixo (tipo ELH-2026-001) pra suportar multi-tenant |

### Bloco 3: Pre-Producao
| # | Pergunta | Resposta |
|---|----------|----------|
| 3.1 | Etapas pre-producao | Varia por tipo de job |
| 3.2 | Escalacao equipe | CEO + PE juntos |
| 3.3 | PPM | Sim, 95% dos jobs de filmagem |
| 3.4 | Logistica | PE + Dir. Producao + Produtor; Atendimento repassa ao cliente |
| 3.5 | Docs pre-producao | Cada pessoa salva onde quer (DOR) |
| 3.6 | Checklist pronto pra filmar | Na cabeca do Dir. Producao (DOR) |

### Bloco 4: Producao (Diarias)
| # | Pergunta | Resposta |
|---|----------|----------|
| 4.1 | Quem no set | Diretor + Equipe + Atendimento + Cliente (99% quando cliente/agencia vai) |
| 4.2 | Diario de set | Nao tem, gostaria de ter |
| 4.3 | Aprovacao no set | Atendimento filtra, cliente da palavra final atraves do atendimento |
| 4.4 | Material bruto | Logger: SD > PC > SSD. 2 copias: 1 pos, 1 PE subir nuvem |
| 4.5 | Controle midia | Logger (chamam de Logger, nao DIT) |
| 4.6 | Seguro | Locadora cobre |

### Bloco 5: Pos-Producao
| # | Pergunta | Resposta |
|---|----------|----------|
| 5.1 | Etapas pos | Montagem+Audio+Trilha > Offline > Alteracoes > Aprovacao > Color/Mix/Motion/3D > Finalizacao > Online > Alteracoes > Aprovacao > Copias > Entrega > Satisfacao |
| 5.2 | Quem faz | Depende do job (interno/freela/estudio) |
| 5.3 | Fluxo versoes | Frame.io preferido (timecode), WA pra rapidez |
| 5.4 | Rounds revisao | Sem limite formal |
| 5.5 | Como ajustes chegam | WhatsApp (maioria), Frame.io quando orientado |
| 5.6 | Entrega final | Aprovacao WA + upload |
| 5.7 | Material bruto ao cliente | Depende do contrato |
| 5.8 | Retencao bruto | Minimo 5 anos |

### Bloco 6: Atendimento
| # | Pergunta | Resposta |
|---|----------|----------|
| 6.1 | Equipe atendimento | 1 pessoa fixa |
| 6.2 | Jobs simultaneos | 1-2 sem sistema; meta: muitos com EllaOS + assistentes se precisar |
| 6.3 | Tarefas diarias | Tudo: comunicacao + escopo + logistica + aprovacoes |
| 6.4 | Controle escopo | Atendimento flagra extra, CEO decide |
| 6.5 | Vai pro set | Sim, 99% quando cliente/agencia vai |
| 6.6 | Maior dor | Info espalhada + alteracoes constantes + 50 msgs pra entender contexto + filtrar pra equipe nao estressar |

### Bloco 7: Financeiro
| # | Pergunta | Resposta |
|---|----------|----------|
| 7.1 | Quem cuida | CEO (contabilidade so impostos) |
| 7.2 | Fluxo pagamento | Dir.Producao registra GG > CEO valida > NF emitida > lanca banco > CEO aprova |
| 7.3 | Faixa aprovacao | TUDO precisa aprovacao CEO |
| 7.4 | Faturamento cliente | Negociado caso a caso (30/60/90/120 dias pos-filmagem) |
| 7.5 | NF cliente | CEO emite pessoalmente |
| 7.6 | Custos fixos | Sim, varios (aluguel, salarios, software, contabilidade) |
| 7.7 | Verba a vista | PE (= CEO) > Dir. Producao. NUNCA deposita tudo — risco falcatrua. Parcial + comprovacao |
| 7.8 | Maior dor financeiro | Tudo junto: fluxo caixa + NFs + falta visao consolidada |

### Bloco 8: Equipe & RH
| # | Pergunta | Resposta |
|---|----------|----------|
| 8.1 | Equipe fixa | So CEO + freelas |
| 8.2 | Freelas por job | Depende — ja chegou a 40+ |
| 8.3 | Contratacao freela | Chefes de area (diretor cena, arte, figurino, producao) indicam; equipe abaixo e deles |
| 8.4 | NF freela | Maioria NF, alguns RPA |
| 8.5 | Disponibilidade | Chefes de area controlam seus freelas |
| 8.6 | Banco talentos | Tem banco de dados, falta rating/avaliacao (uns ameacaram, outros sao tops) |

### Bloco 9: Fornecedores
| # | Pergunta | Resposta |
|---|----------|----------|
| 9.1 | Tipos | Praticamente tudo terceirizado |
| 9.2 | Cotacao | Depende do valor (alto = 3 cotacoes, baixo = preferencial) |
| 9.3 | Cadastro | Formulario por job (dados pessoais, valor, bancario se nao tem cadastro) |
| 9.4 | Contrato | Nao tem contrato formal |

### Bloco 10: Entrega & Encerramento
| # | Pergunta | Resposta |
|---|----------|----------|
| 10.1 | Criterio encerramento | Entrega + NFs fechadas + pagamento recebido (3 checks) |
| 10.2 | Retrospectiva | Gostaria de ter |
| 10.3 | Arquivos | Ficam no Drive pra sempre |
| 10.4 | Retencao bruto | Minimo 5 anos |
| 10.5 | Satisfacao | Tem mas esquece (CEO sozinho) |
| 10.6 | Follow-up | Comercial faz |

### Bloco 11: Comunicacao & Ferramentas
| # | Pergunta | Resposta |
|---|----------|----------|
| 11.1 | Ferramentas comunicacao | 90% WA, 8% Meet/Zoom/Teams, 2% Email (licitacao) |
| 11.2 | Grupo WA por job | 5 grupos automaticos via n8n |
| 11.3 | Google Workspace | Sim, tudo Google |
| 11.4 | Master sheet | Planilha GG por job + "CRIACAO PASTA E CONTROLE DE JOB" (master que consolida) |
| 11.5 | Eliminar ferramentas | Planilhas GG + Master + Forms. NAO WhatsApp — WA e essencial, quer mostrar profissionalismo NELE |

### Bloco 12: Visao & Prioridades
| # | Pergunta | Resposta |
|---|----------|----------|
| 12.1 | #1 prioridade | Organizacao da info (fim do caos) |
| 12.2 | Area mais sofre | Gestao geral (CEO faz tudo) |
| 12.3 | Gambiarras | Varias juntas (planilha GG + Apps Script + WA como sistema + n8n) |
| 12.4 | Diferencial unico | TUDO: IA que entende producao + WA como interface + Visao CEO real-time + Tudo integrado |
| 12.5 | Crescimento equipe | Depende dos projetos |
| 12.6 | Colorbar | Daqui 1-2 meses |
| 12.7 | SaaS | Potencialmente |

---

*Documento gerado a partir de 59 respostas diretas do CEO em 2026-03-07. Base para todas as decisoes de produto do EllaOS.*

---

## 9. Visao de Futuro — Roadmap Estrategico (Horizontes 1-3)

### Horizonte 1: Features que mudam o jogo (6-12 meses)

#### H1-01: Antecipacao de Recebiveis (Fintech Embutida)
Cliente paga em 30/60/90/120 dias. Produtora precisa pagar equipe ANTES.
EllaOS tem todos os dados: valor, parcelas, historico do cliente, NF emitida.
- Botao "Antecipar recebivel" → calcula taxa → fintech parceira deposita em 24h
- EllaOS fica com % da taxa como receita
- **Potencial:** R$500k-2M ARR (maior que assinatura SaaS)

#### H1-02: Empresa de IA — Hierarquia Completa por Departamento
**VISAO DO CEO:** Nao e 1 chatbot generico. E uma EMPRESA de IA completa, com hierarquia real por departamento. Cada departamento tem Diretor IA + Analistas IA + Estagiarios IA, como uma equipe humana real.

##### Departamento FINANCEIRO (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor Financeiro IA** | Visao macro: fluxo de caixa, alertas de risco, relatorio mensal, decisoes estrategicas. Reporta ao CEO |
| **Analista de Contas a Pagar** | Monitora NFs pendentes, cobra fornecedores, valida se valores batem com orcamento |
| **Analista de Contas a Receber** | Monitora parcelas do cliente, alerta atrasos, sugere cobranca, calcula juros |
| **Analista de Orcamentos** | Compara orcamento vs realizado, alerta estouros, sugere cortes |
| **Estagiario de Conciliacao** | Cruza extratos bancarios com pagamentos registrados, flagra divergencias |

##### Departamento ATENDIMENTO (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor de Atendimento IA** | Visao de todos os jobs do atendimento, prioriza acoes, alerta riscos de escopo |
| **Analista de Comunicacao** | Le grupos WA, extrai decisoes, resume contexto ("cliente pediu X no dia Y") |
| **Analista de Escopo** | Detecta extras em conversas WA ("isso nao estava no briefing"), flagra pro CEO |
| **Analista de Satisfacao** | Monitora tom das mensagens do cliente, alerta se sentimento ficou negativo |
| **Estagiario de Logistica** | Rastreia passagens, hoteis, transfers. Confirma reservas, alerta pendencias |

##### Departamento PRODUCAO (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor de Producao IA** | Visao de todos os jobs em pre/producao, conflitos de agenda, recursos compartilhados |
| **Analista de Equipe** | Sugere freelas disponiveis por funcao + rating, alerta conflitos de agenda |
| **Analista de Checklist** | Verifica se pre-producao esta completa antes da diaria, cobra pendencias |
| **Estagiario de Documentos** | Organiza docs no Drive, garante que PPM foi registrado, OD foi assinado |

##### Departamento POS-PRODUCAO (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor de Pos IA** | Visao do pipeline de 12 etapas de todos os jobs, identifica gargalos |
| **Analista de Versoes** | Rastreia v1/v2/v3, compila feedback do cliente, detecta contradicoes |
| **Analista de Prazos** | Monitora deadlines por etapa, alerta atrasos, sugere realocacao |
| **Estagiario de Entrega** | Prepara copias/formatos/janelas, verifica specs, confirma upload |

##### Departamento COMERCIAL (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor Comercial IA** | Taxa de conversao, pipeline, quais clientes reativar, previsao de receita |
| **Analista de Propostas** | Auxilia montagem de orcamento, busca precos historicos, calcula risco |
| **Analista de Pos-Venda** | Follow-up automatico 30/60/90 dias, NPS, sugestao de upsell |
| **Estagiario de Pesquisa** | Monitora licitacoes publicas, editais, oportunidades de mercado |

##### Departamento RH (IA)
| Cargo IA | O que faz |
|----------|-----------|
| **Diretor de RH IA** | Alerta compliance CLT, visao de custos por pessoa, rotatividade |
| **Analista de Contratos** | Gera contratos automaticos, cobra assinaturas pendentes |
| **Estagiario de Onboarding** | Guia freela novo pelo cadastro, valida documentos, confirma dados bancarios |

##### Como funciona tecnicamente
- Cada "cargo IA" e um agente com prompt especializado + acesso a dados relevantes
- Diretores: rodam 1x/dia (resumo diario, analise macro)
- Analistas: rodam por evento (NF recebida, msg no WA, deadline proximo)
- Estagiarios: rodam por trigger (novo cadastro, upload documento, etc.)
- Todos reportam via WhatsApp e/ou notificacao no sistema
- CEO ve "organograma IA" no dashboard: cada agente com status verde/amarelo/vermelho
- **Custo estimado:** Groq free tier + Llama 3.3 70B cobre 90% dos agentes

##### A visao revolucionaria
Uma produtora de 1 pessoa (CEO) com o EllaOS tem, na pratica, uma equipe de ~25 "funcionarios IA" trabalhando 24/7. Isso permite:
- CEO solo gerenciar 10+ jobs simultaneamente
- Atendimento gerenciar 5+ clientes com qualidade
- Zero informacao perdida (IA registra tudo)
- Decisoes baseadas em dados, nao intuicao
- **Nenhum sistema no mundo oferece isso para producao audiovisual**

#### H1-03: App Mobile para Set
- Logger registra cartoes/backups com foto
- Diario de set: fotos, notas, ocorrencias
- Atendimento registra decisoes do cliente em tempo real
- Funciona offline (set rural) + sync quando volta

#### H1-04: Portal do Cliente com Status em Tempo Real
- Link magico (sem senha), ve status "etapa 5/12"
- Barra de progresso visual
- Historico de versoes + aprovacoes
- Profissionalismo que impressiona o cliente

### Horizonte 2: Network Effects (12-24 meses)

#### H2-01: Marketplace de Talentos
- Produtoras buscam freelas com rating de OUTRAS produtoras
- Freela tem perfil publico com portfolio + avaliacoes
- Network effect: mais produtoras = mais dados = mais valor
- Receita: % sobre contratacao (R$300k-1M ARR)

#### H2-02: Seguro de Producao Inteligente
- EllaOS tem dados pra precificar risco melhor que qualquer seguradora
- Cotacao instantanea dentro do sistema
- Receita: comissao por apolice (R$200k-800k ARR)

#### H2-03: Banco de Locacoes + Fornecedores Compartilhado
- Avaliacao por produtoras (tipo Google Maps reviews)
- Busca: "estudio ciclorama SP" → ranking custo-beneficio
- Receita: freemium (R$100k-400k ARR)

### Horizonte 3: Plataforma (24+ meses)

#### H3-01: EllaOS Academy
- Micro-cursos: "Como precificar", "Como controlar verba a vista"
- Templates prontos: Carta Orcamento, Contrato, OD, Briefing
- Comunidade de produtores

#### H3-02: Integracao Governo (ANCINE, Rouanet, ISS)
- Relatorios formatados pra ANCINE
- Calculo ISS por municipio
- Tracking Lei Rouanet / Lei do Audiovisual

#### H3-03: Carbon Footprint (Pegada de Carbono)
- Calculo automatico: km viajados, energia, materiais
- Certificado "producao sustentavel"
- Diferencial em licitacoes internacionais

#### H3-04: Co-Producao entre Produtoras
- Convida outro tenant pra co-produzir
- Divide custos, equipe, entregaveis
- Cada produtora ve so sua parte financeira

#### H3-05: API Aberta + Ecossistema
- API publica pra integradores
- Integracoes: Frame.io, Drive, Vimeo, YouTube, Instagram
- Parceiros constroem em cima do EllaOS

### Mapa Completo de Receita (Projecao)
```
HOJE (Onda 0-2)
  └── Assinatura SaaS ────────────────────── R$840k - R$4.2M ARR

HORIZONTE 1 (6-12 meses)
  ├── Antecipacao recebiveis (% taxa) ────── R$500k - R$2M ARR
  ├── IA Premium (agentes avancados) ─────── R$200k - R$800k ARR
  └── App mobile (incluso Pro/Enterprise)

HORIZONTE 2 (12-24 meses)
  ├── Marketplace talentos (% contratacao) ─ R$300k - R$1M ARR
  ├── Seguro producao (comissao) ─────────── R$200k - R$800k ARR
  └── Banco locacoes (freemium) ──────────── R$100k - R$400k ARR

HORIZONTE 3 (24+ meses)
  ├── Academy (cursos + templates) ────────── R$200k - R$600k ARR
  ├── ANCINE/Rouanet compliance ──────────── R$300k - R$1M ARR
  └── API/Plataforma (partnership) ────────── R$100k - R$500k ARR

POTENCIAL TOTAL: R$2.7M - R$11.3M+ ARR
```

---

*Visao de futuro registrada em 2026-03-07. A hierarquia completa de IA por departamento e a visao central do CEO para o EllaOS — nao apenas um SaaS, mas uma empresa de IA que funciona como equipe virtual completa.*
