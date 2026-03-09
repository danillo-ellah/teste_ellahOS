# Onda 1.1 -- Drive: Finalizacao para Producao

**Data:** 2026-03-09
**Status:** ESPECIFICADO
**Autor:** PM (Claude Sonnet 4.6)
**Esforco estimado:** 1-2 dias (2 entregaveis independentes, podem ser implementados em paralelo)
**Fontes:** Auditoria completa do codebase -- handlers drive-integration, tenant-settings, DriveSection.tsx, types/settings.ts, _shared/google-drive-client.ts

---

## 1. Visao Geral

A integracao Google Drive esta 95% implementada. O backend de criacao de pastas, permissoes por papel, audit trail e configuracao via API existem e funcionam. O que impede ir a producao sao dois gaps exclusivamente de frontend:

1. **Campo owner_email ausente no formulario de configuracao** (Settings > Integracoes > Google Drive): o backend ja usa esse campo para transferir o ownership das pastas da Service Account para o email do PE ou admin do tenant. Sem ele, as pastas ficam presas como propriedade da SA e o responsavel nao consegue gerencia-las no Drive.

2. **Painel de permissoes Drive ausente no job**: os handlers de backend para listar, conceder, revogar e sincronizar permissoes por membro existem e foram testados. Nao existe nenhum componente frontend que os consuma -- o admin precisa usar a API diretamente para gerenciar quem tem acesso as pastas de cada job.

Esta spec documenta apenas esses dois entregaveis. Nenhum outro aspecto da integracao Drive precisa ser reimplementado.

---

## 2. Estado Atual -- O Que Ja Existe (NAO reimplementar)

### Edge Function drive-integration (10 handlers)

| Handler | Rota | Funcao |
|---------|------|--------|
| create-structure | POST /:jobId/create-structure | Cria 26+ pastas no Drive (admin, ceo) |
| recreate | POST /:jobId/recreate | Recria estrutura preservando pastas antigas (admin, ceo) |
| sync-urls | POST /:jobId/sync-urls | Callback do n8n para popular URLs (webhook secret) |
| copy-templates | POST /:jobId/copy-templates | Copia templates configurados para pastas do job (admin, ceo, pe) |
| delete-structure | DELETE /:jobId/delete-structure | Move pastas para lixeira do Drive (admin, ceo) |
| list-folders | GET /:jobId/folders | Lista pastas registradas no banco (qualquer autenticado) |
| sync-permissions | POST /:jobId/sync-permissions | Re-sync completo: grants faltantes + revokes excedentes (admin, ceo) |
| grant-member-permissions | POST /:jobId/grant-member-permissions | Concede acesso a membro especifico (admin, ceo, pe) |
| revoke-member-permissions | POST /:jobId/revoke-member-permissions | Revoga acesso de membro especifico (admin, ceo, pe) |
| list-permissions | GET /:jobId/permissions | Lista permissoes agrupadas por membro (qualquer autenticado) |

### Edge Function tenant-settings

- Configuracao Google Drive salva em tenants.settings JSONB (sem migration necessaria)
- Handler update-integration: valida e persiste config (SA via Vault Supabase, demais campos no JSONB)
- Handler get-integrations: retorna config atual com defaults
- Handler test-integration: testa SA + acesso a pasta raiz (ja funciona, botao Testar existe no card)

### _shared/google-drive-client.ts

- 1081 linhas: JWT RS256, retry, rate-limit, buildDriveStructure, grantFolderPermission, revokePermission, transferOwnership
- Campo owner_email ja e consumido em buildDriveStructure: se presente e validado como pertencente ao tenant, transfere ownership das pastas criadas para esse email
- Se owner_email ausente: SA permanece como owner (log de aviso, nao erro)

### _shared/drive-permission-map.ts

- Mapa aprovado pelo CEO: 18 papeis x 26 folder_keys
- resolvePermissionRole: mapeia papel do job_team para DrivePermissionRole
- getPermissionMap: carrega mapa (default ou customizado por tenant)

### Frontend existente

- DriveSection.tsx: arvore de pastas colapsavel + botoes Criar / Recriar / Excluir (admin, ceo)
- useDriveFolders.ts: hooks para listar pastas + mutacoes de estrutura
- types/drive.ts: DriveFolderRow, DriveFoldersResponse, DriveStructureResponse
- /settings/integrations/page.tsx: card Google Drive com form completo (SA, drive_type, root_folder_id, templates, enabled)

---

## 3. Escopo desta Onda -- O Que Falta

### Entregavel A: Campo owner_email no formulario Drive

O campo owner_email e lido pelo backend em buildDriveStructure mas nunca foi exposto na UI nem adicionado ao schema de validacao da Edge Function. Artefatos impactados:

**Backend (sem migration de banco):**

| Arquivo | Alteracao |
|---------|-----------|
| supabase/functions/tenant-settings/handlers/update-integration.ts | Adicionar owner_email (Zod, string email, opcional) ao googleDriveSchema |
| supabase/functions/tenant-settings/handlers/get-integrations.ts | Adicionar owner_email: null ao DEFAULT_INTEGRATIONS.google_drive |

**Frontend (modificar arquivos existentes):**

| Arquivo | Alteracao |
|---------|-----------|
| frontend/src/types/settings.ts | Adicionar campo owner_email em GoogleDriveConfig e GoogleDriveUpdatePayload |
| frontend/src/app/(dashboard)/settings/integrations/page.tsx | Adicionar campo owner_email ao DriveFormState; adicionar Input type=email no Dialog do Drive |

### Entregavel B: Painel de Permissoes na Tab Drive do Job

Os 4 handlers de permissao existem no backend mas nao ha frontend para eles. Artefatos impactados:

**Novos arquivos:**

| Arquivo | Conteudo |
|---------|---------|
| frontend/src/types/drive-permissions.ts | Tipos para resposta dos handlers de permissoes |
| frontend/src/hooks/useDrivePermissions.ts | 4 hooks: useDrivePermissions, useGrantMemberPermissions, useRevokeMemberPermissions, useSyncPermissions |
| frontend/src/components/job-detail/tabs/DrivePermissionsPanel.tsx | Componente de painel com lista de membros, botoes conceder/revogar/sincronizar |

**Modificar arquivo existente:**

| Arquivo | Alteracao |
|---------|-----------|
| frontend/src/components/job-detail/tabs/DriveSection.tsx | Importar e renderizar DrivePermissionsPanel quando hasFolders = true |

---

## 4. User Stories (MoSCoW)

### MUST HAVE

**US-D-01 -- Configurar email de dono das pastas**
Como admin ou CEO, quero informar o email do responsavel (Produtor Executivo) nas configuracoes do Google Drive, para que as pastas criadas no Drive sejam propriedade desse usuario e nao da Service Account.

Criterios de aceite:
- CA-01.1: Campo Email do dono das pastas no Dialog de configuracao Google Drive em /settings/integrations, com placeholder ex: pe@empresa.com.br
- CA-01.2: Campo aceita qualquer string de email valida; a validacao de pertencimento ao tenant e feita pelo backend (se inválido, erro aparece como warning no log, nao bloqueia criacao de pastas)
- CA-01.3: Ao salvar, o campo e persistido em settings.integrations.google_drive.owner_email no JSONB do tenant via PATCH /tenant-settings/integrations/google_drive
- CA-01.4: Ao reabrir o Dialog, o valor salvo e pre-populado no campo (comportamento identico aos demais campos do form)
- CA-01.5: Campo e opcional: salvar sem preencher nao causa erro; SA permanece como owner das pastas
- CA-01.6: O comportamento de transferencia de ownership ao criar pastas ja existe no backend e nao precisa ser alterado

**US-D-02 -- Visualizar permissoes Drive de um job**
Como admin, CEO ou Produtor Executivo, quero ver quais membros da equipe tem acesso as pastas Drive do job e quais pastas cada um pode acessar.

Criterios de aceite:
- CA-02.1: Painel Permissoes Drive visivel na tab Drive do job quando houver pastas criadas (hasFolders = true)
- CA-02.2: Lista exibe todos os membros do job_team com: nome, papel no job, badge de status (verde = com permissoes, vermelho = sem permissoes, amarelo = erros parciais)
- CA-02.3: Cada membro expansivel para ver lista de pastas com acesso (label da pasta + tipo de acesso writer/reader + data de concessao dd/MM/yyyy)
- CA-02.4: Membros sem nenhuma permissao ativa aparecem na lista com status Sem acesso
- CA-02.5: Contador no header do painel: X de Y membros com permissoes ativas
- CA-02.6: Leitura permitida para qualquer papel autenticado do tenant

**US-D-03 -- Conceder permissoes Drive a membro**
Como admin, CEO ou Produtor Executivo, quero conceder permissoes Drive a um membro especifico da equipe, para que ele passe a ter acesso as pastas correspondentes ao seu papel.

Criterios de aceite:
- CA-03.1: Botao Conceder acesso visivel para cada membro sem permissoes ativas; apenas para papeis admin, ceo, produtor_executivo
- CA-03.2: Ao clicar, acao executada imediatamente (sem dialog de confirmacao) com loading state no botao
- CA-03.3: Apos sucesso, lista de permissoes do membro atualiza com as pastas concedidas
- CA-03.4: Se backend retornar warning EMAIL_NOT_GOOGLE, exibir toast de aviso sem bloquear (permissao pode falhar no Drive mas e registrada no banco)
- CA-03.5: Se membro nao tiver papel mapeado no drive-permission-map.ts, backend retorna 0 permissoes -- exibir toast informativo

**US-D-04 -- Revogar permissoes Drive de membro**
Como admin, CEO ou Produtor Executivo, quero revogar as permissoes Drive de um membro quando ele sair do job ou mudar de papel.

Criterios de aceite:
- CA-04.1: Botao Revogar acesso visivel para cada membro com permissoes ativas; apenas para papeis admin, ceo, produtor_executivo
- CA-04.2: Ao clicar, exibir dialog de confirmacao com nome do membro e contagem de pastas que serao revogadas
- CA-04.3: Apos confirmacao, loading state e execucao da revogacao
- CA-04.4: Apos sucesso, lista de permissoes do membro atualiza para Sem acesso

**US-D-05 -- Sincronizar permissoes de todos os membros**
Como admin ou CEO, quero sincronizar as permissoes Drive de todos os membros do job de uma so vez, para corrigir divergencias sem precisar conceder/revogar um por um.

Criterios de aceite:
- CA-05.1: Botao Sincronizar permissoes no header do painel; apenas para papeis admin e ceo
- CA-05.2: Dialog de confirmacao explica: grants faltantes serao adicionados, permissoes de membros removidos serao revogadas
- CA-05.3: Apos confirmacao, loading state no botao com texto Sincronizando...
- CA-05.4: Apos sucesso, toast com resumo: X acessos concedidos, Y acessos revogados, Z sem alteracao
- CA-05.5: Se houver erros parciais (backend retorna errors[]), toast de aviso sem tratar como falha total
- CA-05.6: Query de permissoes invalidada apos sync bem-sucedido

### SHOULD HAVE

**US-D-06 -- Historico de permissoes revogadas**
Como admin, quero ver o historico de permissoes que foram revogadas para auditar quem teve acesso no passado.

Criterios de aceite:
- CA-06.1: Toggle Mostrar historico no header do painel; ao ativar, passa active_only=false para o endpoint
- CA-06.2: Permissoes revogadas exibidas com estilo dimmed, badge Revogado e data de revogacao
- CA-06.3: Toggle desabilitado por padrao (active_only=true)

### COULD HAVE

**US-D-07 -- Link direto para pasta no painel de permissoes**
Como membro da equipe, quero clicar no nome de uma pasta no painel de permissoes e abrir diretamente no Google Drive.

Criterios de aceite:
- CA-07.1: Para cada permissao ativa listada, se a pasta tiver URL registrada em drive_folders, exibir icone de link externo clicavel
- CA-07.2: URL aberta em nova aba

---

## 5. Modelo de Dados

**Nenhuma migration de banco e necessaria para esta onda.**

### 5.1 Alteracoes em tenants.settings (JSONB)

O campo owner_email e adicionado ao objeto google_drive dentro de integrations. O mecanismo de merge do handler update-integration ja preserva campos existentes ao fazer PATCH -- nenhuma alteracao estrutural no banco.

Estado atual do JSONB:

  { enabled, drive_type, root_folder_id, has_service_account, templates }

Estado apos esta onda:

  { enabled, drive_type, root_folder_id, has_service_account, templates,
    owner_email: pe@ellahfilmes.com.br }  <- NOVO

### 5.2 Novos tipos TypeScript

Arquivo novo: frontend/src/types/drive-permissions.ts

Interfaces a definir (derivadas da resposta real dos handlers existentes):

DrivePermissionEntry: id, folder_key, drive_role (writer ou reader), drive_permission_id, granted_at, revoked_at, error_message

DrivePermissionMember: job_team_id, person_id, person_name, email, role, permissions: DrivePermissionEntry[]

DrivePermissionsResponse: members: DrivePermissionMember[], meta: { total_members, total_active_permissions, active_only }

GrantPermissionsResult: job_team_id, person_name, email, role, drive_role, permissions_granted, permissions_skipped, permissions_failed, details[]
  detail: { folder_key, drive_role, status: granted|skipped_existing|folder_not_found|failed, error? }

RevokePermissionsResult: job_team_id, permissions_revoked, permissions_failed

SyncPermissionsResult: grants_added, permissions_revoked, unchanged, errors: string[], total_members, total_permissions

### 5.3 Alteracoes em tipos existentes (settings.ts)

Em GoogleDriveConfig: adicionar campo owner_email do tipo string ou null
Em GoogleDriveUpdatePayload: adicionar campo owner_email opcional, tipo string ou null

---

## 6. Telas

### T1: Dialog de Configuracao Google Drive (modificar existente)

Localizacao: /settings/integrations, Dialog do card Google Drive.

Estado atual: o form ja tem Service Account JSON, Tipo de Drive, ID do Drive Compartilhado, Pasta Raiz e Templates.

Alteracao desta onda: adicionar campo Email do dono das pastas entre os campos Pasta Raiz e Templates.

Layout do campo novo:

  Label: Email do dono das pastas
  Tipo: Input type=email
  Placeholder: pe@empresa.com.br
  Descricao (helper text): Email de um usuario Google registrado neste tenant. As pastas criadas serao transferidas para este email como proprietario.

Comportamento:
- Campo pre-populado com cfg.owner_email ao abrir o Dialog (identico a root_folder_id)
- Salvo no payload junto com os demais campos do form (null se string vazia)
- Nao e campo obrigatorio

### T2: Painel de Permissoes Drive (componente novo)

Localizacao: tab Drive do job detail, abaixo da secao existente de arvore de pastas (dentro ou apos DriveSection.tsx).
Condicional: so renderizado quando hasFolders = true.

Layout geral:

  [Permissoes Drive]                              [Sincronizar permissoes] (admin, ceo)
  3 de 5 membros com permissoes ativas          [Toggle: Mostrar historico] (SHOULD)

  [v] Maria Silva     Diretora de Arte     [verde] Acesso ativo      [Revogar acesso]
      Pasta 03_MONSTRO_PESQUISA_ARTES   writer   09/03/2026
      Pasta 04_CRONOGRAMA               reader   09/03/2026
      ...

  [>] Joao Costa      Editor              [vermelho] Sem acesso      [Conceder acesso]

  [>] Pedro Lima      Financeiro          [amarelo] 1 erro           [Revogar acesso]
      Pasta 02A_ORCAMENTO_CARTA          reader   09/03/2026
      Pasta 02B_DECUPADO                 reader   ERRO: invalid email

Status badges de cada membro:
- Verde (check): pelo menos 1 permissao ativa e sem error_message != null
- Vermelho (x): sem permissoes ativas
- Amarelo (alerta): pelo menos 1 permissao ativa mas alguma tem error_message != null

Labels de pasta: reutilizar o mapa FOLDER_LABELS ja definido em DriveSection.tsx.

Loading states:
- Carregamento inicial: skeleton com 3 linhas de membro
- Conceder acesso: botao com spinner, desabilitado durante mutacao
- Revogar acesso: dialog de confirmacao, botao confirmar com spinner
- Sincronizar: botao com spinner + texto Sincronizando...

States de erro:
- Erro ao carregar lista: mensagem com botao Tentar novamente
- Erro parcial pos-sync: toast de aviso listando errors[] (nao falha total)

---

## 7. Dependencias

| Dependencia | Status | Onde e usada |
|-------------|--------|--------------|
| GET /:jobId/permissions | Existente, funcionando | Fonte de dados do painel T2 |
| POST /:jobId/grant-member-permissions | Existente, funcionando | Botao Conceder acesso |
| POST /:jobId/revoke-member-permissions | Existente, funcionando | Botao Revogar acesso |
| POST /:jobId/sync-permissions | Existente, funcionando | Botao Sincronizar permissoes |
| PATCH /tenant-settings/integrations/google_drive | Existente | Salvar owner_email |
| DriveSection.tsx | Existente, modificar | Renderizar DrivePermissionsPanel |
| FOLDER_LABELS (DriveSection.tsx) | Existente | Labels de pasta no painel |
| drive-permission-map.ts | Existente | Controla quais pastas cada papel acessa |
| job_team (tabela) | Existente | Fonte dos membros exibidos no painel |
| job_drive_permissions (tabela) | Existente | Audit trail de permissoes |

---

## 8. Fora de Escopo

| Item | Motivo | Quando entra |
|------|--------|--------------|
| Rotacao da chave Service Account | Operacional; executado no GCP Console e no Vault Supabase | N/A |
| n8n Workflow NF (Gmail -> Drive -> ingest) | Tem spec propria (onda-1/04-nf-automacao-n8n-spec.md); ja esta em producao | Ja entregue |
| Catalogo de material bruto (clips, metadata) | Gap G-05 do RELATORIO-FINAL-DRIVE-ELLAH.md -- Tier 3, esforco alto | Onda futura |
| Indexacao de documentos dentro das pastas | Gap G-06 -- requer habilitar Google Docs API no GCP | Onda futura |
| Storage analytics (espaco ocupado por job) | Gap G-10 -- Tier 3 | Onda futura |
| Importacao de dados historicos (jobs 003-039) | Gap G-07 -- script de migracao separado | Onda futura |
| Notificacao ao membro quando permissao e concedida | Nao foi pedido; membro ve a pasta no Drive automaticamente | Nao previsto |
| Permissoes customizadas por membro (override do mapa) | Nao foi pedido; usa sempre o mapa por papel | Nao previsto |
| Painel de permissoes Drive em /settings (visao global) | Nao foi pedido; escopo e por job | Nao previsto |
| Teste de conexao Drive | Ja implementado (botao Testar no card) | Ja entregue |

---

## 9. Criterio de Done

### Entregavel A: Campo owner_email em /settings/integrations

Backend:
- [ ] update-integration.ts: campo owner_email adicionado ao googleDriveSchema (Zod, string email, opcional, nullable)
- [ ] get-integrations.ts: owner_email: null adicionado ao objeto google_drive em DEFAULT_INTEGRATIONS

Frontend:
- [ ] types/settings.ts: campo owner_email: string | null adicionado a GoogleDriveConfig
- [ ] types/settings.ts: campo owner_email?: string | null adicionado a GoogleDriveUpdatePayload
- [ ] integrations/page.tsx: campo owner_email adicionado ao DriveFormState (string, default string vazia)
- [ ] integrations/page.tsx: Input type=email adicionado ao Dialog do Drive
- [ ] integrations/page.tsx: handleSaveDrive inclui owner_email no payload (null se string vazia)
- [ ] integrations/page.tsx: openDriveDialog popula owner_email com cfg.owner_email

Testes de aceite:
- [ ] Admin preenche owner_email com email valido, salva, fecha dialog, reabre: campo mostra o valor salvo
- [ ] Admin salva sem preencher owner_email: sem erro, comportamento identico ao atual
- [ ] Admin preenche owner_email com email invalido (formato errado): validacao Zod retorna erro 400, toast de erro aparece

### Entregavel B: Painel de Permissoes na Tab Drive do Job

Novos arquivos criados:
- [ ] frontend/src/types/drive-permissions.ts: tipos DrivePermissionEntry, DrivePermissionMember, DrivePermissionsResponse, GrantPermissionsResult, RevokePermissionsResult, SyncPermissionsResult (ver secao 5.2)
- [ ] frontend/src/hooks/useDrivePermissions.ts: hook useDrivePermissions(jobId, activeOnly?) com TanStack Query
- [ ] frontend/src/hooks/useDrivePermissions.ts: hook useGrantMemberPermissions()
- [ ] frontend/src/hooks/useDrivePermissions.ts: hook useRevokeMemberPermissions()
- [ ] frontend/src/hooks/useDrivePermissions.ts: hook useSyncPermissions()
- [ ] frontend/src/components/job-detail/tabs/DrivePermissionsPanel.tsx: componente com lista de membros, badges de status, expansao de permissoes

Funcionalidades do componente DrivePermissionsPanel:
- [ ] Lista de membros com nome, papel, badge de status (verde/vermelho/amarelo)
- [ ] Cada membro expansivel para ver lista de pastas com acesso (label + tipo + data)
- [ ] Contador: X de Y membros com permissoes ativas
- [ ] Botao Conceder acesso (MUST US-D-03): apenas para papeis admin, ceo, produtor_executivo
- [ ] Botao Revogar acesso com dialog de confirmacao (MUST US-D-04): apenas para papeis admin, ceo, produtor_executivo
- [ ] Botao Sincronizar permissoes com dialog de confirmacao (MUST US-D-05): apenas para papeis admin, ceo
- [ ] Toggle Mostrar historico (SHOULD US-D-06)
- [ ] Loading states: skeleton inicial, spinners nos botoes durante mutacoes
- [ ] Estado de erro ao carregar com botao Tentar novamente

Arquivo modificado:
- [ ] DriveSection.tsx: importa e renderiza DrivePermissionsPanel apos a grid de pastas, condicional a hasFolders = true

Qualidade:
- [ ] Zero erros TypeScript em modo strict
- [ ] Dark mode funcionando no painel
- [ ] Botoes desabilitados durante mutacoes (isPending) para evitar duplo clique

Testes de aceite ponta a ponta:
- [ ] Admin abre tab Drive de job com pastas: painel carrega com lista de membros do job_team
- [ ] Admin clica Conceder acesso em membro sem permissoes: toast de sucesso, membro passa a mostrar permissoes ativas com badge verde
- [ ] Admin clica Revogar acesso em membro com permissoes: dialog aparece, apos confirmar membro aparece com badge vermelho
- [ ] Admin clica Sincronizar permissoes: dialog aparece, apos confirmar toast com resumo (X concedidos, Y revogados, Z sem alteracao)
- [ ] Atendimento (papel atendimento) abre tab Drive: ve o painel mas nao ve botoes Conceder/Revogar/Sincronizar
- [ ] Job sem pastas criadas: painel de permissoes nao aparece

---

## 10. Perguntas Abertas

Nenhuma. Todos os requisitos estao confirmados no codebase existente. O comportamento do backend esta documentado no codigo e nao requer decisoes adicionais do CEO ou do time.
