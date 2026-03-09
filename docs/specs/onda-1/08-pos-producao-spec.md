# Onda 1.2 — Pos-Producao: Pipeline de Entregaveis, Versoes e Aprovacoes

**Data:** 2026-03-09
**Status:** RASCUNHO
**Autor:** PM (Claude Opus)
**Esforco estimado:** 3 sprints (4.5 dias uteis)
**Referencia tecnica:** docs/specs/onda-1/09-pos-producao-referencia-publicidade.md

---

## 1. Objetivo

Dar ao coordenador e ao PE visibilidade em tempo real do pipeline de pos-producao por entregavel — em quais etapas estao, quem esta responsavel, qual versao de corte foi aprovada e qual o prazo de entrega — sem precisar sair do ELLAHOS para consultar planilhas ou WhatsApp.

O modulo resolve o problema pratico de quem gerencia 5 jobs simultaneos com 3-4 entregaveis cada em etapas diferentes: uma unica tela mostra o estado completo de toda a pos-producao da produtora.

---

## 2. Contexto e Estado Atual

### O que JA existe (nao retrabalhado)

| Area | Estado |
|------|--------|
| Tabela `job_deliverables` (id, job_id, parent_id, description, format, resolution, duration_seconds, status, version, delivery_date, link, notes, display_order) | COMPLETO |
| Campo `pos_sub_status` na tabela `jobs` (edicao/cor/vfx/finalizacao/audio/revisao) | COMPLETO — resumo do job, nao por entregavel |
| Campos `post_start_date`, `post_deadline`, `final_delivery_url` em `jobs` | COMPLETO |
| Tab Entregaveis (`TabEntregaveis.tsx`) com lista, hierarquia pai/filho, badges de urgencia | COMPLETO |
| ENUM `deliverable_status` (pendente, em_producao, aguardando_aprovacao, aprovado, entregue) | COMPLETO |
| Roles de pos-producao no ENUM `team_role` (editor, colorista, finalizador, cco) | COMPLETO |
| Estrutura Drive `08_POS_PRODUCAO/` com subpastas Montagem, Color, Finalizacao, Copias | COMPLETO |

### Gaps confirmados (escopo desta onda)

| ID | Gap | Severidade |
|----|-----|------------|
| GAP-POS-01 | Nao ha rastreamento de etapa por entregavel (pos_stage) | CRITICO |
| GAP-POS-02 | Nao ha controle de versoes de corte (V1, V2, V3) com status de aprovacao | CRITICO |
| GAP-POS-03 | Nao ha responsavel por entregavel na pos-producao | ALTO |
| GAP-POS-04 | Nao ha briefing tecnico por entregavel (codec, resolucao, fps, LUT) | MEDIO |
| GAP-POS-05 | Nao ha link de Drive por entregavel (so pasta geral do job) | MEDIO |
| GAP-POS-06 | Nao ha dashboard de pos com visao cross-jobs | ALTO |
| GAP-POS-07 | Nao ha alertas de prazo por entregavel | MEDIO |

---

## 3. Personas

| Persona | Papel | Dor principal |
|---------|-------|---------------|
| Coordenador de Producao | Gerencia 5+ jobs simultaneos | Precisa saber o estado de cada entregavel sem perguntar no WhatsApp |
| PE (Produtor Executivo) | Supervisiona todo o pipeline | Precisa aprovar offline antes de entrar em online |
| Editor / Montador | Executa as etapas de corte | Precisa saber quais revisoes foram pedidas por versao |
| Colorista / Finalizador | Executa etapas tecnicas | Precisa ver o briefing tecnico (LUT, resolucao, codec de entrega) |
| Atendimento / CEO | Aprova versoes para o cliente | Precisa ver link de review e historico de versoes |

---

## 4. Pipeline de Pos-Producao

O sistema usa 11 etapas mapeadas do fluxo real de produtoras de publicidade brasileiras (conforme respostas do CEO no Bloco 5 do questionario operacional):

**Fluxo CEO:** Montagem+Audio+Trilha > Offline > Alteracoes > Aprovacao > Color/Mix/Motion/3D > Finalizacao > Online > Alteracoes > Aprovacao > Copias > Entrega > Satisfacao

| Valor (pos_stage) | Label PT-BR | Bloco |
|-------------------|------------|-------|
| `ingest` | Ingest | Pre |
| `montagem` | Montagem | Offline |
| `apresentacao_offline` | Apresentacao Offline | Offline |
| `revisao_offline` | Revisao Offline | Offline |
| `aprovado_offline` | Aprovado Offline | Offline |
| `finalizacao` | Finalizacao (Color/VFX/Audio) | Online |
| `apresentacao_online` | Apresentacao Online | Online |
| `revisao_online` | Revisao Online | Online |
| `aprovado_online` | Aprovado Online | Online |
| `copias` | Copias | Entrega |
| `entregue` | Entregue | Entrega |

**Nota:** As etapas de Color, Mix, Motion/3D e VFX sao agrupadas em "Finalizacao" porque na pratica acontecem em paralelo apos aprovacao offline. O tracking granular dessas sub-etapas pode ser adicionado em onda futura se necessario.

---

## 5. User Stories

### US-1.2.01 — Pipeline por entregavel (Must Have)

Como coordenador, quero ver e atualizar a etapa de pos-producao de cada entregavel individualmente, para saber exatamente onde cada peca esta no pipeline sem consultar planilhas.

**Criterios de Aceite:**
- CA-01.1: Cada entregavel tem um campo `pos_stage` com os 11 valores do pipeline
- CA-01.2: A etapa pode ser avancada ou retrocedida pelo coordenador ou PE
- CA-01.3: A etapa e exibida com label em portugues e cor por bloco (offline=azul, online=roxo, entrega=verde)
- CA-01.4: Alterar a etapa registra evento no `job_history` (quem mudou, de qual etapa, para qual)
- CA-01.5: Entregaveis em `apresentacao_offline` ou `apresentacao_online` exibem badge de atencao (aguarda aprovacao)
- CA-01.6: O `deliverable_status` e sincronizado automaticamente: ingest/montagem → em_producao; apresentacao_* → aguardando_aprovacao; entregue → entregue

### US-1.2.02 — Controle de versoes de corte (Must Have)

Como PE ou editor, quero registrar cada versao de corte (V1, V2, V3...) com link e status de aprovacao, para ter historico completo das revisoes sem depender do Frame.io ou de e-mails.

**Criterios de Aceite:**
- CA-02.1: Cada entregavel pode ter N versoes de corte na tabela `pos_cut_versions`
- CA-02.2: Cada versao tem: numero auto-incrementado (V1, V2...), link de review, status (rascunho/enviado/aprovado/rejeitado), notas de revisao, quem criou, quando criou
- CA-02.3: Adicionar nova versao e livre (nao depende do status da versao anterior)
- CA-02.4: Aprovar uma versao muda automaticamente `pos_stage` para `aprovado_offline` (se versao offline) ou `aprovado_online` (se versao online)
- CA-02.5: Rejeitar uma versao muda `pos_stage` para `revisao_offline` ou `revisao_online`
- CA-02.6: A versao aprovada mais recente fica destacada na UI
- CA-02.7: Link de review aceita qualquer URL (Frame.io, Vimeo, Drive, WeTransfer)
- CA-02.8: Apenas PE, CEO, atendimento e admin podem aprovar/rejeitar versoes

### US-1.2.03 — Briefing tecnico por entregavel (Must Have)

Como editor ou colorista, quero ver o briefing tecnico do entregavel (codec, resolucao, fps, aspect ratio, LUT, especificacoes de entrega) diretamente no ELLAHOS, para nao depender de documentos avulsos.

**Criterios de Aceite:**
- CA-03.1: Cada entregavel tem um campo `pos_briefing` (JSONB) com subcampos: codec_master, codec_entrega, resolucao, fps, aspect_ratio, lut_name, audio_specs, notas_tecnicas
- CA-03.2: O briefing e editavel pelo coordenador, PE e admin
- CA-03.3: Os campos sao todos opcionais (nao todos os jobs tem especificacoes rigidas)
- CA-03.4: O briefing e exibido em modo de leitura para editor, colorista e finalizador
- CA-03.5: Campos preenchidos exibem badge de contagem (ex: "3/8 campos preenchidos")

### US-1.2.04 — Link de Drive por entregavel (Must Have)

Como coordenador, quero vincular um link de pasta do Drive a cada entregavel, para que editor e colorista acessem os arquivos corretos sem perguntar.

**Criterios de Aceite:**
- CA-04.1: Cada entregavel tem campo `pos_drive_url` (TEXT) para URL da pasta do Drive
- CA-04.2: O link e editavel pelo coordenador, PE e admin
- CA-04.3: O link e exibido como botao com icone do Drive para todos os usuarios com acesso ao job
- CA-04.4: O sistema sugere o link da pasta `08_POS_PRODUCAO/` do job (se `drive_folder_url` estiver preenchido no job) mas permite URL diferente

### US-1.2.05 — Dashboard de pos-producao cross-jobs (Must Have)

Como coordenador ou PE, quero uma visao consolidada de todos os entregaveis em pos-producao da produtora, agrupados por etapa, para tomar decisoes de prioridade sem abrir job por job.

**Criterios de Aceite:**
- CA-05.1: Nova pagina `/pos-producao` lista todos os entregaveis com `pos_stage` nao nulo e status diferente de `entregue`
- CA-05.2: Filtragem por: job, responsavel, etapa, prazo (hoje/semana/atrasado)
- CA-05.3: Agrupamento por etapa (colunas tipo kanban) OU por job (lista expandivel) — usuario escolhe
- CA-05.4: Cada card mostra: nome do entregavel, nome do job, responsavel, etapa, prazo, versao atual
- CA-05.5: Cards com prazo vencido exibem borda vermelha; prazo em 3 dias, borda amarela
- CA-05.6: Acesso: coordenador, PE, CEO, admin, editor, colorista, finalizador

### US-1.2.06 — Alertas de prazo por entregavel (Should Have)

Como coordenador, quero receber alertas quando um entregavel esta com prazo de entrega proximo ou vencido, para agir antes que o atraso impacte o cliente.

**Criterios de Aceite:**
- CA-06.1: Entregaveis com `delivery_date` vencido exibem badge vermelho na tab Entregaveis e no dashboard
- CA-06.2: Entregaveis com `delivery_date` nos proximos 3 dias exibem badge amarelo
- CA-06.3: Contagem de entregaveis em atraso aparece no header do job
- CA-06.4: Alertas aparecem no banner de alertas do modulo

### US-1.2.07 — Feedback por versao (Should Have)

Como editor, quero registrar as notas de revisao de cada versao rejeitada com timestamp, para ter historico das alteracoes pedidas e nao perder instrucoes dadas verbalmente.

**Criterios de Aceite:**
- CA-07.1: Campo `revision_notes` (TEXT) na versao de corte, editavel por qualquer usuario com acesso ao job
- CA-07.2: Ao rejeitar uma versao, o campo de notas e obrigatorio (nao pode rejeitar sem justificativa)
- CA-07.3: Historico de notas exibido em ordem cronologica por versao
- CA-07.4: Notas de revisao sao visiveis no portal do cliente (configuravel por job: sim/nao)

### US-1.2.08 — Relatorio de pos-producao (Could Have)

Como PE ou CEO, quero exportar um relatorio PDF com o historico de versoes e aprovacoes de um job, para apresentar ao cliente como evidencia do processo criativo.

**Criterios de Aceite:**
- CA-08.1: Botao "Exportar Relatorio" na tab de pos-producao do job
- CA-08.2: PDF contem: nome do job, lista de entregaveis, por entregavel: historico de versoes com datas, status e responsaveis
- CA-08.3: Acesso: PE, CEO, admin

---

## 6. Fora de Escopo

- Integracao nativa com Frame.io (links externos sao aceitos; API Frame.io e onda futura)
- Player de video embutido no ELLAHOS
- Comparacao lado a lado de versoes
- Automacao de upload de arquivos de video
- Aprovacao via portal do cliente (Onda 3)
- Notificacoes por WhatsApp/email por mudanca de etapa (Onda 3)
- Integracao com DaVinci Resolve ou Premiere via EDL/XML
- Pipeline simplificado para fotografia e motion graphics (escopo de onda futura)
- Satisfacao pos-entrega (etapa 12 do CEO) — ja existe no CRM como follow-up

---

## 7. Modelo de Dados

### 7.1 Alteracoes na tabela job_deliverables

Quatro colunas novas adicionadas via migration idempotente:

```sql
ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_stage TEXT
    CHECK (pos_stage IN (
      'ingest', 'montagem', 'apresentacao_offline', 'revisao_offline',
      'aprovado_offline', 'finalizacao', 'apresentacao_online',
      'revisao_online', 'aprovado_online', 'copias', 'entregue'
    )),
  ADD COLUMN IF NOT EXISTS pos_assignee_id UUID
    REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS pos_briefing JSONB DEFAULT NULL;
```

`pos_stage` nulo = entregavel ainda nao entrou em pos-producao.

### 7.2 Nova tabela pos_cut_versions

```sql
CREATE TABLE IF NOT EXISTS pos_cut_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deliverable_id  UUID NOT NULL REFERENCES job_deliverables(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  version_type    TEXT NOT NULL
    CHECK (version_type IN ('offline', 'online')),
  review_url      TEXT,
  status          TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
  revision_notes  TEXT,
  created_by      UUID REFERENCES profiles(id),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deliverable_id, version_type, version_number)
);

ALTER TABLE pos_cut_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pos_cut_versions_tenant ON pos_cut_versions
  USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_deliverable
  ON pos_cut_versions(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_job
  ON pos_cut_versions(job_id);
```

### 7.3 Schema JSONB de pos_briefing

```json
{
  "codec_master": "ProRes 4444",
  "codec_entrega": "H.264",
  "resolucao": "1920x1080",
  "fps": "23.976",
  "aspect_ratio": "16:9",
  "lut_name": "Ellah_REC709_v2.cube",
  "audio_specs": "48kHz, 24bit, stereo, -23 LUFS",
  "notas_tecnicas": "Entregar com burn-in de timecode para a primeira revisao"
}
```

Todos os campos sao opcionais. Campos ausentes nao sao exibidos na UI.

---

## 8. Estrutura de Arquivos (Frontend)

```
frontend/src/
  components/job-detail/tabs/
    TabPosProducao.tsx                  NEW
    pos-producao/
      DeliverableStageCard.tsx          NEW
      CutVersionHistory.tsx             NEW
      AddCutVersionDialog.tsx           NEW
      ApproveRejectDialog.tsx           NEW
      PosBriefingPanel.tsx              NEW
      PosDriveLink.tsx                  NEW
  app/(dashboard)/
    pos-producao/
      page.tsx                          NEW — dashboard cross-jobs
      _components/
        PosKanbanView.tsx               NEW
        PosListView.tsx                 NEW
  hooks/
    usePosProducao.ts                   NEW
  types/
    pos-producao.ts                     NEW
```

Tab adicionada ao sistema de abas do job com value="pos_producao", label="Pos-Producao". RBAC: coordenador, PE, CEO, admin, editor, colorista, finalizador, cco.

---

## 9. Edge Functions

Novas rotas adicionadas ao handler job-deliverables (ou nova EF pos-producao):

| Metodo | Rota | Descricao |
|--------|------|-----------|
| PATCH | /job-deliverables/{id}/pos-stage | Atualiza etapa + registra job_history |
| GET | /job-deliverables/{id}/cut-versions | Lista versoes de corte do entregavel |
| POST | /job-deliverables/{id}/cut-versions | Cria nova versao |
| PATCH | /job-deliverables/{id}/cut-versions/{vid} | Aprova ou rejeita versao |
| GET | /pos-producao/dashboard | Entregaveis em pos cross-jobs (com filtros) |

---

## 10. Plano de Implementacao

### Sprint 1 — Backend + Types + Hooks (1.5 dias)

| Tarefa | Tipo |
|--------|------|
| Migration: 4 colunas em job_deliverables + tabela pos_cut_versions + RLS + indexes | NEW |
| Handlers: patch-pos-stage, list-cut-versions, create-cut-version, update-cut-version | NEW |
| Handler: pos-dashboard (GET cross-jobs com filtros) | NEW |
| Tipos TypeScript: pos-producao.ts | NEW |
| Hooks React Query: usePosProducao.ts | NEW |

### Sprint 2 — Frontend Tab Pos-Producao (1.5 dias)

| Tarefa | Tipo |
|--------|------|
| TabPosProducao.tsx — layout com lista de entregaveis e painel de detalhe | NEW |
| DeliverableStageCard.tsx — card com select de etapa, responsavel, prazo, badge de atencao | NEW |
| CutVersionHistory.tsx — timeline de versoes com status | NEW |
| AddCutVersionDialog.tsx — dialog nova versao com URL e tipo (offline/online) | NEW |
| ApproveRejectDialog.tsx — dialog com campo de notas obrigatorio ao rejeitar | NEW |
| PosBriefingPanel.tsx — painel JSONB editavel e colapsavel | NEW |
| PosDriveLink.tsx — campo URL com sugestao baseada em drive_folder_url do job | NEW |
| Adicionar tab ao job detail: constants + guard RBAC | EDIT |

### Sprint 3 — Dashboard + Alertas + Polish (1.5 dias)

| Tarefa | Tipo |
|--------|------|
| Pagina /pos-producao com PosKanbanView e PosListView | NEW |
| Badges de atraso na TabEntregaveis existente | EDIT |
| Badge de entregaveis atrasados no JobHeader | EDIT |
| Link "Pos-Producao" na sidebar (mesmo nivel que Pre-Producao) | EDIT |
| Dark mode + mobile responsivo em todos os componentes novos | EDIT |

---

## 11. Dependencias

| Dependencia | Estado | Bloqueante? |
|-------------|--------|-------------|
| Tabela job_deliverables com parent_id | CONCLUIDO | Nao |
| ENUM deliverable_status | CONCLUIDO | Nao |
| Roles editor/colorista/finalizador/cco em team_role ENUM | CONCLUIDO | Nao |
| RBAC tab filtering (Fase 1) | CONCLUIDO | Nao |
| JobDetail com sistema de abas extensivel | CONCLUIDO | Nao |
| Tabela job_history para auditoria | CONCLUIDO | Nao |
| RLS com tenant_id do JWT | CONCLUIDO | Nao |

Nenhuma dependencia bloqueante. Sprint 1 pode comecar imediatamente.

---

## 12. Perguntas Abertas

| ID | Pergunta | Impacto | Bloqueante? |
|----|----------|---------|-------------|
| PA-01 | Jobs de fotografia e motion graphics usam o mesmo pipeline de 11 etapas ou um subconjunto? | Medio — pode simplificar a UI para esses tipos de job | Nao |
| PA-02 | A aprovacao de versao no ELLAHOS e apenas registro interno ou o sistema deve tambem enviar o link de review por email/WhatsApp para o aprovador? | Alto — se envio externo for necessario, envolve Onda 3 | Nao |
| PA-03 | O pos_sub_status do job (campo existente: edicao/cor/vfx/finalizacao/audio/revisao) deve ser atualizado automaticamente quando a etapa do entregavel muda, ou continua sendo atualizado manualmente? | Medio — afeta consistencia de dados | Nao |
| PA-04 | ~~Avancar para aprovado_offline sem registrar uma versao de corte deve ser permitido ou bloqueado?~~ | **RESOLVIDO** — Sim, pode avancar sem versao registrada. Workflow flexivel. | Nao |
| PA-05 | Quem tem permissao para retroceder uma etapa (ex: de aprovado_offline para revisao_offline)? So PE/admin, ou o coordenador tambem? | Medio — afeta RBAC dos handlers | Nao |
