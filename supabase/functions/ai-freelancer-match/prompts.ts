// System prompts versionados para a feature de Freelancer Match AI.
// Ranqueia freelancers candidatos para um job audiovisual usando Claude Sonnet.
// Mudancas no prompt = novo deploy da Edge Function.
// Versao atual: v1

import { sanitizeUserInput } from './_shared/claude-client.ts';

// --- Versao do prompt (para tracking em ai_usage_logs) ---
export const FREELANCER_PROMPT_VERSION = 'v1';

// --- Tipagem do input de matching ---

/** Dados completos enviados para o matching de freelancers */
export interface FreelancerMatchData {
  /** Dados do job que precisa de freelancer */
  job: {
    code: string;
    title: string;
    project_type: string;
    status: string;
    complexity_level: string | null;
    briefing_text: string | null;
  };
  /** Requisitos da vaga a ser preenchida */
  request: {
    role: string;
    requirements: string | null;
    max_rate: number | null;
    preferred_start: string | null;
    preferred_end: string | null;
  };
  /** Lista de candidatos com historico e disponibilidade */
  candidates: Array<{
    person_id: string;
    full_name: string;
    default_role: string;
    default_rate: number | null;
    is_internal: boolean;
    total_jobs: number;
    jobs_same_type: number;
    avg_health_score: number | null;
    last_job_date: string | null;
    conflicts: Array<{
      job_code: string;
      job_title: string;
      overlap_start: string;
      overlap_end: string;
    }>;
  }>;
}

// --- System Prompt ---

export const FREELANCER_SYSTEM_PROMPT = `Voce e um coordenador de producao audiovisual experiente, especializado em montar equipes para projetos de video, cinema, publicidade e conteudo digital no Brasil. Sua tarefa e analisar os candidatos freelancers disponveis e ranquea-los por adequacao ao job.

IDIOMA:
- Responda SEMPRE em portugues brasileiro
- Use terminologia tecnica de producao audiovisual (diretor de fotografia, assistente de camera, gaffer, produtor de campo, etc.)

REGRAS:
- Responda APENAS em JSON valido, seguindo o schema fornecido em <output_format>
- NUNCA invente dados que nao estejam presentes no contexto fornecido. Se uma informacao nao foi fornecida, nao presuma ou extrapole
- match_score: inteiro de 0 a 100, onde 100 = match perfeito
- match_reasons: minimo 2, maximo 4 razoes em portugues. Cada razao deve ser concreta e baseada nos dados fornecidos
- Ordene ranked_candidates por match_score decrescente
- Se nenhum candidato for minimamente adequado (todos com score < 20), retorne ranked_candidates como array vazio e explique no reasoning
- Maximo de 10 candidatos no output final (mesmo que mais sejam fornecidos, retorne apenas os 10 melhores)

CRITERIOS DE RANKING (em ordem de peso):
1. **Experiencia com mesmo tipo de projeto** (PESO ALTO) — candidatos que ja trabalharam em projetos do mesmo tipo (ex: publicidade, documentario, filme) devem ter score significativamente maior
2. **Disponibilidade** (PESO ALTO) — candidatos sem conflitos de alocacao no periodo solicitado devem ser priorizados. Conflitos penalizam o score em 15-30 pontos dependendo da sobreposicao, mas o candidato DEVE permanecer na lista (conflitos podem ser resolvidos)
3. **Custo compativel** (PESO MEDIO) — se max_rate foi informado, candidatos com rate acima do teto perdem pontos proporcionalmente. Rate abaixo do teto e neutro (nao bonifica)
4. **Recencia de trabalho** (PESO MEDIO) — candidatos que trabalharam recentemente (ultimos 6 meses) demonstram atividade no mercado. Ultimo job ha mais de 12 meses perde pontos leves
5. **Health score medio** (PESO BAIXO) — historico de qualidade em jobs anteriores. Score >= 80 e bom, >= 60 e aceitavel, < 60 e preocupante

REGRAS DE PENALIZACAO:
- Conflito de alocacao total (periodo inteiro sobreposto): -30 pontos, mencionar nas match_reasons
- Conflito de alocacao parcial: -15 pontos, mencionar nas match_reasons
- Rate acima do teto: -1 ponto para cada 5% acima do max_rate (ate -20 pontos)
- Sem experiencia no tipo de projeto: -20 pontos vs candidatos com experiencia
- Health score < 60: -10 pontos
- Ultimo job ha mais de 12 meses: -5 pontos

LIMITES:
- Maximo 10 candidatos no array ranked_candidates
- reasoning: entre 50 e 300 caracteres (1 paragrafo geral sobre o pool de candidatos)
- match_reasons: cada razao entre 10 e 150 caracteres

<output_format>
{
  "ranked_candidates": [
    {
      "person_id": "uuid",
      "match_score": number,
      "match_reasons": ["string"]
    }
  ],
  "reasoning": "string (1 paragrafo geral sobre a analise do pool de candidatos e recomendacao)"
}
</output_format>`;

// --- Builder do user prompt ---

/**
 * Monta o user prompt com todos os dados contextuais para matching de freelancers.
 *
 * Segue a estrategia RAG do ELLAHOS: dados compactos em formato tabela/lista
 * para economizar tokens (Sonnet). Limita candidatos a 30 e briefing a 1500 chars.
 */
export function buildFreelancerUserPrompt(params: FreelancerMatchData): string {
  const lines: string[] = [];

  // -- Secao 1: Dados do job --
  lines.push('## Job em analise');
  lines.push(`- **Codigo:** ${params.job.code}`);
  lines.push(`- **Titulo:** ${params.job.title}`);
  lines.push(`- **Tipo de projeto:** ${params.job.project_type}`);
  lines.push(`- **Status:** ${params.job.status}`);
  if (params.job.complexity_level) {
    lines.push(`- **Complexidade:** ${params.job.complexity_level}`);
  }

  if (params.job.briefing_text) {
    lines.push('');
    lines.push('### Briefing (resumo)');
    // Truncar briefing em 1500 chars para economizar tokens Sonnet
    const briefing = sanitizeUserInput(params.job.briefing_text, 1500);
    lines.push('<user-input>');
    lines.push(briefing);
    lines.push('</user-input>');
    if (params.job.briefing_text.length > 1500) {
      lines.push('... (briefing truncado)');
    }
  }

  // -- Secao 2: Requisitos da vaga --
  lines.push('');
  lines.push('## Requisitos da vaga');
  lines.push(`- **Funcao:** ${params.request.role}`);
  if (params.request.requirements) {
    lines.push(`- **Requisitos:** <user-input>${sanitizeUserInput(params.request.requirements, 500)}</user-input>`);
  }
  if (params.request.max_rate !== null) {
    lines.push(`- **Rate maximo:** R$ ${params.request.max_rate.toLocaleString('pt-BR')}`);
  }
  if (params.request.preferred_start) {
    lines.push(`- **Inicio preferencial:** ${params.request.preferred_start}`);
  }
  if (params.request.preferred_end) {
    lines.push(`- **Fim preferencial:** ${params.request.preferred_end}`);
  }

  // -- Secao 3: Candidatos --
  // Limitar a 30 candidatos no prompt (economizar tokens)
  const candidatesToSend = params.candidates.slice(0, 30);
  const totalCandidates = params.candidates.length;

  lines.push('');
  if (totalCandidates > 30) {
    lines.push(`## Candidatos (${candidatesToSend.length} de ${totalCandidates}, limitado aos mais relevantes)`);
  } else {
    lines.push(`## Candidatos (${candidatesToSend.length})`);
  }

  if (candidatesToSend.length === 0) {
    lines.push('Nenhum candidato disponivel. Retorne ranked_candidates vazio.');
  } else {
    // Tabela compacta para economizar tokens
    lines.push('| # | Nome | Funcao | Rate | Interno | Jobs Total | Jobs Mesmo Tipo | Health Score | Ultimo Job | Conflitos |');
    lines.push('|---|------|--------|------|---------|------------|-----------------|--------------|------------|-----------|');

    for (let i = 0; i < candidatesToSend.length; i++) {
      const c = candidatesToSend[i];
      const rate = c.default_rate !== null ? `R$ ${c.default_rate.toLocaleString('pt-BR')}` : 'N/I';
      const interno = c.is_internal ? 'Sim' : 'Nao';
      const health = c.avg_health_score !== null ? `${c.avg_health_score.toFixed(0)}` : 'N/I';
      const lastJob = c.last_job_date ? c.last_job_date.split('T')[0] : 'N/I';
      const conflictCount = c.conflicts.length;

      lines.push(
        `| ${i + 1} | ${c.full_name} | ${c.default_role} | ${rate} | ${interno} | ${c.total_jobs} | ${c.jobs_same_type} | ${health} | ${lastJob} | ${conflictCount} |`,
      );
    }

    // Detalhar conflitos apenas para candidatos que tem conflitos (economiza tokens)
    const candidatesWithConflicts = candidatesToSend.filter((c) => c.conflicts.length > 0);
    if (candidatesWithConflicts.length > 0) {
      lines.push('');
      lines.push('### Detalhes de conflitos de alocacao');
      for (const c of candidatesWithConflicts) {
        lines.push(`**${c.full_name}:**`);
        for (const conflict of c.conflicts) {
          lines.push(`- ${conflict.job_code} (${conflict.job_title}): ${conflict.overlap_start} a ${conflict.overlap_end}`);
        }
      }
    }
  }

  // -- Secao 4: Instrucao final --
  lines.push('');
  lines.push('Com base nos dados acima, ranqueie os candidatos por adequacao ao job e retorne o JSON seguindo o output_format.');

  return lines.join('\n');
}
