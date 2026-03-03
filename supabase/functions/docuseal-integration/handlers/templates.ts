import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { listTemplates } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Tipo de contrato suportado para classificacao por naming convention
export type ContractTemplateType = 'elenco' | 'tecnico' | 'pj';

// Template classificado retornado pela API
export interface ClassifiedTemplate {
  id: number;
  name: string;
  type: ContractTemplateType | null;
  fields: Array<{ name: string; type: string }>;
}

// Palavras-chave para classificar templates por nome
const TEMPLATE_KEYWORDS: Record<ContractTemplateType, string[]> = {
  elenco: ['elenco', 'ator', 'atriz', 'casting', 'cast'],
  tecnico: ['tecnico', 'tecnica', 'equipe', 'crew', 'staff'],
  pj: ['pj', 'pessoa juridica', 'cnpj', 'empresa'],
};

// Classifica um template pelo nome usando as palavras-chave definidas
function classifyTemplate(name: string): ContractTemplateType | null {
  const lowerName = name.toLowerCase();

  for (const [type, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      return type as ContractTemplateType;
    }
  }

  return null;
}

export async function templatesHandler(req: Request, auth: AuthContext): Promise<Response> {
  const serviceClient = getServiceClient();

  console.log(`[templates] user=${auth.userId} tenant=${auth.tenantId} — listando templates DocuSeal`);

  let rawTemplates;
  try {
    rawTemplates = await listTemplates(serviceClient, auth.tenantId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[templates] falha ao listar templates no DocuSeal: ${msg}`);
    throw new AppError('INTERNAL_ERROR', `Falha ao buscar templates DocuSeal: ${msg}`, 502);
  }

  // Classificar cada template por tipo baseado no naming convention
  const classified: ClassifiedTemplate[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    type: classifyTemplate(t.name),
    fields: t.fields ?? [],
  }));

  // Ordenar: primeiro os classificados (por tipo), depois os sem tipo
  classified.sort((a, b) => {
    if (a.type && !b.type) return -1;
    if (!a.type && b.type) return 1;
    return a.name.localeCompare(b.name);
  });

  console.log(
    `[templates] ${classified.length} template(s) retornado(s). tipos: ${classified.map((t) => `${t.name}=${t.type ?? 'outros'}`).join(', ')}`,
  );

  return success({
    templates: classified,
    total: classified.length,
  });
}
