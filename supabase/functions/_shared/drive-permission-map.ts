import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Drive Permission Map — Mapa de permissoes por papel de equipe
// ============================================================

// Nivel de permissao no Google Drive
export type DrivePermissionLevel = 'writer' | 'reader';

// Entrada no mapa: qual pasta recebe qual nivel de acesso
export interface FolderPermissionEntry {
  folder_key: string;
  drive_role: DrivePermissionLevel;
}

// Role no contexto de permissoes Drive.
// Inclui roles que nao estao no TEAM_ROLES do banco (admin, ceo, financeiro)
// mas que existem no mapa de permissoes.
// O mapeamento team_role -> DrivePermissionRole e feito por resolvePermissionRole().
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
// Baseado na tabela da spec 01-pm-spec.md secao 3.
// Pode ser sobrescrito por tenant via settings.integrations.google_drive.permission_map.
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
    { folder_key: 'documentos',   drive_role: 'reader' },
    { folder_key: 'financeiro',   drive_role: 'writer' },
    { folder_key: 'cronograma',   drive_role: 'reader' },
    { folder_key: 'contratos',    drive_role: 'reader' },
    { folder_key: 'fornecedores', drive_role: 'reader' },
    { folder_key: 'clientes',     drive_role: 'reader' },
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

// Mapeia o team_role do banco para DrivePermissionRole.
// Roles nao mapeados caem em 'freelancer' (acesso minimo, principio do menor privilegio).
//
// Tabela de mapeamento:
//   diretor                         -> diretor
//   produtor_executivo              -> produtor_executivo
//   coordenador_producao            -> produtor_executivo
//   editor, colorista, motion_designer -> editor
//   diretor_arte, figurinista       -> assistente_direcao
//   dop, primeiro_assistente        -> assistente_direcao
//   gaffer, som_direto, maquiador   -> freelancer
//   produtor_casting, produtor_locacao -> freelancer
//   outro                           -> freelancer
export function resolvePermissionRole(teamRole: string): DrivePermissionRole {
  switch (teamRole) {
    case 'diretor':
      return 'diretor';

    case 'produtor_executivo':
    case 'coordenador_producao':
      return 'produtor_executivo';

    case 'editor':
    case 'colorista':
    case 'motion_designer':
      return 'editor';

    case 'diretor_arte':
    case 'figurinista':
    case 'dop':
    case 'primeiro_assistente':
      return 'assistente_direcao';

    case 'gaffer':
    case 'som_direto':
    case 'maquiador':
    case 'produtor_casting':
    case 'produtor_locacao':
    case 'outro':
    default:
      return 'freelancer';
  }
}

// Carrega o mapa de permissoes do tenant.
// Se o tenant tiver um mapa customizado em
// settings.integrations.google_drive.permission_map, retorna esse mapa.
// Caso contrario, retorna DEFAULT_PERMISSION_MAP.
export async function getPermissionMap(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<Record<DrivePermissionRole, FolderPermissionEntry[]>> {
  try {
    const { data: tenant, error } = await serviceClient
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.warn(`[drive-permission-map] Falha ao carregar settings do tenant ${tenantId}: ${error?.message} — usando mapa default`);
      return DEFAULT_PERMISSION_MAP;
    }

    const settings = (tenant.settings as Record<string, unknown>) || {};
    const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
    const driveConfig = integrations['google_drive'] || {};
    const customMap = driveConfig.permission_map as Record<DrivePermissionRole, FolderPermissionEntry[]> | undefined;

    if (customMap && typeof customMap === 'object' && Object.keys(customMap).length > 0) {
      console.log(`[drive-permission-map] Usando mapa customizado do tenant ${tenantId}`);
      return customMap;
    }

    return DEFAULT_PERMISSION_MAP;
  } catch (err) {
    console.warn(`[drive-permission-map] Erro inesperado ao carregar mapa: ${err} — usando mapa default`);
    return DEFAULT_PERMISSION_MAP;
  }
}
