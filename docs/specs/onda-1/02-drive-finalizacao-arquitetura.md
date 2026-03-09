# Onda 1.1 -- Drive: Finalizacao para Producao

**Status:** Proposto
**Data:** 2026-03-09
**Autor:** Tech Lead (Claude Opus)

---

## 1. Contexto

A integracao Google Drive esta ~95% implementada. O backend ja possui:

- **10 handlers** em `drive-integration` (create-structure, recreate, delete, list-folders, copy-templates, sync-urls, grant/revoke/sync/list-permissions)
- **1081 linhas** no `google-drive-client.ts` (JWT RS256, CRUD pastas, permissoes, anti-duplicata)
- **Tabelas:** `drive_folders` (pastas por job) + `job_drive_permissions` (audit trail)
- **Frontend:** `DriveSection.tsx` no job detail (CRUD pastas) + `/settings/integrations` (config basica)
- **Auto-trigger:** `jobs-status/approve.ts` ja enfileira `drive_create_structure` via `integration-processor`

Faltam **4 itens** para considerar o Drive pronto para producao:

1. UI de configuracao completa (campos faltantes no form)
2. Dashboard de permissoes por job (frontend)
3. Health check aprimorado (retornar folder_name + folder_count)
4. Auto-trigger ao criar job (alem da aprovacao)

---

## 2. Inventario do que ja existe vs o que falta

### 2.1 UI de Configuracao (`/settings/integrations`)

| Campo | Backend | Frontend Form | Status |
|-------|---------|---------------|--------|
| `enabled` | Lido/salvo | Switch no card | OK |
| `drive_type` | Lido/salvo | Select no dialog | OK |
| `shared_drive_id` | Lido/salvo | Input no dialog | OK |
| `root_folder_id` | Lido/salvo | Input no dialog | OK |
| `service_account_json` | Vault via update-integration | Textarea no dialog | OK |
| `templates[]` | Lido/salvo | Lista editavel no dialog | OK |
| `auto_copy_templates` | Lido no create-structure | **NAO TEM no form** | FALTA |
| `owner_email` | Lido no buildDriveStructure | **NAO TEM no form** | FALTA |
| `auto_share_team` | Lido no buildDriveStructure | **NAO TEM no form** | FALTA |
| `auto_create_on_job` | **NAO EXISTE em nenhum lugar** | **NAO TEM** | FALTA |

**Decisao:** Adicionar os 4 campos faltantes ao formulario do dialog do Drive.

### 2.2 Test Connection (Health Check)

| Aspecto | Estado atual | O que falta |
|---------|-------------|-------------|
| Valida SA JSON | `test-integration.ts` linha 77 | OK |
| Gera access token | `test-integration.ts` linha 85 | OK |
| Valida root folder | `testDriveFolder()` verifica se folder existe | OK |
| Retorna folder_name | **NAO retorna** | FALTA |
| Retorna folder_count | **NAO retorna** | FALTA |

**Decisao:** Aprimorar `testDriveFolder()` para retornar `folder_name` e `folder_count` (filhos diretos). NAO criar handler separado na EF `drive-integration` -- manter tudo em `tenant-settings/test-integration` que ja existe e funciona.

### 2.3 Dashboard de Permissoes por Job

| Aspecto | Estado atual | O que falta |
|---------|-------------|-------------|
| Handler GET /:jobId/permissions | Completo, retorna por membro | OK |
| Frontend para visualizar | **NAO EXISTE** | FALTA |

### 2.4 Auto-trigger ao Criar Job

| Aspecto | Estado atual | O que falta |
|---------|-------------|-------------|
| Trigger na aprovacao | `jobs-status/approve.ts` enfileira `drive_create_structure` | OK |
| Trigger na criacao | **NAO EXISTE** | FALTA |
| Config `auto_create_on_job` | **NAO EXISTE** | FALTA |

---

## 3. Arquitetura Detalhada

### 3.1 Sprint 1 -- Backend (EF + types)

#### 3.1.1 Aprimorar test-connection (health check)

**Arquivo:** `supabase/functions/tenant-settings/handlers/test-integration.ts`

Alterar a funcao `testDriveFolder()` para retornar informacoes extras quando o teste passa:

```
Antes:
  async function testDriveFolder(token, folderId, driveType, sharedDriveId): Promise<boolean>

Depois:
  interface DriveFolderTestResult {
    ok: boolean;
    folder_name?: string;
    folder_count?: number;   // total de filhos diretos (pastas + arquivos)
  }
  async function testDriveFolder(...): Promise<DriveFolderTestResult>
```

Implementacao:
1. GET files/{folderId}?fields=id,name,mimeType -- ja faz, mas descarta name
2. Se ok, fazer listChildren no folder para contar filhos (pageSize=1, apenas count)
3. Alterar retorno do `testGoogleDrive()` para incluir `folder_name` e `folder_count`

**Response atualizada:**
```json
{
  "data": {
    "success": true,
    "message": "Conexao OK! Pasta 'PRODUCAO_ELLAH' acessivel (34 itens).",
    "folder_name": "PRODUCAO_ELLAH",
    "folder_count": 34
  }
}
```

**Impacto:** Nenhum breaking change. Campos novos sao opcionais na response.

#### 3.1.2 Adicionar campos ao Zod schema do Drive

**Arquivo:** `supabase/functions/tenant-settings/handlers/update-integration.ts`

Adicionar ao `googleDriveSchema`:
```typescript
owner_email: z.string().email().optional().nullable(),
auto_share_team: z.boolean().optional(),
auto_copy_templates: z.boolean().optional(),
auto_create_on_job: z.boolean().optional(),
```

Estes campos ja sao lidos pelo `buildDriveStructure` (owner_email, auto_share_team, auto_copy_templates) mas nao tinham validacao no schema de update. O campo `auto_create_on_job` e novo.

**Validacao extra para `owner_email`:** NAO validar pertencimento ao tenant no momento do save (sera validado no momento da execucao pelo `buildDriveStructure` -- principio de validacao tardia). Motivo: o admin pode configurar o email antes de criar o profile.

#### 3.1.3 Auto-trigger ao criar job

**Arquivo:** `supabase/functions/jobs/handlers/create.ts` (ou equivalente de criacao de job)

Adicionar ao final do handler de criacao de job:

```typescript
// Auto-criar pastas Drive se configurado
try {
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};

  if (driveConfig.enabled && driveConfig.auto_create_on_job === true) {
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'drive_create_structure',
      payload: { job_id: newJobId, job_title: title, trigger: 'job_created' },
      idempotency_key: `drive:${newJobId}`,
    });
  }
} catch (triggerErr) {
  // Nao bloqueia criacao do job
  console.error('[jobs/create] falha ao enfileirar Drive auto-create:', triggerErr);
}
```

**Idempotencia:** O `idempotency_key: drive:{jobId}` garante que se o job for aprovado depois, NAO cria pastas duplicadas (o evento ja existira como completed).

**Interacao com trigger de aprovacao:**
- Se `auto_create_on_job=true`: pastas criadas na hora do job. Quando aprovado, o `idempotency_key` evita duplicata.
- Se `auto_create_on_job=false` (default): comportamento atual mantido -- pastas so criadas na aprovacao.

---

### 3.2 Sprint 2 -- Frontend (config + permissoes)

#### 3.2.1 Atualizar types

**Arquivo:** `frontend/src/types/settings.ts`

Adicionar campos ao `GoogleDriveConfig`:
```typescript
export interface GoogleDriveConfig {
  enabled: boolean
  configured: boolean
  drive_type: 'my_drive' | 'shared_drive' | null
  shared_drive_id: string | null
  root_folder_id: string | null
  folder_template: FolderTemplateItem[] | null
  has_service_account: boolean
  templates?: DriveTemplate[]
  // Novos campos
  owner_email?: string | null
  auto_share_team?: boolean
  auto_copy_templates?: boolean
  auto_create_on_job?: boolean
}
```

Adicionar ao `GoogleDriveUpdatePayload`:
```typescript
export interface GoogleDriveUpdatePayload {
  // ... existentes ...
  owner_email?: string | null
  auto_share_team?: boolean
  auto_copy_templates?: boolean
  auto_create_on_job?: boolean
}
```

Atualizar `TestConnectionResult`:
```typescript
export interface TestConnectionResult {
  success: boolean
  message: string
  state?: string
  // Novos campos (Google Drive)
  folder_name?: string
  folder_count?: number
}
```

#### 3.2.2 Atualizar formulario do Drive

**Arquivo:** `frontend/src/app/(dashboard)/settings/integrations/page.tsx`

**Estado local** -- adicionar ao `DriveFormState`:
```typescript
interface DriveFormState {
  // ... existentes ...
  owner_email: string
  auto_share_team: boolean
  auto_copy_templates: boolean
  auto_create_on_job: boolean
}
```

**Campos no Dialog do Drive** (adicionar apos a secao de templates):

```
--- Separador: "Comportamento automatico" ---

[Input] owner_email
  Label: "Email do proprietario das pastas"
  Placeholder: "admin@suaempresa.com"
  Helper: "Email Google que recebera ownership das pastas criadas.
           Deve ser um membro do tenant."

[Switch] auto_create_on_job
  Label: "Criar pastas ao cadastrar job"
  Helper: "Cria automaticamente a estrutura de pastas quando um novo job
           e cadastrado (sem esperar aprovacao)."

[Switch] auto_copy_templates
  Label: "Copiar templates automaticamente"
  Helper: "Copia os templates configurados acima ao criar a estrutura
           de pastas."

[Switch] auto_share_team
  Label: "Compartilhar com equipe automaticamente"
  Helper: "Concede permissoes Drive aos membros da equipe do job.
           ATENCAO: compartilha pastas com emails externos ao Google
           Workspace."
  Badge: "Requer revisao de seguranca"
  Visual: Warning amber quando ativado
```

**Logica de save** (`handleSaveDrive`):
```typescript
// Adicionar ao payload
payload.owner_email = driveForm.owner_email || null
payload.auto_share_team = driveForm.auto_share_team
payload.auto_copy_templates = driveForm.auto_copy_templates
payload.auto_create_on_job = driveForm.auto_create_on_job
```

**Feedback do health check** -- quando `handleTest('google_drive')` retorna, mostrar `folder_name` e `folder_count` no toast:
```typescript
if (result?.success) {
  const extra = result.folder_name
    ? ` Pasta: "${result.folder_name}" (${result.folder_count ?? 0} itens)`
    : ''
  toast.success((result.message ?? 'Conexao OK') + extra)
}
```

#### 3.2.3 Dashboard de Permissoes por Job

**Novo componente:** `frontend/src/components/job-detail/tabs/DrivePermissionsDialog.tsx`

Acessado via botao "Permissoes" no `DriveSection.tsx` (visivel quando ha pastas criadas).

**Layout:**

```
+---------------------------------------------------------------+
| Permissoes Google Drive                              [X fechar]|
|---------------------------------------------------------------|
| Filtro: [x] Apenas ativas   [ ] Incluir revogadas            |
|---------------------------------------------------------------|
| MEMBRO          | PAPEL           | PERMISSOES                |
|---------------------------------------------------------------|
| Maria Silva     | Produtor Exec.  | 30 pastas (writer)        |
|   maria@...     |                 | Concedido: 06/03/2026     |
|---------------------------------------------------------------|
| Joao Santos     | Diretor         | 8 pastas (writer)         |
|   joao@...      |                 | Concedido: 06/03/2026     |
|---------------------------------------------------------------|
| Ana Costa       | Financeiro      | 8 pastas (reader)         |
|   ana@...       |                 | REVOGADO: 07/03/2026      |
|---------------------------------------------------------------|
| [Expandir membro] -> mostra grid folder_key x permissao      |
|   roteiro_briefing    writer   OK                             |
|   fin_orcamento       writer   OK                             |
|   fin_decupado        writer   OK                             |
|   monstro_pesquisa    writer   ERRO: "Email nao Google"       |
+---------------------------------------------------------------+
```

**Dados:** Chama `GET /drive-integration/{jobId}/permissions?active_only=true|false`

**Response existente do backend (ja funciona):**
```json
{
  "data": {
    "members": [
      {
        "job_team_id": "uuid",
        "person_id": "uuid",
        "person_name": "Maria Silva",
        "email": "maria@ellah.com",
        "role": "produtor_executivo",
        "permissions": [
          {
            "id": "uuid",
            "folder_key": "roteiro_briefing",
            "drive_role": "writer",
            "drive_permission_id": "ABC123",
            "granted_at": "2026-03-06T...",
            "revoked_at": null,
            "error_message": null
          }
        ]
      }
    ],
    "meta": {
      "total_members": 2,
      "total_active_permissions": 60,
      "active_only": true
    }
  }
}
```

**Hook:** `useDrivePermissions(jobId: string, activeOnly: boolean)`

```typescript
// frontend/src/hooks/useDrivePermissions.ts
export function useDrivePermissions(jobId: string, activeOnly = true) {
  return useQuery({
    queryKey: ['drive-permissions', jobId, activeOnly],
    queryFn: () =>
      apiGet<DrivePermissionsResponse>(
        'drive-integration',
        { active_only: String(activeOnly) },
        `${jobId}/permissions`,
      ),
    enabled: !!jobId,
    staleTime: 60_000,
  })
}
```

**Componentes internos:**

1. `DrivePermissionsDialog` -- Dialog/Sheet com a tabela
2. `PermissionMemberRow` -- Linha colapsavel por membro
3. `PermissionFolderGrid` -- Grid expandido mostrando folder_key x status

**Indicadores visuais:**
- Verde: permissao ativa com `drive_permission_id` (confirmada no Drive)
- Amarelo: permissao ativa mas `drive_permission_id` null (pendente)
- Vermelho: `error_message` preenchido (falha no Drive)
- Cinza riscado: `revoked_at` preenchido (historico)

**Integracao com DriveSection:**
```tsx
// DriveSection.tsx -- adicionar botao "Permissoes" ao lado dos existentes
{hasFolders && (
  <Button variant="outline" size="sm" onClick={() => setPermissionsOpen(true)}>
    <Shield className="size-3.5 mr-1.5" />
    Permissoes
  </Button>
)}
<DrivePermissionsDialog
  jobId={job.id}
  open={permissionsOpen}
  onOpenChange={setPermissionsOpen}
/>
```

---

## 4. Tipos TypeScript (novos)

```typescript
// frontend/src/types/drive.ts -- adicionar

export interface DrivePermissionEntry {
  id: string
  folder_key: string
  drive_role: 'writer' | 'reader'
  drive_permission_id: string | null
  granted_at: string
  revoked_at: string | null
  error_message: string | null
}

export interface DrivePermissionMember {
  job_team_id: string
  person_id: string
  person_name: string
  email: string
  role: string
  permissions: DrivePermissionEntry[]
}

export interface DrivePermissionsResponse {
  members: DrivePermissionMember[]
  meta: {
    total_members: number
    total_active_permissions: number
    active_only: boolean
  }
}
```

---

## 5. Contratos de API

### 5.1 POST /tenant-settings/integrations/google_drive/test (existente, response aprimorada)

**Request:** `POST` com body `{}` (Bearer token de admin/ceo)

**Response (sucesso com root_folder_id configurado):**
```json
{
  "data": {
    "success": true,
    "message": "Conexao OK! Pasta 'PRODUCAO_ELLAH' acessivel (34 itens).",
    "folder_name": "PRODUCAO_ELLAH",
    "folder_count": 34
  }
}
```

**Response (sucesso sem root_folder_id):**
```json
{
  "data": {
    "success": true,
    "message": "Autenticacao OK! Configure a pasta raiz para validar acesso completo."
  }
}
```

**Response (falha):**
```json
{
  "data": {
    "success": false,
    "message": "Autenticacao OK, mas a pasta raiz nao foi encontrada ou nao tem permissao."
  }
}
```

### 5.2 PATCH /tenant-settings/integrations/google_drive (existente, campos novos)

**Request:**
```json
{
  "enabled": true,
  "drive_type": "my_drive",
  "root_folder_id": "1ABC...",
  "owner_email": "daniel@ellahfilmes.com",
  "auto_create_on_job": true,
  "auto_copy_templates": false,
  "auto_share_team": false,
  "templates": [
    { "source_id": "1XYZ...", "name": "OD Base", "target_folder_key": "docs_produtora" }
  ]
}
```

**Response:** Merge do config completo (igual ao comportamento atual).

### 5.3 GET /drive-integration/{jobId}/permissions (existente, sem alteracao)

Ja documentado na secao 3.2.3. Nenhuma mudanca necessaria.

---

## 6. Fluxo de Dados: Ciclo de Vida Drive

```
Job criado
  |
  v
[auto_create_on_job?] --sim--> enqueue drive_create_structure (idempotency_key: drive:{jobId})
  |                                |
  nao                              v
  |                     integration-processor
  v                                |
Job aprovado                       v
  |                     buildDriveStructure()
  v                       - Cria 30+ pastas
enqueue drive_create_structure     - Registra em drive_folders
(idempotency_key: drive:{jobId})   - Transfere ownership
  |                                - auto_copy_templates?
  v                                - auto_share_team?
[idempotency check]
  |
  ja existe completed? -> skip (NAO duplica)
  |
  novo? -> processa normalmente
```

---

## 7. Matriz de Risco

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| owner_email invalido | Ownership nao transferida | Medio | Validacao tardia em buildDriveStructure + warning no toast |
| auto_share_team com emails externos | Vazamento de dados | Baixo | Badge de warning, desabilitado por default, validacao no backend |
| Health check timeout na Drive API | UX ruim | Baixo | AbortSignal.timeout(15000) ja existe |
| Duplicata de pastas com auto_create_on_job | Pastas duplicadas | Muito baixo | idempotency_key garante unicidade |
| Rate limit Drive API no folder_count | Teste falha | Muito baixo | Single call, nao afeta criacao |

---

## 8. Checklist de Implementacao

### Sprint 1 -- Backend (~2h)
- [ ] **B-01:** Aprimorar `testDriveFolder()` para retornar `folder_name` + `folder_count`
- [ ] **B-02:** Atualizar retorno de `testGoogleDrive()` com campos extras
- [ ] **B-03:** Adicionar 4 campos ao `googleDriveSchema` no `update-integration.ts`
- [ ] **B-04:** Localizar handler de criacao de jobs e adicionar auto-trigger Drive
- [ ] **B-05:** Testar: PATCH config salva novos campos, test-connection retorna extras
- [ ] **B-06:** Deploy EFs: `tenant-settings` + handler de jobs

### Sprint 2 -- Frontend (~3h)
- [ ] **F-01:** Atualizar types em `settings.ts` e `drive.ts`
- [ ] **F-02:** Adicionar 4 campos ao dialog do Drive em `/settings/integrations`
- [ ] **F-03:** Melhorar feedback do health check (folder_name no toast)
- [ ] **F-04:** Criar `useDrivePermissions.ts` hook
- [ ] **F-05:** Criar `DrivePermissionsDialog.tsx` componente
- [ ] **F-06:** Integrar dialog no `DriveSection.tsx` (botao Permissoes)
- [ ] **F-07:** Testar dark mode + mobile para novos componentes

### QA (~1h)
- [ ] **Q-01:** Config completa: salvar todos os campos, recarregar e verificar persistencia
- [ ] **Q-02:** Health check: testar com SA valida, SA invalida, root_folder_id errado
- [ ] **Q-03:** Permissoes dialog: verificar com job sem permissoes, com permissoes ativas, com revogadas
- [ ] **Q-04:** Auto-trigger: criar job com config habilitada e verificar que evento foi enfileirado
- [ ] **Q-05:** Idempotencia: criar job (auto-trigger) e depois aprovar -- verificar que NAO duplica pastas

---

## 9. Arquivos Impactados

### Backend (modificar)
| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/tenant-settings/handlers/test-integration.ts` | Aprimorar testDriveFolder() |
| `supabase/functions/tenant-settings/handlers/update-integration.ts` | 4 campos no schema |
| `supabase/functions/jobs/handlers/create.ts` (ou equivalente) | Auto-trigger Drive |

### Frontend (modificar)
| Arquivo | Mudanca |
|---------|---------|
| `frontend/src/types/settings.ts` | 4 campos em GoogleDriveConfig + TestConnectionResult |
| `frontend/src/types/drive.ts` | Tipos de permissao |
| `frontend/src/app/(dashboard)/settings/integrations/page.tsx` | Form state + campos no dialog |
| `frontend/src/components/job-detail/tabs/DriveSection.tsx` | Botao "Permissoes" |

### Frontend (criar)
| Arquivo | Descricao |
|---------|-----------|
| `frontend/src/hooks/useDrivePermissions.ts` | Hook para GET permissions |
| `frontend/src/components/job-detail/tabs/DrivePermissionsDialog.tsx` | Dialog de permissoes |

---

## 10. Decisoes Arquiteturais

### D-01: Health check via tenant-settings (NAO drive-integration)

**Decisao:** Aprimorar o handler existente `tenant-settings/test-integration.ts` em vez de criar novo handler em `drive-integration`.

**Motivo:** O health check ja funciona, ja tem a logica de ler SA do Vault e testar acesso. Criar handler novo na EF `drive-integration` exigiria mudar o router (que hoje exige `jobId` como primeiro segmento), adicionar rota sem jobId, e duplicar logica de leitura de config do tenant.

### D-02: Auto-trigger no create (NAO via database trigger)

**Decisao:** Enfileirar evento no handler de criacao de job (aplicacao), NAO via pg trigger no banco.

**Motivo:** Database triggers nao tem acesso ao contexto do tenant_settings sem query adicional, e misturar logica de integracao no banco viola o principio "Edge Functions para logica de negocio". Alem disso, o handler de criacao ja tem acesso ao auth context com tenant_id.

### D-03: Permissoes via Dialog (NAO inline no DriveSection)

**Decisao:** Usar Dialog/Sheet para visualizar permissoes, acessado via botao no DriveSection.

**Motivo:** A tabela de permissoes pode ter muitas linhas (30 pastas x N membros). Mostrar inline inflaria o DriveSection que ja tem CRUD de pastas. Dialog permite scroll proprio e filtros sem poluir a aba principal.

### D-04: Campos de config como booleans simples (NAO config complexa)

**Decisao:** `auto_create_on_job`, `auto_share_team`, `auto_copy_templates` sao booleans no JSONB `tenants.settings.integrations.google_drive`.

**Motivo:** Simplicidade. Nao ha necessidade de configuracao granular nesta fase (ex: "auto-criar apenas para project_type=comercial"). Se surgir demanda futura, podemos evoluir para objetos.

---

## 11. Fora de Escopo (nesta onda)

- **Webhook de mudanca de permissoes no Drive** -- exigiria Push Notifications API do Google (complexidade alta, beneficio baixo)
- **Sync bidirecional de pastas** -- se usuario renomear pasta no Drive, nao atualizamos no DB
- **UI para editar template de pastas** -- o template ja e configuravel via JSON no settings, mas nao tem editor visual
- **Bulk grant/revoke de permissoes** -- ja existe sync-permissions handler, mas frontend so tem acoes individuais
- **Permissoes por pasta individual no frontend** -- o dialog mostra read-only; para editar, usar os botoes existentes de grant/revoke no DriveSection

---

## 12. Sequencia de Implementacao Recomendada

```
1. B-03 (schema) -> B-01/B-02 (health check) -> B-04 (auto-trigger) -> Deploy
2. F-01 (types) -> F-02/F-03 (config form) -> F-04/F-05/F-06 (permissoes) -> F-07 (polish)
3. Q-01..Q-05 (QA)
```

Total estimado: **~6 horas** (2h backend + 3h frontend + 1h QA).
