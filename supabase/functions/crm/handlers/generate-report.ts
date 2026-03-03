import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Stages ativos do pipeline
const ACTIVE_STAGES = ['lead', 'qualificado', 'proposta', 'negociacao', 'fechamento'];

interface MonthlySummary {
  created: number;
  won: number;
  lost: number;
  pipeline_value: number;
  total_won_value: number;
}

interface AgencyEntry {
  agency_id: string;
  name: string;
  count: number;
  total_value: number;
}

interface OpportunityRow {
  id: string;
  title: string;
  stage: string;
  estimated_value: number | null;
  actual_close_date: string | null;
  loss_reason: string | null;
  agency_id: string | null;
  agency_name: string | null;
  created_at: string;
  is_competitive_bid: boolean | null;
}

/**
 * Parseia "YYYY-MM" e retorna { start, end } como ISO strings do primeiro e ultimo dia do mes.
 */
function parseMonthRange(monthParam: string): { start: string; end: string; label: string } {
  const match = monthParam.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new AppError('VALIDATION_ERROR', 'Parametro month invalido. Use formato YYYY-MM', 400);
  }

  const year = parseInt(match[1]);
  const month = parseInt(match[2]);

  if (month < 1 || month > 12) {
    throw new AppError('VALIDATION_ERROR', 'Mes deve estar entre 01 e 12', 400);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const label = `${monthNames[month - 1]} de ${year}`;

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /crm/report/monthly?month=2026-03
 * Gera relatorio mensal HTML do comercial com KPIs, tabelas e grafico de funil.
 * Retorna JSON com campo html (relatorio completo) e summary (dados basicos).
 */
export async function handleGenerateReport(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);

  // Mes padrao: mes anterior
  let monthParam = url.searchParams.get('month');
  if (!monthParam) {
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    monthParam = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  console.log('[crm/generate-report] gerando relatorio mensal', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    month: monthParam,
  });

  const { start, end, label } = parseMonthRange(monthParam);
  const client = getSupabaseClient(auth.token);

  // 1. Oportunidades criadas no mes
  const { data: createdOpps, error: createdError } = await client
    .from('opportunities')
    .select('id, title, stage, estimated_value, agency_id, created_at, is_competitive_bid, agencies(id, name)')
    .eq('tenant_id', auth.tenantId)
    .gte('created_at', start)
    .lte('created_at', end)
    .is('deleted_at', null);

  if (createdError) {
    console.error('[crm/generate-report] erro ao buscar criadas:', createdError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do mes', 500, {
      detail: createdError.message,
    });
  }

  // 2. Oportunidades fechadas no mes (ganhas ou perdidas)
  const { data: closedOpps, error: closedError } = await client
    .from('opportunities')
    .select('id, title, stage, estimated_value, actual_close_date, loss_reason, agency_id, is_competitive_bid, agencies(id, name)')
    .eq('tenant_id', auth.tenantId)
    .in('stage', ['ganho', 'perdido'])
    .gte('actual_close_date', start)
    .lte('actual_close_date', end)
    .is('deleted_at', null);

  if (closedError) {
    console.error('[crm/generate-report] erro ao buscar fechadas:', closedError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar fechamentos do mes', 500, {
      detail: closedError.message,
    });
  }

  // 3. Pipeline atual (oportunidades ativas)
  const { data: activeOpps, error: activeError } = await client
    .from('opportunities')
    .select('id, stage, estimated_value')
    .eq('tenant_id', auth.tenantId)
    .in('stage', ACTIVE_STAGES)
    .is('deleted_at', null);

  if (activeError) {
    console.error('[crm/generate-report] erro ao buscar pipeline ativo:', activeError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pipeline ativo', 500, {
      detail: activeError.message,
    });
  }

  // Normalizar dados
  function normalizeRow(
    row: Record<string, unknown>,
  ): OpportunityRow {
    const agencyRaw = row.agencies;
    const agencyObj = Array.isArray(agencyRaw) ? agencyRaw[0] : agencyRaw;
    return {
      id: row.id as string,
      title: row.title as string,
      stage: row.stage as string,
      estimated_value: row.estimated_value != null ? Number(row.estimated_value) : null,
      actual_close_date: (row.actual_close_date as string | null) ?? null,
      loss_reason: (row.loss_reason as string | null) ?? null,
      agency_id: (row.agency_id as string | null) ?? null,
      agency_name: (agencyObj as { name?: string } | null)?.name ?? null,
      created_at: row.created_at as string,
      is_competitive_bid: (row.is_competitive_bid as boolean | null) ?? null,
    };
  }

  const created: OpportunityRow[] = (createdOpps ?? []).map((r) =>
    normalizeRow(r as Record<string, unknown>),
  );
  const closed: OpportunityRow[] = (closedOpps ?? []).map((r) =>
    normalizeRow(r as Record<string, unknown>),
  );
  const active = activeOpps ?? [];

  const won = closed.filter((o) => o.stage === 'ganho');
  const lost = closed.filter((o) => o.stage === 'perdido');

  const totalWonValue = won.reduce((s, o) => s + (o.estimated_value ?? 0), 0);
  const pipelineValue = active.reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);

  // Taxa de conversao no mes
  const conversionRate = closed.length > 0
    ? Math.round((won.length / closed.length) * 1000) / 10
    : 0;

  // Win rate em concorrencias
  const competitiveClosed = closed.filter((o) => o.is_competitive_bid);
  const competitiveWon = won.filter((o) => o.is_competitive_bid);
  const bidWinRate = competitiveClosed.length > 0
    ? Math.round((competitiveWon.length / competitiveClosed.length) * 1000) / 10
    : null;

  // Top 5 agencias por valor ganho no mes
  const agencyMap = new Map<string, AgencyEntry>();
  for (const opp of won) {
    if (!opp.agency_id) continue;
    const entry = agencyMap.get(opp.agency_id) ?? {
      agency_id: opp.agency_id,
      name: opp.agency_name ?? 'Sem nome',
      count: 0,
      total_value: 0,
    };
    entry.count += 1;
    entry.total_value += opp.estimated_value ?? 0;
    agencyMap.set(opp.agency_id, entry);
  }

  const topAgencies = [...agencyMap.values()]
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 5);

  // Pipeline por stage (para grafico de funil)
  const stageCount: Record<string, { count: number; value: number }> = {};
  for (const o of active) {
    const st = o.stage as string;
    if (!stageCount[st]) stageCount[st] = { count: 0, value: 0 };
    stageCount[st].count += 1;
    stageCount[st].value += Number(o.estimated_value ?? 0);
  }
  const maxCount = Math.max(...ACTIVE_STAGES.map((s) => stageCount[s]?.count ?? 0), 1);

  const summary: MonthlySummary = {
    created: created.length,
    won: won.length,
    lost: lost.length,
    pipeline_value: pipelineValue,
    total_won_value: totalWonValue,
  };

  // Gerar HTML do relatorio
  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const wonRows = won
    .map(
      (o) => `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${escapeHtml(o.title)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${o.agency_name ? escapeHtml(o.agency_name) : '—'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; text-align:right;">${o.estimated_value != null ? formatBRL(o.estimated_value) : '—'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${o.actual_close_date ? o.actual_close_date.slice(0, 10) : '—'}</td>
        </tr>`,
    )
    .join('');

  const lostRows = lost
    .map(
      (o) => `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${escapeHtml(o.title)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${o.agency_name ? escapeHtml(o.agency_name) : '—'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; text-align:right;">${o.estimated_value != null ? formatBRL(o.estimated_value) : '—'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${o.loss_reason ? escapeHtml(o.loss_reason) : '—'}</td>
        </tr>`,
    )
    .join('');

  const agencyRows = topAgencies
    .map(
      (a, i) => `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${i + 1}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${escapeHtml(a.name)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${a.count}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; text-align:right;">${formatBRL(a.total_value)}</td>
        </tr>`,
    )
    .join('');

  const stageLabels: Record<string, string> = {
    lead: 'Lead',
    qualificado: 'Qualificado',
    proposta: 'Proposta',
    negociacao: 'Negociacao',
    fechamento: 'Fechamento',
  };

  const funnelBars = ACTIVE_STAGES.map((stage) => {
    const info = stageCount[stage] ?? { count: 0, value: 0 };
    const widthPct = Math.max(10, Math.round((info.count / maxCount) * 100));
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
          <span style="font-size:12px; color:#374151; width:100px; flex-shrink:0;">${stageLabels[stage] ?? stage}</span>
          <div style="flex:1; background:#f3f4f6; border-radius:4px; height:24px; position:relative;">
            <div style="width:${widthPct}%; background:#09090b; border-radius:4px; height:24px; display:flex; align-items:center; padding-left:8px; box-sizing:border-box;">
              <span style="font-size:11px; color:#fff; white-space:nowrap;">${info.count} oport.</span>
            </div>
          </div>
          <span style="font-size:12px; color:#6b7280; width:120px; text-align:right; flex-shrink:0;">${formatBRL(info.value)}</span>
        </div>
      </div>`;
  }).join('');

  const bidWinRateBlock = bidWinRate !== null
    ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:20px; text-align:center;">
        <p style="margin:0 0 4px; font-size:12px; color:#166534; font-weight:600; text-transform:uppercase;">Win Rate Concorrencias</p>
        <p style="margin:0; font-size:28px; font-weight:800; color:#15803d;">${bidWinRate}%</p>
        <p style="margin:4px 0 0; font-size:11px; color:#166534;">${competitiveWon.length}/${competitiveClosed.length} concorrencias</p>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Relatorio Comercial — ${label}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body style="margin:0; padding:0; background:#fff; font-family:Arial,sans-serif; color:#111827;">

  <!-- Header -->
  <div style="background:#09090b; color:#fff; padding:28px 40px; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">ELLAHOS</h1>
      <p style="margin:4px 0 0; font-size:13px; color:#a1a1aa;">Relatorio Comercial Mensal</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0; font-size:18px; font-weight:700;">${label}</p>
      <p style="margin:4px 0 0; font-size:11px; color:#a1a1aa;">Gerado em ${generatedAt}</p>
    </div>
  </div>

  <div style="padding:32px 40px; max-width:900px; margin:0 auto;">

    <!-- KPIs -->
    <h2 style="margin:0 0 16px; font-size:16px; font-weight:700; color:#111827;">Resumo do Periodo</h2>
    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:32px;">
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase;">Criadas</p>
        <p style="margin:0; font-size:28px; font-weight:800; color:#111827;">${created.length}</p>
      </div>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#166534; font-weight:600; text-transform:uppercase;">Ganhas</p>
        <p style="margin:0; font-size:28px; font-weight:800; color:#15803d;">${won.length}</p>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#991b1b; font-weight:600; text-transform:uppercase;">Perdidas</p>
        <p style="margin:0; font-size:28px; font-weight:800; color:#b91c1c;">${lost.length}</p>
      </div>
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#1e40af; font-weight:600; text-transform:uppercase;">Conversao</p>
        <p style="margin:0; font-size:28px; font-weight:800; color:#1d4ed8;">${conversionRate}%</p>
      </div>
      <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; color:#854d0e; font-weight:600; text-transform:uppercase;">Pipeline</p>
        <p style="margin:0; font-size:16px; font-weight:800; color:#713f12;">${formatBRL(pipelineValue)}</p>
      </div>
    </div>

    <!-- Valor total ganho + concorrencias -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px;">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:20px; text-align:center;">
        <p style="margin:0 0 4px; font-size:12px; color:#166534; font-weight:600; text-transform:uppercase;">Valor Total Ganho no Mes</p>
        <p style="margin:0; font-size:24px; font-weight:800; color:#15803d;">${formatBRL(totalWonValue)}</p>
      </div>
      ${bidWinRateBlock || '<div></div>'}
    </div>

    <!-- Grafico de funil -->
    <h2 style="margin:0 0 16px; font-size:16px; font-weight:700; color:#111827;">Pipeline Atual por Estagio</h2>
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:20px; margin-bottom:32px;">
      ${funnelBars}
    </div>

    <!-- Oportunidades ganhas -->
    <h2 style="margin:0 0 12px; font-size:16px; font-weight:700; color:#111827;">Oportunidades Ganhas (${won.length})</h2>
    ${won.length > 0
      ? `<table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:32px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Titulo</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Agencia</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:right; border-bottom:1px solid #e5e7eb;">Valor</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Data</th>
            </tr>
          </thead>
          <tbody>${wonRows}</tbody>
        </table>`
      : '<p style="color:#6b7280; font-size:13px; margin-bottom:32px;">Nenhuma oportunidade ganha no periodo.</p>'}

    <!-- Oportunidades perdidas -->
    <h2 style="margin:0 0 12px; font-size:16px; font-weight:700; color:#111827;">Oportunidades Perdidas (${lost.length})</h2>
    ${lost.length > 0
      ? `<table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:32px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Titulo</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Agencia</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:right; border-bottom:1px solid #e5e7eb;">Valor</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Motivo</th>
            </tr>
          </thead>
          <tbody>${lostRows}</tbody>
        </table>`
      : '<p style="color:#6b7280; font-size:13px; margin-bottom:32px;">Nenhuma oportunidade perdida no periodo.</p>'}

    <!-- Top agencias -->
    <h2 style="margin:0 0 12px; font-size:16px; font-weight:700; color:#111827;">Top Agencias (por valor ganho)</h2>
    ${topAgencies.length > 0
      ? `<table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:32px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">#</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Agencia</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:left; border-bottom:1px solid #e5e7eb;">Jobs ganhos</th>
              <th style="padding:10px 12px; font-size:12px; color:#374151; text-align:right; border-bottom:1px solid #e5e7eb;">Valor total</th>
            </tr>
          </thead>
          <tbody>${agencyRows}</tbody>
        </table>`
      : '<p style="color:#6b7280; font-size:13px; margin-bottom:32px;">Nenhuma agencia com job ganho no periodo.</p>'}

  </div>

  <!-- Footer -->
  <div style="background:#09090b; padding:16px 40px; text-align:center;">
    <p style="margin:0; font-size:11px; color:#71717a;">
      Relatorio gerado automaticamente pelo ELLAHOS — ${generatedAt}
    </p>
  </div>

</body>
</html>`;

  console.log('[crm/generate-report] relatorio gerado', {
    month: monthParam,
    created: summary.created,
    won: summary.won,
    lost: summary.lost,
  });

  return success({ month: monthParam, html, summary }, 200, req);
}
