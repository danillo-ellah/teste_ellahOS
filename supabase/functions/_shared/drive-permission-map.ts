import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Drive Permission Map v4 — Mapa granular de permissoes por papel
// Aprovado pelo CEO em 06/03/2026 (31 perguntas sobre acesso).
// 30 pastas nivel 1 x 18 papeis.
// ============================================================

export type DrivePermissionLevel = 'writer' | 'reader';

export interface FolderPermissionEntry {
  folder_key: string;
  drive_role: DrivePermissionLevel;
}

// Todos os papeis com mapeamento de permissoes no Drive.
// Inclui papeis do enum team_role + papeis administrativos (admin/ceo).
export type DrivePermissionRole =
  | 'admin'
  | 'ceo'
  | 'cco'
  | 'produtor_executivo'
  | 'diretor_producao'
  | 'financeiro'
  | 'juridico'
  | 'atendimento'
  | 'diretor'
  | 'primeiro_assistente'
  | 'dop'
  | 'editor'
  | 'colorista'
  | 'motion_designer'
  | 'finalizador'
  | 'diretor_arte'
  | 'figurinista'
  | 'produtor_casting'
  | 'tecnico';

// Mapa default: role -> lista de (folder_key, drive_role)
// Baseado no mapa aprovado em roles-permissions-ellah.md.
// CEO e PE recebem writer na pasta raiz (herda tudo).
// Demais recebem permissoes granulares nas pastas nivel 1.
export const DEFAULT_PERMISSION_MAP: Record<DrivePermissionRole, FolderPermissionEntry[]> = {
  // === ADMIN / CEO — writer na raiz, herda tudo ===
  admin: [
    { folder_key: 'root', drive_role: 'writer' },
  ],
  ceo: [
    { folder_key: 'root', drive_role: 'writer' },
  ],

  // === PRODUTOR EXECUTIVO — writer na raiz, herda tudo ===
  produtor_executivo: [
    { folder_key: 'root', drive_role: 'writer' },
  ],

  // === CCO — vendas (W), cronograma (R), clientes (R), atendimento (R) ===
  // Quando faz papel de atendimento num job, PE da override
  cco: [
    { folder_key: 'roteiro_briefing', drive_role: 'reader' },
    { folder_key: 'cronograma',       drive_role: 'reader' },
    { folder_key: 'clientes',         drive_role: 'reader' },
    { folder_key: 'atendimento',      drive_role: 'reader' },
    { folder_key: 'vendas',           drive_role: 'writer' },
  ],

  // === DIRETOR DE PRODUCAO — gastos, comprovantes, notinhas, crono, alvara, clientes ===
  // NAO ve orcamento total, NFs, fechamento
  diretor_producao: [
    { folder_key: 'fin_gastos_gerais',  drive_role: 'reader' },
    { folder_key: 'fin_comprovantes',   drive_role: 'reader' },
    { folder_key: 'fin_notinhas',       drive_role: 'reader' },
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'alvara',             drive_role: 'reader' },
    { folder_key: 'forn_producao',      drive_role: 'writer' },
    { folder_key: 'clientes',           drive_role: 'reader' },
  ],

  // === FINANCEIRO — todas as pastas financeiras (W), contratos prod/equipe (R), docs produtora (R) ===
  financeiro: [
    { folder_key: 'docs_produtora',     drive_role: 'reader' },
    { folder_key: 'fin_orcamento',      drive_role: 'writer' },
    { folder_key: 'fin_decupado',       drive_role: 'writer' },
    { folder_key: 'fin_gastos_gerais',  drive_role: 'writer' },
    { folder_key: 'fin_nf_recebimento', drive_role: 'writer' },
    { folder_key: 'fin_comprovantes',   drive_role: 'writer' },
    { folder_key: 'fin_notinhas',       drive_role: 'writer' },
    { folder_key: 'fin_nf_final',       drive_role: 'writer' },
    { folder_key: 'fin_fechamento',     drive_role: 'writer' },
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'contrato_producao',  drive_role: 'reader' },
    { folder_key: 'contrato_equipe',    drive_role: 'reader' },
  ],

  // === JURIDICO — contratos (W), alvara (W) ===
  juridico: [
    { folder_key: 'contrato_producao', drive_role: 'writer' },
    { folder_key: 'contrato_equipe',   drive_role: 'writer' },
    { folder_key: 'contrato_elenco',   drive_role: 'writer' },
    { folder_key: 'alvara',            drive_role: 'writer' },
  ],

  // === ATENDIMENTO — coracao da produtora ===
  // Roteiro (W), decupado (R), monstro (R), crono (R), alvara (R),
  // clientes (W), pos trabalho (R), atendimento (W)
  atendimento: [
    { folder_key: 'roteiro_briefing', drive_role: 'writer' },
    { folder_key: 'fin_decupado',     drive_role: 'reader' },
    { folder_key: 'monstro_pesquisa', drive_role: 'reader' },
    { folder_key: 'cronograma',       drive_role: 'reader' },
    { folder_key: 'alvara',           drive_role: 'reader' },
    { folder_key: 'clientes',         drive_role: 'writer' },
    { folder_key: 'pos_pesquisa',     drive_role: 'reader' },
    { folder_key: 'pos_storyboard',   drive_role: 'reader' },
    { folder_key: 'pos_montagem',     drive_role: 'reader' },
    { folder_key: 'atendimento',      drive_role: 'writer' },
  ],

  // === DIRETOR DE CENA — criativo, NUNCA ve financeiro ===
  // Roteiro (W), monstro (W), crono (W), direcao (W), bruto (R), limpo (R),
  // pesquisa/story (R), montagem (W)
  diretor: [
    { folder_key: 'roteiro_briefing',   drive_role: 'writer' },
    { folder_key: 'monstro_pesquisa',   drive_role: 'writer' },
    { folder_key: 'cronograma',         drive_role: 'writer' },
    { folder_key: 'forn_direcao',       drive_role: 'writer' },
    { folder_key: 'pos_material_bruto', drive_role: 'reader' },
    { folder_key: 'pos_material_limpo', drive_role: 'reader' },
    { folder_key: 'pos_pesquisa',       drive_role: 'reader' },
    { folder_key: 'pos_storyboard',     drive_role: 'reader' },
    { folder_key: 'pos_montagem',       drive_role: 'writer' },
  ],

  // === 1a AD — mesmo acesso que diretor de cena ===
  primeiro_assistente: [
    { folder_key: 'roteiro_briefing',   drive_role: 'writer' },
    { folder_key: 'monstro_pesquisa',   drive_role: 'writer' },
    { folder_key: 'cronograma',         drive_role: 'writer' },
    { folder_key: 'forn_direcao',       drive_role: 'writer' },
  ],

  // === DOP — so cronograma ===
  // Pede cameras/luzes via dir. producao, recebe monstro via WhatsApp
  dop: [
    { folder_key: 'cronograma', drive_role: 'reader' },
  ],

  // === EDITOR — pos-producao completa (W), roteiro/monstro (R), crono (R) ===
  editor: [
    { folder_key: 'roteiro_briefing',   drive_role: 'reader' },
    { folder_key: 'monstro_pesquisa',   drive_role: 'reader' },
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'pos_material_bruto', drive_role: 'writer' },
    { folder_key: 'pos_material_limpo', drive_role: 'writer' },
    { folder_key: 'pos_pesquisa',       drive_role: 'writer' },
    { folder_key: 'pos_storyboard',     drive_role: 'writer' },
    { folder_key: 'pos_montagem',       drive_role: 'writer' },
  ],

  // === COLORISTA — bruto/limpo (W), pesquisa/story/montagem (W), crono (R) ===
  colorista: [
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'pos_material_bruto', drive_role: 'writer' },
    { folder_key: 'pos_material_limpo', drive_role: 'writer' },
    { folder_key: 'pos_pesquisa',       drive_role: 'writer' },
    { folder_key: 'pos_storyboard',     drive_role: 'writer' },
    { folder_key: 'pos_montagem',       drive_role: 'writer' },
  ],

  // === MOTION DESIGNER — limpo (W), pesquisa/story/montagem (W), crono (R) ===
  motion_designer: [
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'pos_material_limpo', drive_role: 'writer' },
    { folder_key: 'pos_pesquisa',       drive_role: 'writer' },
    { folder_key: 'pos_storyboard',     drive_role: 'writer' },
    { folder_key: 'pos_montagem',       drive_role: 'writer' },
  ],

  // === FINALIZADOR — organiza toda pos, entregas pro cliente ===
  finalizador: [
    { folder_key: 'cronograma',         drive_role: 'reader' },
    { folder_key: 'pos_material_bruto', drive_role: 'writer' },
    { folder_key: 'pos_material_limpo', drive_role: 'writer' },
    { folder_key: 'pos_pesquisa',       drive_role: 'writer' },
    { folder_key: 'pos_storyboard',     drive_role: 'writer' },
    { folder_key: 'pos_montagem',       drive_role: 'writer' },
  ],

  // === DIRETOR DE ARTE — monstro/artes (W), arte_pre (W), crono (R) ===
  diretor_arte: [
    { folder_key: 'monstro_pesquisa', drive_role: 'writer' },
    { folder_key: 'cronograma',       drive_role: 'reader' },
    { folder_key: 'forn_arte',        drive_role: 'writer' },
  ],

  // === FIGURINISTA — figurino_pre (W), crono (R) ===
  figurinista: [
    { folder_key: 'cronograma',    drive_role: 'reader' },
    { folder_key: 'forn_figurino', drive_role: 'writer' },
  ],

  // === PRODUTOR DE CASTING — contrato elenco (W), crono (R) ===
  produtor_casting: [
    { folder_key: 'cronograma',       drive_role: 'reader' },
    { folder_key: 'contrato_elenco',  drive_role: 'writer' },
  ],

  // === TECNICO (gaffer, som_direto, maquiador, produtor_locacao) ===
  // So cronograma (R) + ordem do dia no sistema
  tecnico: [
    { folder_key: 'cronograma', drive_role: 'reader' },
  ],
};

// Mapeia team_role do banco → DrivePermissionRole.
// Cada papel tem permissoes granulares individuais (nao agrupados como antes).
// Coordenador de producao = configuravel por job → default sem acesso Drive.
export function resolvePermissionRole(teamRole: string): DrivePermissionRole | null {
  switch (teamRole) {
    // Papeis com mapeamento direto
    case 'cco':                return 'cco';
    case 'produtor_executivo': return 'produtor_executivo';
    case 'diretor_producao':   return 'diretor_producao';
    case 'financeiro':         return 'financeiro';
    case 'juridico':           return 'juridico';
    case 'atendimento':        return 'atendimento';
    case 'diretor':            return 'diretor';
    case 'primeiro_assistente': return 'primeiro_assistente';
    case 'dop':                return 'dop';
    case 'editor':             return 'editor';
    case 'colorista':          return 'colorista';
    case 'motion_designer':    return 'motion_designer';
    case 'finalizador':        return 'finalizador';
    case 'diretor_arte':       return 'diretor_arte';
    case 'figurinista':        return 'figurinista';
    case 'produtor_casting':   return 'produtor_casting';

    // Tecnicos — acesso minimo (so cronograma)
    case 'gaffer':
    case 'som_direto':
    case 'maquiador':
    case 'produtor_locacao':
      return 'tecnico';

    // Coordenador de producao — acesso configuravel por job, default null (sem acesso Drive)
    case 'coordenador_producao':
      return null;

    // Desconhecido/outro — sem acesso Drive (seguranca: principio menor privilegio)
    case 'outro':
    default:
      return null;
  }
}

// Carrega o mapa de permissoes do tenant.
// Se o tenant tiver mapa customizado em settings.integrations.google_drive.permission_map,
// retorna esse mapa. Caso contrario, retorna DEFAULT_PERMISSION_MAP.
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
