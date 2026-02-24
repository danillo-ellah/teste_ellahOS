// System prompts versionados para a feature de Estimativa de Orcamento AI.
// Mudancas no prompt = novo deploy da Edge Function.
// Versao atual: v1

import { sanitizeUserInput } from './_shared/claude-client.ts';

export const BUDGET_ESTIMATE_SYSTEM_PROMPT = `Voce e um produtor executivo senior especializado em orcamentos de producao audiovisual no Brasil. Sua tarefa e analisar os dados de um novo job e, com base no historico de jobs similares da produtora, sugerir um orcamento detalhado.

REGRAS:
- Responda APENAS em JSON valido, seguindo o schema fornecido em <output_format>
- Base suas sugestoes nos jobs similares fornecidos, NAO em conhecimento externo
- Se houver poucos dados historicos (menos de 3 jobs similares), defina confidence como "low"
- Valores em BRL (reais brasileiros)
- Inclua breakdown por categoria: pre_production, production, post_production, talent, equipment, locations, other
- Se o tipo de projeto for raro no historico, avise no campo warnings
- Nunca sugira valores acima do budget_ceiling informado (se fornecido)
- Considere inflacao: jobs mais antigos que 12 meses devem ter valores ajustados em ~5%
- Se todos os jobs similares tiverem valores muito discrepantes entre si (desvio > 50%), avise nos warnings
- Arredonde valores para multiplos de R$ 500 (ex: R$ 47.500, nao R$ 47.283,21)
- O breakdown deve somar o total (tolerancia de R$ 100)

<output_format>
{
  "suggested_budget": {
    "total": number,
    "breakdown": {
      "pre_production": number,
      "production": number,
      "post_production": number,
      "talent": number,
      "equipment": number,
      "locations": number,
      "other": number
    },
    "confidence": "high" | "medium" | "low",
    "confidence_explanation": "string explicando o nivel de confianca"
  },
  "reasoning": "string com 2-3 paragrafos explicando a logica do orcamento",
  "warnings": ["string com avisos relevantes"]
}
</output_format>`;

// Versao do prompt (para tracking em logs)
export const BUDGET_PROMPT_VERSION = 'v1';

// Monta o user prompt com os dados do job e contexto RAG
export function buildBudgetUserPrompt(params: {
  jobTitle: string;
  jobCode: string;
  projectType: string;
  clientSegment: string | null;
  complexityLevel: string | null;
  briefingText: string | null;
  tags: string[];
  mediaType: string | null;
  deliverables: Array<{ description: string; format: string | null }>;
  shootingDates: Array<{ date: string; location: string | null }>;
  team: Array<{ role: string; rate: number | null }>;
  similarJobsTable: string;
  overrideContext?: {
    additional_requirements?: string;
    reference_jobs?: string[];
    budget_ceiling?: number;
  };
}): string {
  const lines: string[] = [];

  lines.push('## Job a ser orcado');
  lines.push(`- **Titulo:** ${params.jobTitle} (${params.jobCode})`);
  lines.push(`- **Tipo:** ${params.projectType}`);
  if (params.clientSegment) lines.push(`- **Segmento do cliente:** ${params.clientSegment}`);
  if (params.complexityLevel) lines.push(`- **Complexidade:** ${params.complexityLevel}`);
  if (params.mediaType) lines.push(`- **Midia:** ${params.mediaType}`);
  if (params.tags.length > 0) lines.push(`- **Tags:** ${params.tags.join(', ')}`);

  if (params.briefingText) {
    lines.push('');
    lines.push('### Briefing');
    const sanitizedBriefing = sanitizeUserInput(params.briefingText, 2000);
    lines.push('<user-input>');
    lines.push(sanitizedBriefing);
    lines.push('</user-input>');
  }

  if (params.deliverables.length > 0) {
    lines.push('');
    lines.push(`### Entregaveis (${params.deliverables.length})`);
    for (const d of params.deliverables) {
      lines.push(`- ${d.description}${d.format ? ` (${d.format})` : ''}`);
    }
  }

  if (params.shootingDates.length > 0) {
    lines.push('');
    lines.push(`### Diarias de filmagem (${params.shootingDates.length})`);
    for (const s of params.shootingDates) {
      lines.push(`- ${s.date}${s.location ? ` — ${s.location}` : ''}`);
    }
  }

  if (params.team.length > 0) {
    lines.push('');
    lines.push(`### Equipe prevista (${params.team.length})`);
    for (const t of params.team) {
      lines.push(`- ${t.role}${t.rate ? ` — R$ ${t.rate.toLocaleString('pt-BR')}` : ''}`);
    }
  }

  if (params.overrideContext) {
    lines.push('');
    lines.push('### Contexto adicional do usuario');
    if (params.overrideContext.additional_requirements) {
      lines.push(`- Requisitos adicionais: <user-input>${sanitizeUserInput(params.overrideContext.additional_requirements ?? '')}</user-input>`);
    }
    if (params.overrideContext.budget_ceiling) {
      lines.push(`- **Teto maximo: R$ ${params.overrideContext.budget_ceiling.toLocaleString('pt-BR')}** (NAO ultrapasse este valor)`);
    }
  }

  lines.push('');
  lines.push(params.similarJobsTable);

  lines.push('');
  lines.push('Com base nos dados acima, gere a estimativa de orcamento em JSON.');

  return lines.join('\n');
}

// Formata jobs similares como tabela texto para o prompt (economia de tokens)
export function formatSimilarJobsTable(
  jobs: Array<{
    code: string;
    project_type: string;
    client_segment: string | null;
    complexity_level: string | null;
    closed_value: number | null;
    production_cost: number | null;
    margin_percentage: number | null;
    deliverables_count: number;
    team_size: number;
    similarity_score: number;
    created_at: string;
  }>,
): string {
  if (jobs.length === 0) {
    return '## Jobs similares do historico\nNenhum job similar encontrado no historico. Defina confidence como "low".';
  }

  const lines: string[] = [];
  lines.push(`## Jobs similares do historico (${jobs.length} mais relevantes)`);
  lines.push('| # | Codigo | Tipo | Segmento | Complexidade | Valor Fechado | Custo Producao | Margem | Entregaveis | Equipe | Similaridade | Data |');
  lines.push('|---|--------|------|----------|-------------|---------------|----------------|--------|-------------|--------|-------------|------|');

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const valor = j.closed_value ? `R$ ${j.closed_value.toLocaleString('pt-BR')}` : 'N/A';
    const custo = j.production_cost ? `R$ ${j.production_cost.toLocaleString('pt-BR')}` : 'N/A';
    const margem = j.margin_percentage !== null ? `${j.margin_percentage.toFixed(1)}%` : 'N/A';
    const data = j.created_at ? j.created_at.split('T')[0] : 'N/A';

    lines.push(
      `| ${i + 1} | ${j.code} | ${j.project_type} | ${j.client_segment ?? '-'} | ${j.complexity_level ?? '-'} | ${valor} | ${custo} | ${margem} | ${j.deliverables_count} | ${j.team_size} | ${j.similarity_score}% | ${data} |`,
    );
  }

  return lines.join('\n');
}
