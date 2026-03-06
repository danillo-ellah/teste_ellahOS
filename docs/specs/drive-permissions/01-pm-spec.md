# G-04 - Permissoes Drive por Papel

**Versao:** 1.0
**Data:** 2026-03-06
**Status:** APROVADO

---

## 1. Problema e Objetivo

**Problema atual:**
A integracao com o Google Drive cria a estrutura de ~26 pastas para cada job, mas nao controla quem tem acesso a quais pastas. Hoje, o unico controle e via `owner_email` (um unico email recebe `writer` na pasta raiz). Todos os membros do job veem tudo ou nada.

**Objetivo:**
Automatizar a concessao e revogacao de permissoes no Google Drive baseada no papel (`role`) de cada membro do job, garantindo que cada colaborador acesse apenas as pastas pertinentes a sua funcao.

**Principio de design:**
Permissoes sao concedidas nas **pastas de primeiro nivel** (ex: `02_FINANCEIRO`, `08_POS_PRODUCAO`). A heranca do Drive propaga o acesso para os filhos. Isso limita chamadas a API.

---

## 2. User Stories

**US-01 — Concessao automatica ao adicionar membro**
Como produtor executivo, quero que ao adicionar um membro a um job o sistema conceda automaticamente as permissoes no Drive de acordo com o papel desse membro.

**US-02 — Revogacao automatica ao remover membro**
Como admin, quero que ao remover um membro de um job o sistema revogue automaticamente as permissoes no Drive.

**US-03 — Acesso restrito por funcao**
Como financeiro, quero acessar apenas as pastas de financeiro e contratos do job no Drive.

**US-04 — Freelancer com acesso minimo**
Como produtor executivo, quero que freelancers acessem apenas as pastas estritamente necessarias.

**US-05 — Configuracao dos mapeamentos de permissao**
Como admin, quero visualizar e editar quais pastas cada papel pode acessar (via settings JSON).

**US-06 — Re-sync manual**
Como admin, quero forcar uma re-sincronizacao de permissoes de um job especifico.

---

## 3. Mapa de Permissoes por Papel (v4 — FINAL)

**Atualizado em 06/03/2026** apos 31 perguntas com o CEO sobre acesso por funcao.
30 pastas nivel 1 x 18 papeis. Veja mapa completo em `memory/roles-permissions-ellah.md`.

**Legenda:** W = writer | R = reader | — = sem acesso

**Estrutura de pastas nivel 1 (30 pastas):**
01A_ROTEIRO_BRIEFING, 01B_DOCS_PRODUTORA,
02A a 02H (8 pastas financeiras), 03_MONSTRO, 04_CRONOGRAMA,
05A a 05D (4 pastas contratos), 06A a 06D (4 pastas fornecedores),
07_CLIENTES, 08A a 08E (5 pastas pos-producao),
09_ATENDIMENTO, 10_VENDAS_PE

**Papeis (18):**
admin, ceo, cco, produtor_executivo, diretor_producao, financeiro, juridico,
atendimento, diretor (cena), primeiro_assistente (1a AD), dop,
editor, colorista, motion_designer, finalizador, diretor_arte,
figurinista, produtor_casting + tecnicos (gaffer, som, maquiador, locacao)

**Regras principais:**
- CEO/PE: writer na raiz (herda tudo)
- CCO: vendas (W), crono/clientes/atend (R). Override pra atendimento por job
- Dir. Producao: gastos/comprovantes/notinhas (R), producao_pre (W), crono/alvara/clientes (R)
- Financeiro: todas pastas 02* (W), contratos prod/equipe (R), docs produtora (R)
- Juridico: todos contratos (W), alvara (W)
- Atendimento: roteiro (W), decupado/monstro (R), crono (R), alvara (R), clientes (W), pos_pesq/story/montagem (R), atendimento (W)
- Dir. Cena: roteiro/monstro/crono (W), direcao (W), bruto (R), limpo/pesq/story (R), montagem (W)
- 1a AD: mesmo que dir. cena (sem pos)
- Editor/Colorista/Finalizador: pos completa (W), crono (R)
- Dir. Arte: monstro (W), arte_pre (W), crono (R)
- Figurinista: figurino_pre (W), crono (R)
- Casting: contrato_elenco (W), crono (R)
- Tecnicos: so crono (R)
- Coordenador Producao: configuravel POR JOB (default: sem acesso Drive)

**Nota:** O mapa completo com todas as combinacoes esta implementado em `_shared/drive-permission-map.ts`.

---

## 4. Fluxo de Vida das Permissoes

```
[EVENTO]                     [ACAO NO DRIVE]
Adiciona membro (job_team)   → Grant permissoes nas pastas do papel
Remove membro (job_team)     → Revoke todas permissoes via permission_id
Muda papel do membro         → Revoke antigas + Grant novas
Re-sync manual (admin)       → Calcula delta estado esperado vs atual
Deleta job                   → Revoke todas permissoes dos membros
```

---

## 5. Regras de Negocio

**RN-01** Permissoes so para membros ativos em `job_team` com `is_active = true`.
**RN-02** Apenas emails Google (Gmail/Workspace). Outros provedores: warning no log.
**RN-03** Rastreabilidade: toda permissao em `job_drive_permissions` com `drive_permission_id`.
**RN-04** Revogacao por `drive_permission_id` (nao por email).
**RN-05** Idempotente: re-sync nao cria duplicatas.
**RN-06** Falha nao-bloqueante: erro no Drive nao bloqueia adicao de membro.
**RN-07** Mapa configuravel por tenant via `tenants.settings.integrations.google_drive.permission_map`.
**RN-08** Folder IDs vem de tabela `drive_folders` (ja implementada).
**RN-09** Processar permissoes sequencialmente com intervalo (respeitar rate limit Drive API).
**RN-10** Se Drive desabilitado no tenant, nenhuma operacao de permissao.

---

## 6. Criterios de Aceitacao

- CA-01: Financeiro adicionado a job recebe writer em `02_FINANCEIRO` e reader em `05_CONTRATOS`.
- CA-02: Membro removido perde acesso (permissions.delete + revoked_at).
- CA-03: Troca de papel revoga antigas e concede novas.
- CA-04: Re-sync idempotente retorna `{ changes: 0 }` se tudo correto.
- CA-05: Falha no Drive nao bloqueia adicao de membro.
- CA-06: Admin recebe writer na pasta raiz (uma permissao cobre tudo).
- CA-07: Email nao-Google ignorado com warning.
- CA-08: Drive desabilitado nao gera erro.
- CA-09: Mapa customizado do tenant prevalece sobre padrao.
- CA-10: GET /permissions lista membros com permissoes ativas.

---

## 7. Fora de Escopo

- Permissoes em sub-pastas (abaixo do nivel 1)
- Contas nao-Google
- Shared Drives
- Notificacao por email do Google ao conceder
- Auditoria de acessos dentro do Drive
- Permissoes para clientes externos (Portal)
- UI dedicada para mapa de permissoes (usa settings JSON)

---

## 8. Dados Existentes

- `drive_folders`: ja tem `folder_key`, `google_drive_id`, `job_id`, `tenant_id` para cada pasta
- `job_team`: ja tem `role`, `is_active`, `profile_id`, `job_id`
- `profiles`: ja tem `email`
- **Precisa criar:** tabela `job_drive_permissions` (migration)
