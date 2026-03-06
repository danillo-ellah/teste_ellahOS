# G-04 - Permissoes Drive por Papel - Arquitetura Tecnica

**Versao:** 1.0
**Data:** 2026-03-05
**Status:** APROVADO
**Autor:** Tech Lead

---

## 0. Decisoes Arquiteturais

| Decisao | Justificativa |
|---------|--------------|
| Tabela `job_drive_permissions` para rastreabilidade | Permite revogar por `drive_permission_id` (RN-04), auditoria, e re-sync via delta |
| Mapa default como constante TS + override por tenant | Simples, sem migration ao mudar mapa. Tenant override via `settings.integrations.google_drive.permission_map` (RN-07) |
| Integracao via chamada interna nos handlers de `jobs-team` | Sem triggers PG, sem fila. Fire-and-forget com try/catch (RN-06: falha nao-bloqueante) |
| `setPermission` existente retorna void, precisamos do `permission_id` | Nova funcao `grantFolderPermission` que retorna `{ permissionId }` usando `fields=id` |
| `people.email` como fonte do email (nao `profiles.email`) | `job_team.person_id` referencia `people(id)`, e `people.email` e o campo preenchido para freelancers/equipe |
| Processar sequencialmente com 200ms delay | Respeita rate limit Drive API (RN-09) sem complexidade de batching |
| `sendNotification: false` na Drive API | Evita email do Google ao compartilhar (fora de escopo, spec item 7) |

---

## 1. Migration - Tabela `job_drive_permissions`

**Arquivo:** `supabase/migrations/YYYYMMDD_create_job_drive_permissions.sql`

```sql
SET search_path = public;

CREATE TABLE IF NOT EXISTS job_drive_permissions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_team_id           UUID        NOT NULL REFERENCES job_team(id) ON DELETE CASCADE,
  person_id             UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  email                 TEXT        NOT NULL,
  folder_key            TEXT        NOT NULL,
  drive_folder_id       UUID        NOT NULL REFERENCES drive_folders(id) ON DELETE CASCADE,
  google_drive_id       TEXT        NOT NULL,
  drive_role            TEXT        NOT NULL,
  drive_permission_id   TEXT,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  revoked_by            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- drive_role e 'writer' ou 'reader' (Drive API)
  CONSTRAINT chk_jdp_drive_role CHECK (drive_role IN ('writer', 'reader')),

  -- Uma permissao ativa por pessoa+pasta por job (evita duplicatas)
  -- Permissoes revogadas (revoked_at IS NOT NULL) nao contam
  CONSTRAINT uq_jdp_active_permission
    UNIQUE NULLS NOT DISTINCT (job_id, person_id, folder_key, revoked_at)
);

COMMENT ON TABLE job_drive_permissions IS 'Rastreabilidade de permissoes Google Drive concedidas a membros de jobs.';
COMMENT ON COLUMN job_drive_permissions.drive_permission_id IS 'ID retornado pela Drive API permissions.create. Usado para revogar.';
COMMENT ON COLUMN job_drive_permissions.drive_role IS 'Nivel de permissao no Drive: writer ou reader';
COMMENT ON COLUMN job_drive_permissions.error_message IS 'Mensagem de erro se a concessao/revogacao falhou no Drive';

-- Indices
CREATE INDEX IF NOT EXISTS idx_jdp_tenant_id ON job_drive_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jdp_job_id ON job_drive_permissions(job_id);
CREATE INDEX IF NOT EXISTS idx_jdp_job_team_id ON job_drive_permissions(job_team_id);
CREATE INDEX IF NOT EXISTS idx_jdp_person_id ON job_drive_permissions(person_id);
CREATE INDEX IF NOT EXISTS idx_jdp_active
  ON job_drive_permissions(job_id, person_id)
  WHERE revoked_at IS NULL;

-- RLS (padrao tenant_id)
ALTER TABLE job_drive_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jdp_select_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_select_tenant" ON job_drive_permissions
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_insert_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_insert_tenant" ON job_drive_permissions
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_update_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_update_tenant" ON job_drive_permissions
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_delete_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_delete_tenant" ON job_drive_permissions
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Grants
GRANT ALL ON job_drive_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_drive_permissions TO authenticated;
```

**Campos e justificativas:**

| Campo | Por que |
|-------|---------|
| `job_team_id` | Vincula a permissao ao membro especifico; permite revogar tudo de um membro de uma vez |
| `person_id` | Desnormalizacao para queries rapidas (evita JOIN com job_team) |
| `email` | Snapshot do email no momento da concessao (se o email mudar no people, rastreamos o que foi usado) |
| `folder_key` | Identifica qual pasta de nivel 1 recebeu a permissao (ex: 'financeiro', 'root') |
| `drive_folder_id` | FK para drive_folders, garante integridade referencial |
| `google_drive_id` | ID da pasta no Drive (desnormalizacao para nao precisar JOIN na hora de revogar) |
| `drive_permission_id` | Retornado pela Drive API, necessario para `permissions.delete` (RN-04) |
| `granted_by` / `revoked_by` | Auditoria: quem fez a acao |
| `revoked_at` | NULL = ativa, preenchido = revogada. Soft-delete de permissao |
| `error_message` | Se a chamada ao Drive falhou, registra o motivo (debug) |

**Nota sobre UNIQUE constraint:** Usamos `UNIQUE NULLS NOT DISTINCT` para que so exista uma permissao ativa (revoked_at IS NULL) por combinacao job+pessoa+pasta. Permissoes revogadas (com revoked_at preenchido) ficam como historico. Se o PostgreSQL da instancia nao suportar `NULLS NOT DISTINCT` (requer PG 15+), substituir por um partial unique index:

```sql
-- Alternativa PG < 15:
CREATE UNIQUE INDEX IF NOT EXISTS uq_jdp_active_permission_partial
  ON job_drive_permissions(job_id, person_id, folder_key)
  WHERE revoked_at IS NULL;
```

---

## 2. Mapa de Permissoes Default

**Arquivo:** `supabase/functions/_shared/drive-permission-map.ts`

O mapa define: para cada `role` do `job_team`, quais `folder_key` recebem qual nivel de acesso.

```typescript
// Tipos
export type DrivePermissionLevel = 'writer' | 'reader';

export interface FolderPermissionEntry {
  folder_key: string;
  drive_role: DrivePermissionLevel;
}

// Tipo do role no contexto de permissoes Drive
// Inclui roles que nao estao no TEAM_ROLES mas estao no mapa (admin, ceo, financeiro)
// O mapeamento team_role -> drive_permission_role e feito na funcao resolvePermissionRole()
export type DrivePermissionRole =
  | 'admin'
  | 'ceo'
  | 'produtor_executivo'
  | 'diretor'
  | 'assistente_direcao'
  | 'financeiro'
  | 'editor'
  | 'freelancer';

// Mapa default: role -> lista de (folder_key, drive_role)
// Baseado na tabela da spec 01-pm-spec.md secao 3
export const DEFAULT_PERMISSION_MAP: Record<DrivePermissionRole, FolderPermissionEntry[]> = {
  admin: [
    { folder_key: 'root', drive_role: 'writer' },
  ],
  ceo: [
    { folder_key: 'root', drive_role: 'writer' },
  ],
  produtor_executivo: [
    { folder_key: 'root', drive_role: 'writer' },
  ],
  diretor: [
    { folder_key: 'documentos',       drive_role: 'writer' },
    { folder_key: 'monstro_pesquisa', drive_role: 'writer' },
    { folder_key: 'cronograma',       drive_role: 'writer' },
    { folder_key: 'fornecedores',     drive_role: 'writer' },
    { folder_key: 'clientes',         drive_role: 'writer' },
    { folder_key: 'pos_producao',     drive_role: 'writer' },
    { folder_key: 'atendimento',      drive_role: 'reader' },
  ],
  assistente_direcao: [
    { folder_key: 'documentos',       drive_role: 'writer' },
    { folder_key: 'monstro_pesquisa', drive_role: 'writer' },
    { folder_key: 'cronograma',       drive_role: 'writer' },
    { folder_key: 'fornecedores',     drive_role: 'writer' },
    { folder_key: 'clientes',         drive_role: 'reader' },
    { folder_key: 'pos_producao',     drive_role: 'writer' },
    { folder_key: 'atendimento',      drive_role: 'reader' },
  ],
  financeiro: [
    { folder_key: 'documentos',  drive_role: 'reader' },
    { folder_key: 'financeiro',  drive_role: 'writer' },
    { folder_key: 'cronograma',  drive_role: 'reader' },
    { folder_key: 'contratos',   drive_role: 'reader' },
    { folder_key: 'fornecedores', drive_role: 'reader' },
    { folder_key: 'clientes',    drive_role: 'reader' },
  ],
  editor: [
    { folder_key: 'documentos',       drive_role: 'reader' },
    { folder_key: 'monstro_pesquisa', drive_role: 'reader' },
    { folder_key: 'cronograma',       drive_role: 'reader' },
    { folder_key: 'pos_producao',     drive_role: 'writer' },
  ],
  freelancer: [
    { folder_key: 'documentos',   drive_role: 'reader' },
    { folder_key: 'cronograma',   drive_role: 'reader' },
    { folder_key: 'pos_producao', drive_role: 'writer' },
  ],
};
```

**Funcao de resolucao de role:**

```typescript
// Mapeia team_role do banco para DrivePermissionRole
// Roles nao mapeados caem em 'freelancer' (acesso minimo)
export function resolvePermissionRole(teamRole: string): DrivePermissionRole { ... }

// Carrega mapa do tenant (se customizado) ou retorna default
export async function getPermissionMap(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<Record<DrivePermissionRole, FolderPermissionEntry[]>> { ... }
```

**Mapeamento `team_role` -> `DrivePermissionRole`:**

| team_role (banco) | DrivePermissionRole |
|---|---|
| `diretor` | `diretor` |
| `produtor_executivo` | `produtor_executivo` |
| `coordenador_producao` | `produtor_executivo` |
| `editor`, `colorista`, `motion_designer` | `editor` |
| `diretor_arte`, `figurinista` | `assistente_direcao` |
| `dop`, `primeiro_assistente` | `assistente_direcao` |
| `gaffer`, `som_direto`, `maquiador` | `freelancer` |
| `produtor_casting`, `produtor_locacao` | `freelancer` |
| `outro` | `freelancer` |

**Nota:** `admin` e `ceo` nao sao `team_role` (sao roles do JWT/profile). Quando o admin invoca o handler, o `role` do membro no `job_team` e que e usado para o mapa, nao o role do JWT.

---

## 3. Novas Funcoes em `google-drive-client.ts`

### 3.1 `grantFolderPermission`

Wrapper da Drive API `permissions.create` que **retorna o permission_id**.

```typescript
export interface GrantPermissionResult {
  permissionId: string;
}

export async function grantFolderPermission(
  token: string,
  folderId: string,
  email: string,
  role: 'writer' | 'reader',
  opts?: DriveOptions,
): Promise<GrantPermissionResult>
```

**Diferenca de `setPermission` existente:**
- `setPermission` nao retorna nada (void) e silencia erros (log only)
- `grantFolderPermission` retorna `{ permissionId }`, lanca erro em falha
- Usa `fields=id` no URL para obter o `permissionId` do response
- Inclui `sendNotificationEmail=false` para nao enviar email do Google

**Implementacao (pseudo):**
```
POST /drive/v3/files/{folderId}/permissions?fields=id&sendNotificationEmail=false
Body: { type: "user", role: role, emailAddress: email }
Response: { id: "1234567890" } -> retorna como permissionId
```

### 3.2 `revokeFolderPermission`

Wrapper da Drive API `permissions.delete`.

```typescript
export async function revokeFolderPermission(
  token: string,
  folderId: string,
  permissionId: string,
  opts?: DriveOptions,
): Promise<boolean>
```

**Implementacao (pseudo):**
```
DELETE /drive/v3/files/{folderId}/permissions/{permissionId}
Response: 204 No Content -> true
Erro: false (com log)
```

### 3.3 `listFolderPermissions` (auxiliar para re-sync)

Wrapper da Drive API `permissions.list` para obter estado atual.

```typescript
export interface DrivePermissionInfo {
  id: string;          // permissionId no Drive
  emailAddress: string;
  role: string;
  type: string;        // 'user', 'anyone', etc.
}

export async function listFolderPermissions(
  token: string,
  folderId: string,
  opts?: DriveOptions,
): Promise<DrivePermissionInfo[]>
```

**Uso:** Apenas no handler de re-sync para calcular delta (estado esperado vs atual).

---

## 4. Novos Handlers em `drive-integration`

### 4.1 Rotas adicionais no `index.ts`

Adicionar ao switch do `drive-integration/index.ts`:

```
POST   /:jobId/sync-permissions       -> syncPermissions(req, auth, jobId)
POST   /:jobId/grant-member-permissions -> grantMemberPermissions(req, auth, jobId)
POST   /:jobId/revoke-member-permissions -> revokeMemberPermissions(req, auth, jobId)
GET    /:jobId/permissions             -> listPermissions(req, auth, jobId)
```

**Roles permitidos:**
- `sync-permissions`: admin, ceo
- `grant-member-permissions`: admin, ceo, produtor_executivo
- `revoke-member-permissions`: admin, ceo, produtor_executivo
- `permissions` (GET): qualquer usuario autenticado do tenant

---

### 4.2 Handler: `grant-member-permissions.ts`

**Arquivo:** `supabase/functions/drive-integration/handlers/grant-member-permissions.ts`

```typescript
export async function grantMemberPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response>
```

**Request body (Zod schema):**
```typescript
const GrantMemberPermissionsSchema = z.object({
  job_team_id: z.string().uuid(),
});
```

**Fluxo:**
1. Buscar membro em `job_team` (validar `is deleted_at IS NULL`)
2. Buscar `people.email` via `person_id`
3. Validar email (deve conter `@gmail.com` ou ser Google Workspace; warning se nao)
4. Verificar se Drive esta habilitado no tenant (RN-10)
5. Carregar `permission_map` (tenant override ou default)
6. Resolver `DrivePermissionRole` do membro via `resolvePermissionRole(member.role)`
7. Buscar `drive_folders` do job (folder_key -> google_drive_id)
8. Para cada entrada no mapa para o role:
   a. Verificar se ja existe permissao ativa em `job_drive_permissions` (idempotencia, RN-05)
   b. Se nao existe: chamar `grantFolderPermission()` no Drive
   c. Inserir registro em `job_drive_permissions` com `drive_permission_id`
   d. Se a chamada ao Drive falhou: inserir registro com `error_message` (sem `drive_permission_id`)
   e. `await delay(200)` entre chamadas (rate limit, RN-09)
9. Retornar resumo

**Response:**
```json
{
  "data": {
    "job_team_id": "uuid",
    "person_name": "Joao Silva",
    "email": "joao@gmail.com",
    "role": "diretor",
    "permissions_granted": 7,
    "permissions_skipped": 0,
    "permissions_failed": 0,
    "details": [
      { "folder_key": "documentos", "drive_role": "writer", "status": "granted" },
      { "folder_key": "financeiro", "drive_role": "reader", "status": "skipped_existing" }
    ]
  },
  "warnings": []
}
```

---

### 4.3 Handler: `revoke-member-permissions.ts`

**Arquivo:** `supabase/functions/drive-integration/handlers/revoke-member-permissions.ts`

```typescript
export async function revokeMemberPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response>
```

**Request body (Zod schema):**
```typescript
const RevokeMemberPermissionsSchema = z.object({
  job_team_id: z.string().uuid(),
});
```

**Fluxo:**
1. Buscar todas permissoes ativas em `job_drive_permissions` WHERE `job_team_id = X AND revoked_at IS NULL`
2. Para cada permissao:
   a. Se `drive_permission_id` existe: chamar `revokeFolderPermission()` no Drive
   b. Atualizar registro: `revoked_at = now(), revoked_by = auth.userId`
   c. Se a chamada ao Drive falhou: atualizar `error_message` mas ainda marcar `revoked_at`
   d. `await delay(200)` entre chamadas
3. Retornar resumo

**Response:**
```json
{
  "data": {
    "job_team_id": "uuid",
    "permissions_revoked": 5,
    "permissions_failed": 0
  }
}
```

---

### 4.4 Handler: `sync-permissions.ts`

**Arquivo:** `supabase/functions/drive-integration/handlers/sync-permissions.ts`

```typescript
export async function syncPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response>
```

**Request body:** nenhum (POST sem body)

**Fluxo (re-sync completo, idempotente, RN-05):**
1. Verificar Drive habilitado no tenant
2. Carregar `permission_map` (tenant override ou default)
3. Buscar todos os membros ativos de `job_team` (WHERE `job_id = X AND deleted_at IS NULL`)
4. Buscar `drive_folders` do job
5. Buscar todas `job_drive_permissions` ativas do job (WHERE `revoked_at IS NULL`)
6. **Calcular estado esperado** (expected): para cada membro ativo, gerar lista de (person_id, folder_key, drive_role) baseado no mapa
7. **Calcular delta:**
   a. **Grant faltantes:** entries em expected que nao existem em ativas
   b. **Revoke excedentes:** entries em ativas que nao existem em expected (membro removido ou role mudou)
8. Executar grants e revokes (sequencial com delay)
9. Retornar resumo

**Response:**
```json
{
  "data": {
    "grants_added": 3,
    "permissions_revoked": 1,
    "unchanged": 12,
    "errors": [],
    "total_members": 5,
    "total_permissions": 15
  }
}
```

**Nota sobre CA-04:** Se tudo estiver correto, retorna `{ grants_added: 0, permissions_revoked: 0, unchanged: N }`.

---

### 4.5 Handler: `list-permissions.ts`

**Arquivo:** `supabase/functions/drive-integration/handlers/list-permissions.ts`

```typescript
export async function listPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response>
```

**Request body:** nenhum (GET)

**Fluxo:**
1. Validar que o job pertence ao tenant
2. Buscar `job_drive_permissions` WHERE `job_id = X`
3. Agrupar por `job_team_id` com dados do membro (JOIN people para full_name)
4. Retornar lista

**Response:**
```json
{
  "data": {
    "members": [
      {
        "job_team_id": "uuid",
        "person_id": "uuid",
        "person_name": "Maria Santos",
        "email": "maria@gmail.com",
        "role": "financeiro",
        "permissions": [
          {
            "id": "uuid",
            "folder_key": "financeiro",
            "drive_role": "writer",
            "drive_permission_id": "12345",
            "granted_at": "2026-03-05T10:00:00Z",
            "revoked_at": null
          }
        ]
      }
    ],
    "meta": {
      "total_members": 3,
      "total_active_permissions": 15
    }
  }
}
```

**Query param opcional:** `?active_only=true` (default: true) filtra apenas `revoked_at IS NULL`. Passar `?active_only=false` para incluir historico.

---

## 5. Integracao com `jobs-team` Handlers

**Principio:** fire-and-forget com try/catch. Falha no Drive nao bloqueia a operacao no job_team (RN-06, CA-05).

### 5.1 Modificacao em `add-member.ts`

Apos o passo 7 (registrar historico), adicionar:

```typescript
// 8. Conceder permissoes Drive (fire-and-forget)
try {
  await grantDrivePermissionsForMember(auth, jobId, member.id);
} catch (driveErr) {
  console.warn(`[jobs-team] Falha ao conceder permissoes Drive: ${driveErr}`);
  warnings.push({
    code: 'DRIVE_PERMISSIONS_FAILED',
    message: 'Permissoes Drive nao puderam ser concedidas automaticamente',
  });
}
```

**Funcao auxiliar (novo arquivo `_shared/drive-permissions-helper.ts`):**

```typescript
// Chamada interna — nao faz HTTP request, chama a logica diretamente
export async function grantDrivePermissionsForMember(
  auth: AuthContext,
  jobId: string,
  jobTeamId: string,
): Promise<{ granted: number; failed: number }>

export async function revokeDrivePermissionsForMember(
  auth: AuthContext,
  jobId: string,
  jobTeamId: string,
): Promise<{ revoked: number; failed: number }>
```

Essa funcao encapsula toda a logica de:
- Verificar se Drive esta habilitado no tenant
- Buscar email do membro
- Resolver mapa de permissoes
- Buscar folders do job
- Chamar grantFolderPermission/revokeFolderPermission
- Inserir/atualizar registros em job_drive_permissions

Assim tanto os handlers de `drive-integration` quanto os de `jobs-team` usam a mesma logica.

### 5.2 Modificacao em `remove-member.ts`

Apos o passo 2b (cascade soft-delete allocations), adicionar:

```typescript
// 2c. Revogar permissoes Drive (fire-and-forget)
try {
  await revokeDrivePermissionsForMember(auth, jobId, memberId);
} catch (driveErr) {
  console.warn(`[jobs-team] Falha ao revogar permissoes Drive: ${driveErr}`);
}
```

### 5.3 Modificacao em `update-member.ts`

Apenas quando o `role` muda (passo 5 ja executou o update):

```typescript
// 5b. Se role mudou, re-sync permissoes Drive
if (validated.role !== undefined && validated.role !== current.role) {
  try {
    await revokeDrivePermissionsForMember(auth, jobId, memberId);
    await grantDrivePermissionsForMember(auth, jobId, memberId);
  } catch (driveErr) {
    console.warn(`[jobs-team] Falha ao re-sync permissoes Drive: ${driveErr}`);
    warnings.push({
      code: 'DRIVE_PERMISSIONS_FAILED',
      message: 'Permissoes Drive nao puderam ser atualizadas apos mudanca de papel',
    });
  }
}
```

---

## 6. Tipo TypeScript para `job_drive_permissions`

**Arquivo:** Adicionar em `_shared/types.ts`

```typescript
export interface JobDrivePermissionRow {
  id: string;
  tenant_id: string;
  job_id: string;
  job_team_id: string;
  person_id: string;
  email: string;
  folder_key: string;
  drive_folder_id: string;
  google_drive_id: string;
  drive_role: 'writer' | 'reader';
  drive_permission_id: string | null;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  error_message: string | null;
  created_at: string;
}
```

---

## 7. Validacao de Email Google (RN-02)

**Funcao auxiliar em `drive-permissions-helper.ts`:**

```typescript
// Verifica se o email parece ser Google (Gmail ou Workspace)
// Regra simples: aceita qualquer email (Google Workspace pode ser qualquer dominio)
// Mas rejeita emails sabidamente nao-Google: hotmail, outlook, yahoo, icloud
export function isLikelyGoogleEmail(email: string): boolean
```

**Nota pragmatica:** Como Google Workspace pode usar qualquer dominio (ex: `joao@ellahfilmes.com`), nao ha como validar 100%. A funcao apenas rejeita providers sabidamente incompativeis e loga warning para emails suspeitos. O Drive API retornara erro 400 se o email nao for uma conta Google valida, e esse erro sera capturado em `error_message`.

---

## 8. Diagrama de Fluxo

```
                    jobs-team/add-member
                           |
                           v
              grantDrivePermissionsForMember()
                           |
              +------------+------------+
              |                         |
        Drive desabilitado?        Drive habilitado
              |                         |
           return                  Resolver role
                                       |
                                  Carregar mapa
                                       |
                                  Buscar folders
                                       |
                              Para cada folder_key:
                                       |
                          +------ Ja existe? ----+
                          |                      |
                        skip              grantFolderPermission()
                                                 |
                                     +--------+--------+
                                     |                  |
                                  sucesso            falha
                                     |                  |
                              INSERT jdp         INSERT jdp
                              (com perm_id)      (com error_msg)
```

---

## 9. Estimativa de Esforco

| # | Tarefa | Complexidade | Tempo |
|---|--------|-------------|-------|
| 1 | Migration `job_drive_permissions` | Baixa | 20min |
| 2 | `drive-permission-map.ts` (constante + resolveRole + getPermissionMap) | Baixa | 30min |
| 3 | `grantFolderPermission` + `revokeFolderPermission` + `listFolderPermissions` em google-drive-client.ts | Media | 40min |
| 4 | `drive-permissions-helper.ts` (logica core compartilhada) | Alta | 1h |
| 5 | Handler `grant-member-permissions.ts` | Media | 30min |
| 6 | Handler `revoke-member-permissions.ts` | Media | 30min |
| 7 | Handler `sync-permissions.ts` | Alta | 1h |
| 8 | Handler `list-permissions.ts` | Baixa | 20min |
| 9 | Rotas no `drive-integration/index.ts` | Baixa | 10min |
| 10 | Integracao nos handlers `jobs-team` (add/remove/update) | Media | 40min |
| 11 | Tipo `JobDrivePermissionRow` em types.ts | Baixa | 5min |
| 12 | Testes manuais (grant, revoke, re-sync, role change) | Media | 30min |
| **Total** | | | **~5.5h** |

---

## 10. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|----------|
| Rate limit Drive API (300 requests/min/user) | Permissoes falham | Delay 200ms entre chamadas + retry com backoff (ja existe `driveFetchWithRetry`) |
| Email nao e conta Google | Permissao falha silenciosamente | Registrar em `error_message`, retornar no response como warning |
| Service Account sem permissao na pasta | 403 do Drive | Verificar antes via `listFolderPermissions`; erro capturado e registrado |
| `UNIQUE NULLS NOT DISTINCT` requer PG 15+ | Migration falha | Alternativa com partial unique index documentada na secao 1 |
| Membro adicionado antes do Drive estar criado | Nenhuma pasta para conceder | Verificar se `drive_folders` existe; se nao, skip silencioso com warning |

---

## 11. Arquivos Criados/Modificados (Resumo)

**Novos:**
- `supabase/migrations/YYYYMMDD_create_job_drive_permissions.sql`
- `supabase/functions/_shared/drive-permission-map.ts`
- `supabase/functions/_shared/drive-permissions-helper.ts`
- `supabase/functions/drive-integration/handlers/grant-member-permissions.ts`
- `supabase/functions/drive-integration/handlers/revoke-member-permissions.ts`
- `supabase/functions/drive-integration/handlers/sync-permissions.ts`
- `supabase/functions/drive-integration/handlers/list-permissions.ts`

**Modificados:**
- `supabase/functions/_shared/google-drive-client.ts` (+3 funcoes)
- `supabase/functions/_shared/types.ts` (+1 interface, +1 const)
- `supabase/functions/drive-integration/index.ts` (+4 rotas)
- `supabase/functions/jobs-team/handlers/add-member.ts` (+try/catch grant)
- `supabase/functions/jobs-team/handlers/remove-member.ts` (+try/catch revoke)
- `supabase/functions/jobs-team/handlers/update-member.ts` (+try/catch re-sync)

**Total:** 7 arquivos novos, 6 arquivos modificados. Zero refatoracao de codigo existente.
