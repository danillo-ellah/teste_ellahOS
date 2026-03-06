import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Escapa caracteres HTML para prevenir XSS no template inline
function esc(val: unknown): string {
  return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Formata data ISO (YYYY-MM-DD) para DD/MM/YYYY
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Formata horario HH:MM:SS ou HH:MM para exibicao
function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  // Remove segundos se presentes
  return timeStr.slice(0, 5);
}

// Gera o HTML do template classico (preto no branco, orientado a impressao)
function buildClassicoHtml(
  od: Record<string, unknown>,
  job: Record<string, unknown>,
  tenant: Record<string, unknown>,
): string {
  const crewCalls = (od.crew_calls as Array<Record<string, unknown>> | null) ?? [];
  const filmingBlocks = (od.filming_blocks as Array<Record<string, unknown>> | null) ?? [];
  const castSchedule = (od.cast_schedule as Array<Record<string, unknown>> | null) ?? [];
  const importantInfo = (od.important_info as string | null) ?? '';

  const clientObj = job.clients as Record<string, unknown> | null;
  const agencyObj = job.agencies as Record<string, unknown> | null;
  const jobCode = [job.code, job.job_aba].filter(Boolean).join('');

  // Linhas da tabela de chamada por departamento (2 colunas)
  let crewTableRows = '';
  for (let i = 0; i < crewCalls.length; i += 2) {
    const left = crewCalls[i];
    const right = crewCalls[i + 1];
    crewTableRows += `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ccc;">${esc(left?.department as string)}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;font-weight:bold;">${esc(left?.call_time as string) || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${right ? esc(right.department as string) : ''}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;font-weight:bold;">${right ? (esc(right.call_time as string) || '—') : ''}</td>
      </tr>`;
  }

  // Blocos de filmagem
  let blocksSections = '';
  filmingBlocks.forEach((block) => {
    const timeRange = [
      formatTime(block.start_time as string),
      formatTime(block.end_time as string),
    ]
      .filter((t) => t !== '—')
      .join(' → ');

    blocksSections += `
      <div style="border:1px solid #333;border-radius:4px;padding:12px 16px;margin-bottom:10px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:4px;">
          ${timeRange ? `<span style="font-weight:bold;font-size:15px;">${esc(timeRange)}</span>` : ''}
          ${block.scenes_label ? `<span>Cenas: <b>${esc(block.scenes_label as string)}</b></span>` : ''}
          ${block.location ? `<span>Locacao: <b>${esc(block.location as string)}</b></span>` : ''}
        </div>
        ${block.cast_names ? `<div style="color:#555;font-size:13px;">Elenco: ${esc(block.cast_names as string)}</div>` : ''}
        ${(block.adjustment_minutes as number) > 0 ? `<div style="color:#888;font-size:12px;">Ajuste: ${esc(block.adjustment_minutes)} min</div>` : ''}
        ${block.notes ? `<div style="color:#444;font-size:13px;margin-top:4px;font-style:italic;">${esc(block.notes as string)}</div>` : ''}
      </div>`;
  });

  // Tabela de elenco do dia
  let castRows = '';
  castSchedule.forEach((actor) => {
    castRows += `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ccc;">${esc(actor.name as string)}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${esc(actor.character as string)}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;text-align:center;">${esc(actor.call_time as string) || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;text-align:center;">${esc(actor.makeup_time as string) || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;text-align:center;">${esc(actor.on_set_time as string) || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;text-align:center;">${esc(actor.wrap_time as string) || '—'}</td>
      </tr>`;
  });

  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ordem do Dia — ${esc(od.title as string)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    color: #111;
    background: #fff;
    padding: 24px;
    max-width: 794px;
    margin: 0 auto;
  }
  h2 {
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 2px solid #111;
    padding-bottom: 4px;
    margin: 20px 0 12px;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #111;
    color: #fff;
    padding: 6px 10px;
    text-align: left;
    font-size: 13px;
  }
  .header {
    border-bottom: 3px solid #111;
    padding-bottom: 16px;
    margin-bottom: 4px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }
  .logo-area { display: flex; align-items: center; gap: 10px; }
  .company-name { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
  .job-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .job-code { font-size: 13px; color: #555; }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
    font-size: 13px;
    margin-top: 8px;
  }
  .meta-item { display: flex; gap: 6px; }
  .meta-label { color: #555; min-width: 70px; }
  .footer {
    border-top: 1px solid #ccc;
    margin-top: 24px;
    padding-top: 8px;
    font-size: 11px;
    color: #888;
    text-align: center;
  }
  @media print {
    body { padding: 0; }
    .footer { position: fixed; bottom: 0; width: 100%; }
  }
</style>
</head>
<body>

<!-- CABECALHO -->
<div class="header">
  <div class="header-top">
    <div class="logo-area">
      ${tenant.logo_url ? `<img src="${esc(tenant.logo_url as string)}" alt="Logo" style="height:48px;object-fit:contain;">` : ''}
      <span class="company-name">${esc(tenant.company_name as string) || 'ELLAH FILMES'}</span>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#666;">Gerado em ${esc(generatedAt)}</div>
    </div>
  </div>
  <div class="job-title">${esc(od.title as string)}</div>
  <div class="job-code">${esc(jobCode as string)} ${job.title ? `— ${esc(job.title as string)}` : ''}</div>
  <div class="meta-grid">
    ${clientObj?.name ? `<div class="meta-item"><span class="meta-label">Cliente:</span><span><b>${esc(clientObj.name as string)}</b></span></div>` : ''}
    ${agencyObj?.name ? `<div class="meta-item"><span class="meta-label">Agencia:</span><span><b>${esc(agencyObj.name as string)}</b></span></div>` : ''}
    ${job.director ? `<div class="meta-item"><span class="meta-label">Direcao:</span><span><b>${esc(job.director as string)}</b></span></div>` : ''}
    ${od.shooting_date_id ? `<div class="meta-item"><span class="meta-label">Data:</span><span><b>${esc(formatDate(od.shooting_date as string))}</b></span></div>` : ''}
    ${od.day_number ? `<div class="meta-item"><span class="meta-label">Dia:</span><span><b>${esc(od.day_number)}° dia de filmagem</b></span></div>` : ''}
    ${od.general_location ? `<div class="meta-item"><span class="meta-label">Local:</span><span><b>${esc(od.general_location as string)}</b></span></div>` : ''}
    ${od.weather_summary ? `<div class="meta-item"><span class="meta-label">Clima:</span><span>${esc(od.weather_summary as string)}</span></div>` : ''}
    ${od.first_call ? `<div class="meta-item"><span class="meta-label">1a Chamada:</span><span><b>${formatTime(od.first_call as string)}</b></span></div>` : ''}
    ${od.filming_start ? `<div class="meta-item"><span class="meta-label">Inicio:</span><span><b>${formatTime(od.filming_start as string)}</b></span></div>` : ''}
    ${od.camera_wrap ? `<div class="meta-item"><span class="meta-label">Camera Wrap:</span><span><b>${formatTime(od.camera_wrap as string)}</b></span></div>` : ''}
  </div>
</div>

${crewCalls.length > 0 ? `
<!-- CHAMADA POR DEPARTAMENTO -->
<h2>Chamada por Departamento</h2>
<table>
  <thead>
    <tr>
      <th>Departamento</th>
      <th>Horario</th>
      <th>Departamento</th>
      <th>Horario</th>
    </tr>
  </thead>
  <tbody>${crewTableRows}</tbody>
</table>
` : ''}

${filmingBlocks.length > 0 ? `
<!-- ROTEIRO DE FILMAGEM -->
<h2>Roteiro de Filmagem</h2>
${blocksSections}
` : ''}

${castSchedule.length > 0 ? `
<!-- ELENCO DO DIA -->
<h2>Elenco do Dia</h2>
<table>
  <thead>
    <tr>
      <th>Ator / Atriz</th>
      <th>Personagem</th>
      <th style="text-align:center;">Call</th>
      <th style="text-align:center;">Maquiagem</th>
      <th style="text-align:center;">Set</th>
      <th style="text-align:center;">Wrap</th>
    </tr>
  </thead>
  <tbody>${castRows}</tbody>
</table>
` : ''}

${importantInfo ? `
<!-- INFORMACOES IMPORTANTES -->
<h2>Informacoes Importantes</h2>
<pre style="font-family:inherit;font-size:13px;white-space:pre-wrap;background:#f8f8f8;border:1px solid #ddd;padding:12px;border-radius:4px;">${esc(importantInfo)}</pre>
` : ''}

<!-- RODAPE -->
<div class="footer">Gerado por ELLAHOS &bull; ${esc(generatedAt)}</div>

</body>
</html>`;
}

// Valida e sanitiza cor hex para prevenir CSS injection
function sanitizeBrandColor(color: string | null | undefined): string {
  const DEFAULT = '#2563eb';
  if (!color) return DEFAULT;
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  return hexRegex.test(color.trim()) ? color.trim() : DEFAULT;
}

// Gera o HTML do template moderno (usa cor da marca, visual mais rico)
function buildModernoHtml(
  od: Record<string, unknown>,
  job: Record<string, unknown>,
  tenant: Record<string, unknown>,
): string {
  const brandColor = sanitizeBrandColor(tenant.brand_color as string | null);
  const crewCalls = (od.crew_calls as Array<Record<string, unknown>> | null) ?? [];
  const filmingBlocks = (od.filming_blocks as Array<Record<string, unknown>> | null) ?? [];
  const castSchedule = (od.cast_schedule as Array<Record<string, unknown>> | null) ?? [];
  const importantInfo = (od.important_info as string | null) ?? '';

  const clientObj = job.clients as Record<string, unknown> | null;
  const agencyObj = job.agencies as Record<string, unknown> | null;
  const jobCode = [job.code, job.job_aba].filter(Boolean).join('');

  // Linhas da tabela de chamada por departamento (2 colunas)
  let crewTableRows = '';
  for (let i = 0; i < crewCalls.length; i += 2) {
    const left = crewCalls[i];
    const right = crewCalls[i + 1];
    const isOdd = (i / 2) % 2 === 1;
    const rowBg = isOdd ? '#f5f7ff' : '#fff';
    crewTableRows += `
      <tr style="background:${rowBg};">
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${esc(left?.department as string)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:${brandColor};">${esc(left?.call_time as string) || '—'}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${right ? esc(right.department as string) : ''}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:${brandColor};">${right ? (esc(right.call_time as string) || '—') : ''}</td>
      </tr>`;
  }

  // Blocos de filmagem
  let blocksSections = '';
  filmingBlocks.forEach((block, idx) => {
    const timeRange = [
      formatTime(block.start_time as string),
      formatTime(block.end_time as string),
    ]
      .filter((t) => t !== '—')
      .join(' → ');

    blocksSections += `
      <div style="border-left:4px solid ${brandColor};background:#f9fafb;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:10px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
          <span style="background:${brandColor};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:bold;">Bloco ${idx + 1}</span>
          ${timeRange ? `<span style="font-weight:bold;font-size:15px;color:#111;">${esc(timeRange)}</span>` : ''}
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:#374151;">
          ${block.scenes_label ? `<span>Cenas: <b>${esc(block.scenes_label as string)}</b></span>` : ''}
          ${block.location ? `<span>Locacao: <b>${esc(block.location as string)}</b></span>` : ''}
          ${block.cast_names ? `<span>Elenco: ${esc(block.cast_names as string)}</span>` : ''}
          ${(block.adjustment_minutes as number) > 0 ? `<span style="color:#9ca3af;">Ajuste: ${esc(block.adjustment_minutes)} min</span>` : ''}
        </div>
        ${block.notes ? `<div style="color:#6b7280;font-size:12px;margin-top:6px;font-style:italic;">${esc(block.notes as string)}</div>` : ''}
      </div>`;
  });

  // Tabela de elenco do dia
  let castRows = '';
  castSchedule.forEach((actor, idx) => {
    const rowBg = idx % 2 === 1 ? '#f5f7ff' : '#fff';
    castRows += `
      <tr style="background:${rowBg};">
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${esc(actor.name as string)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${esc(actor.character as string)}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${brandColor};">${esc(actor.call_time as string) || '—'}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${esc(actor.makeup_time as string) || '—'}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${esc(actor.on_set_time as string) || '—'}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${esc(actor.wrap_time as string) || '—'}</td>
      </tr>`;
  });

  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ordem do Dia — ${esc(od.title as string)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    color: #111827;
    background: #f3f4f6;
    padding: 0;
  }
  .page {
    background: #fff;
    max-width: 794px;
    margin: 0 auto;
    min-height: 1123px;
    box-shadow: 0 0 24px rgba(0,0,0,0.12);
    padding: 0 0 32px;
  }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #fff;
    background: ${brandColor};
    padding: 8px 20px;
    margin: 20px 0 0;
  }
  .section-content { padding: 16px 20px 0; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #f9fafb;
    border-bottom: 2px solid ${brandColor};
    padding: 8px 12px;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #374151;
  }
  .footer {
    border-top: 1px solid #e5e7eb;
    margin-top: 24px;
    padding: 10px 20px 0;
    font-size: 11px;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
  }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

<!-- CABECALHO com cor da marca -->
<div style="background:${brandColor};padding:24px 24px 20px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${tenant.logo_url ? `<img src="${esc(tenant.logo_url as string)}" alt="Logo" style="height:52px;object-fit:contain;background:#fff;border-radius:4px;padding:4px;">` : ''}
      <div>
        <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:1px;">${esc(tenant.company_name as string) || 'ELLAH FILMES'}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px;">Ordem do Dia</div>
      </div>
    </div>
    <div style="text-align:right;color:rgba(255,255,255,0.8);font-size:12px;">
      ${od.day_number ? `<div style="font-size:28px;font-weight:900;color:#fff;line-height:1;">Dia ${esc(od.day_number)}</div>` : ''}
      ${od.shooting_date_id ? `<div style="margin-top:2px;">${esc(formatDate(od.shooting_date as string))}</div>` : ''}
    </div>
  </div>

  <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:14px 16px;">
    <div style="font-size:20px;font-weight:bold;color:#fff;margin-bottom:8px;">${esc(od.title as string)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:13px;color:rgba(255,255,255,0.9);">
      ${jobCode ? `<div><span style="opacity:0.7;">Job:</span> <b>${esc(jobCode as string)}</b> ${job.title ? `— ${esc(job.title as string)}` : ''}</div>` : ''}
      ${clientObj?.name ? `<div><span style="opacity:0.7;">Cliente:</span> <b>${esc(clientObj.name as string)}</b></div>` : ''}
      ${agencyObj?.name ? `<div><span style="opacity:0.7;">Agencia:</span> <b>${esc(agencyObj.name as string)}</b></div>` : ''}
      ${job.director ? `<div><span style="opacity:0.7;">Direcao:</span> <b>${esc(job.director as string)}</b></div>` : ''}
      ${od.general_location ? `<div><span style="opacity:0.7;">Local:</span> <b>${esc(od.general_location as string)}</b></div>` : ''}
      ${od.weather_summary ? `<div><span style="opacity:0.7;">Clima:</span> ${esc(od.weather_summary as string)}</div>` : ''}
    </div>
    <div style="display:flex;gap:20px;margin-top:10px;font-size:13px;color:rgba(255,255,255,0.95);">
      ${od.first_call ? `<div>1a Chamada: <b>${formatTime(od.first_call as string)}</b></div>` : ''}
      ${od.filming_start ? `<div>Inicio Filmagem: <b>${formatTime(od.filming_start as string)}</b></div>` : ''}
      ${od.lunch_time ? `<div>Almoco: <b>${formatTime(od.lunch_time as string)}</b></div>` : ''}
      ${od.camera_wrap ? `<div>Camera Wrap: <b>${formatTime(od.camera_wrap as string)}</b></div>` : ''}
    </div>
  </div>
</div>

${crewCalls.length > 0 ? `
<!-- CHAMADA POR DEPARTAMENTO -->
<div class="section-title">Chamada por Departamento</div>
<div class="section-content">
  <table>
    <thead>
      <tr>
        <th>Departamento</th>
        <th>Horario</th>
        <th>Departamento</th>
        <th>Horario</th>
      </tr>
    </thead>
    <tbody>${crewTableRows}</tbody>
  </table>
</div>
` : ''}

${filmingBlocks.length > 0 ? `
<!-- ROTEIRO DE FILMAGEM -->
<div class="section-title">Roteiro de Filmagem</div>
<div class="section-content">${blocksSections}</div>
` : ''}

${castSchedule.length > 0 ? `
<!-- ELENCO DO DIA -->
<div class="section-title">Elenco do Dia</div>
<div class="section-content">
  <table>
    <thead>
      <tr>
        <th>Ator / Atriz</th>
        <th>Personagem</th>
        <th style="text-align:center;">Call</th>
        <th style="text-align:center;">Maquiagem</th>
        <th style="text-align:center;">Set</th>
        <th style="text-align:center;">Wrap</th>
      </tr>
    </thead>
    <tbody>${castRows}</tbody>
  </table>
</div>
` : ''}

${importantInfo ? `
<!-- INFORMACOES IMPORTANTES -->
<div class="section-title">Informacoes Importantes</div>
<div class="section-content">
  <pre style="font-family:inherit;font-size:13px;white-space:pre-wrap;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:6px;color:#92400e;">${esc(importantInfo)}</pre>
</div>
` : ''}

<!-- RODAPE -->
<div class="footer">
  <span>Gerado por ELLAHOS</span>
  <span>${esc(generatedAt)}</span>
</div>

</div>
</body>
</html>`;
}

export async function handlePreview(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
  console.log('[shooting-day-order/preview] gerando preview HTML', {
    odId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // 1. Buscar o registro completo da OD
  const { data: od, error: odErr } = await client
    .from('shooting_day_orders')
    .select(
      'id, job_id, shooting_date_id, title, day_number, general_location, weather_summary, weather_data, first_call, production_call, filming_start, breakfast_time, lunch_time, camera_wrap, deproduction, crew_calls, filming_blocks, cast_schedule, important_info, pdf_template, status',
    )
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (odErr) {
    console.error('[shooting-day-order/preview] erro ao buscar OD:', odErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar ordem do dia', 500, {
      detail: odErr.message,
    });
  }

  if (!od) {
    throw new AppError('NOT_FOUND', 'Ordem do dia nao encontrada', 404);
  }

  const odObj = od as Record<string, unknown>;
  const jobId = odObj.job_id as string;

  // 2. Buscar dados do job com cliente e agencia em paralelo com dados do tenant
  const [jobResult, tenantResult, shootingDateResult] = await Promise.all([
    client
      .from('jobs')
      .select('id, code, job_aba, title, director, clients(id, name), agencies(id, name)')
      .eq('id', jobId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),

    // 3. Buscar branding do tenant
    client
      .from('tenants')
      .select('logo_url, brand_color, company_name')
      .eq('id', auth.tenantId)
      .maybeSingle(),

    // 4. Buscar data de filmagem para ter a data formatada
    odObj.shooting_date_id
      ? client
          .from('job_shooting_dates')
          .select('id, shooting_date')
          .eq('id', odObj.shooting_date_id as string)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (jobResult.error) {
    console.error('[shooting-day-order/preview] erro ao buscar job:', jobResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do job', 500, {
      detail: jobResult.error.message,
    });
  }

  if (!jobResult.data) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  if (tenantResult.error) {
    console.error('[shooting-day-order/preview] erro ao buscar tenant:', tenantResult.error.message);
  }

  const job = jobResult.data as Record<string, unknown>;
  const tenant = (tenantResult.data as Record<string, unknown> | null) ?? {};

  // Injetar shooting_date no od para uso nos templates
  if (shootingDateResult.data) {
    const sdObj = shootingDateResult.data as Record<string, unknown>;
    odObj.shooting_date = sdObj.shooting_date;
  }

  // 5. Determinar template e gerar HTML
  const template = (odObj.pdf_template as string) ?? 'classico';
  const html = template === 'moderno'
    ? buildModernoHtml(odObj, job, tenant)
    : buildClassicoHtml(odObj, job, tenant);

  console.log('[shooting-day-order/preview] HTML gerado com sucesso', {
    odId,
    template,
    jobId,
  });

  return new Response(html, {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; script-src 'none';",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
