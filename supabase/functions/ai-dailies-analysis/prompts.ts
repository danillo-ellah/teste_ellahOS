// System prompts versionados para a feature de Analise de Dailies AI.
// Analisa metadados de material filmado e gera relatorio de progresso da producao.
// Mudancas no prompt = novo deploy da Edge Function.
// Versao atual: v1

// --- Versao do prompt (para tracking em ai_usage_logs) ---
export const DAILIES_PROMPT_VERSION = 'v1';

// --- Tipagem do input de dailies ---

/** Dados de uma unica diaria de filmagem fornecidos pelo usuario */
export interface DailyEntry {
  /** Data da filmagem (ISO 8601, ex: "2026-03-15") */
  shooting_date: string;
  /** Notas gerais do set (diretor, produtora, etc.) */
  notes?: string;
  /** Quantidade de cenas planejadas para o dia */
  scenes_planned?: number;
  /** Quantidade de cenas efetivamente completadas */
  scenes_completed?: number;
  /** Condicoes climaticas e impacto na filmagem */
  weather_notes?: string;
  /** Problemas com equipamento (camera, luz, som, etc.) */
  equipment_issues?: string;
  /** Observacoes sobre elenco/talento (performance, atrasos, saude) */
  talent_notes?: string;
  /** Custos extras nao previstos no orcamento (descricao textual) */
  extra_costs?: string;
  /** Observacoes gerais do dia (qualquer dado relevante) */
  general_observations?: string;
}

/** Dados completos enviados para analise de dailies */
export interface DailiesData {
  /** Dados do job associado */
  job: {
    code: string;
    title: string;
    status: string;
    priority: string;
    project_type: string;
    briefing_text?: string | null;
  };
  /** Entregaveis do job com seus status atuais */
  deliverables: Array<{
    description: string;
    status: string;
    format?: string | null;
  }>;
  /** Datas de filmagem planejadas no job (job_shooting_dates) */
  planned_shooting_dates: Array<{
    date: string;
    location?: string | null;
    period?: string | null;
  }>;
  /** Dados de dailies fornecidos pelo usuario (array de diarias) */
  dailies_entries: DailyEntry[];
  /** Historico recente do job (ultimas 10 entradas do job_history) */
  recent_history: Array<{
    event_type: string;
    description: string;
    created_at: string;
  }>;
}

// --- System Prompt ---

export const DAILIES_SYSTEM_PROMPT = `Voce e um line producer experiente analisando os dailies (relatorios diarios de set) de uma producao audiovisual brasileira. Sua tarefa e analisar os dados fornecidos e gerar um relatorio de progresso estruturado.

IDIOMA:
- Responda SEMPRE em portugues brasileiro
- Use terminologia tecnica de producao audiovisual em portugues (diaria, set, take, cena, continuidade, reshoot, etc.)

REGRAS:
- Responda APENAS em JSON valido, seguindo o schema fornecido em <output_format>
- NUNCA invente dados que nao estejam presentes no contexto fornecido. Se uma informacao nao foi fornecida, nao presuma ou extrapole
- Quando citar dados especificos, referencie a fonte (ex: "Na diaria de 15/03...", "Segundo os entregaveis...", "O briefing menciona...")
- Avalie se a producao esta on_track, at_risk, behind ou ahead baseado EXCLUSIVAMENTE nos dados fornecidos
- Identifique riscos CONCRETOS e ESPECIFICOS baseados nos dados — nunca use frases genericas como "pode haver atrasos"
- Recomendacoes devem ser ACOES ESPECIFICAS e PRATICAS, nao conselhos genericos. Exemplo bom: "Reagendar cena 5 para dia seguinte para aproveitar luz natural". Exemplo ruim: "Planejar melhor as proximas diarias"
- Se houver poucos dados (1-2 diarias, campos vazios), indique isso explicitamente no summary e seja CONSERVADOR na avaliacao — prefira "dados insuficientes para avaliar" a uma conclusao prematura
- completion_percentage deve ser calculado como: (total cenas completadas / total cenas planejadas) * 100. Se nao houver dados de cenas, use proporcao de diarias realizadas vs planejadas
- Se nao houver cenas planejadas NEM diarias planejadas, defina completion_percentage como 0 e explique que nao e possivel calcular sem dados de referencia
- Se o briefing do job for fornecido, compare o progresso com os objetivos do briefing
- Considere o cronograma: diarias ja realizadas vs diarias restantes. Se restam poucas diarias e muitas cenas pendentes, isso e risco alto
- Problemas de equipamento recorrentes sao risco medio/alto (podem impactar proximas diarias)
- Custos extras nao previstos devem ser sinalizados como risco financeiro
- Se o status do job for incompativel com filmagem (ex: "briefing", "pre_producao"), sinalize que a analise pode ser prematura

LIMITES:
- Maximo de 5 riscos no array (priorize os mais severos)
- Maximo de 5 recomendacoes (priorize as mais acionaveis)
- Summary deve ter entre 50 e 500 caracteres
- explanation no progress_assessment deve ter entre 30 e 300 caracteres

<output_format>
{
  "summary": "string (1-2 paragrafos, resumo executivo do andamento da producao)",
  "progress_assessment": {
    "status": "on_track" | "at_risk" | "behind" | "ahead",
    "explanation": "string (justificativa do status com dados concretos)",
    "completion_percentage": number (0-100, baseado em cenas completadas vs planejadas)
  },
  "risks": [
    {
      "severity": "high" | "medium" | "low",
      "description": "string (descricao especifica do risco identificado)",
      "recommendation": "string (acao concreta para mitigar o risco)"
    }
  ],
  "recommendations": ["string (acao pratica e especifica)"]
}
</output_format>`;

// --- Builder do user prompt ---

/**
 * Monta o user prompt com todos os dados contextuais para analise de dailies.
 *
 * Segue a estrategia RAG do ELLAHOS: dados compactos em formato tabela/lista
 * para economizar tokens (Haiku tem context window menor).
 */
export function buildDailiesUserPrompt(params: DailiesData): string {
  const lines: string[] = [];

  // -- Secao 1: Dados do job --
  lines.push('## Job em analise');
  lines.push(`- **Codigo:** ${params.job.code}`);
  lines.push(`- **Titulo:** ${params.job.title}`);
  lines.push(`- **Status:** ${params.job.status}`);
  lines.push(`- **Prioridade:** ${params.job.priority}`);
  lines.push(`- **Tipo de projeto:** ${params.job.project_type}`);

  if (params.job.briefing_text) {
    lines.push('');
    lines.push('### Briefing do job');
    // Truncar briefing em 2000 chars para economizar tokens (limite definido na arquitetura)
    const briefing = params.job.briefing_text.slice(0, 2000);
    lines.push(briefing);
    if (params.job.briefing_text.length > 2000) {
      lines.push('... (briefing truncado)');
    }
  }

  // -- Secao 2: Entregaveis --
  if (params.deliverables.length > 0) {
    lines.push('');
    lines.push(`### Entregaveis do job (${params.deliverables.length})`);
    for (const d of params.deliverables.slice(0, 50)) {
      const format = d.format ? ` (${d.format})` : '';
      lines.push(`- [${d.status}] ${d.description}${format}`);
    }
    if (params.deliverables.length > 50) {
      lines.push(`- ... e mais ${params.deliverables.length - 50} entregaveis`);
    }
  }

  // -- Secao 3: Diarias de filmagem planejadas --
  if (params.planned_shooting_dates.length > 0) {
    lines.push('');
    lines.push(`### Diarias de filmagem planejadas (${params.planned_shooting_dates.length})`);
    for (const s of params.planned_shooting_dates) {
      const location = s.location ? ` — ${s.location}` : '';
      const period = s.period ? ` (${s.period})` : '';
      lines.push(`- ${s.date}${location}${period}`);
    }
  } else {
    lines.push('');
    lines.push('### Diarias de filmagem planejadas');
    lines.push('Nenhuma diaria de filmagem cadastrada no sistema.');
  }

  // -- Secao 4: Dados de dailies (input principal do usuario) --
  lines.push('');
  lines.push(`### Dados de dailies fornecidos (${params.dailies_entries.length} diaria(s))`);

  if (params.dailies_entries.length === 0) {
    lines.push('Nenhum dado de diaria fornecido. Analise impossivel sem dados.');
  } else {
    // Calcular totais para contexto rapido
    let totalPlanned = 0;
    let totalCompleted = 0;
    let hasSceneData = false;

    for (let i = 0; i < params.dailies_entries.length; i++) {
      const entry = params.dailies_entries[i];
      lines.push('');
      lines.push(`#### Diaria ${i + 1} — ${entry.shooting_date}`);

      if (entry.scenes_planned !== undefined && entry.scenes_planned !== null) {
        lines.push(`- Cenas planejadas: ${entry.scenes_planned}`);
        totalPlanned += entry.scenes_planned;
        hasSceneData = true;
      }
      if (entry.scenes_completed !== undefined && entry.scenes_completed !== null) {
        lines.push(`- Cenas completadas: ${entry.scenes_completed}`);
        totalCompleted += entry.scenes_completed;
        hasSceneData = true;
      }
      if (entry.notes) {
        lines.push(`- Notas do set: ${entry.notes.slice(0, 1000)}`);
      }
      if (entry.weather_notes) {
        lines.push(`- Clima: ${entry.weather_notes.slice(0, 500)}`);
      }
      if (entry.equipment_issues) {
        lines.push(`- Problemas de equipamento: ${entry.equipment_issues.slice(0, 500)}`);
      }
      if (entry.talent_notes) {
        lines.push(`- Observacoes de elenco/talento: ${entry.talent_notes.slice(0, 500)}`);
      }
      if (entry.extra_costs) {
        lines.push(`- Custos extras: ${entry.extra_costs.slice(0, 500)}`);
      }
      if (entry.general_observations) {
        lines.push(`- Observacoes gerais: ${entry.general_observations.slice(0, 1000)}`);
      }
    }

    // Resumo quantitativo (ajuda o modelo a calcular completion_percentage)
    if (hasSceneData) {
      lines.push('');
      lines.push('### Resumo quantitativo');
      lines.push(`- Total de cenas planejadas (somatorio das diarias): ${totalPlanned}`);
      lines.push(`- Total de cenas completadas (somatorio das diarias): ${totalCompleted}`);
      if (totalPlanned > 0) {
        const pct = Math.round((totalCompleted / totalPlanned) * 100);
        lines.push(`- Percentual de conclusao baseado em cenas: ${pct}%`);
      }
    }

    // Contexto de cronograma
    if (params.planned_shooting_dates.length > 0) {
      const totalPlannedDays = params.planned_shooting_dates.length;
      const completedDays = params.dailies_entries.length;
      const remainingDays = totalPlannedDays - completedDays;
      lines.push('');
      lines.push('### Contexto de cronograma');
      lines.push(`- Diarias planejadas: ${totalPlannedDays}`);
      lines.push(`- Diarias com dados reportados: ${completedDays}`);
      lines.push(`- Diarias restantes estimadas: ${Math.max(0, remainingDays)}`);
    }
  }

  // -- Secao 5: Historico recente do job --
  if (params.recent_history.length > 0) {
    lines.push('');
    lines.push(`### Atividade recente do job (ultimas ${params.recent_history.length} entradas)`);
    for (const h of params.recent_history.slice(0, 10)) {
      const date = h.created_at.split('T')[0];
      lines.push(`- [${date}] (${h.event_type}) ${h.description}`);
    }
  }

  // -- Instrucao final --
  lines.push('');
  lines.push('Com base em todos os dados acima, gere a analise de dailies em JSON seguindo o schema do output_format.');

  return lines.join('\n');
}
