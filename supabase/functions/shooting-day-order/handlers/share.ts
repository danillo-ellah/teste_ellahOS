import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { sendText, sanitizePhone, type ZapiConfig } from '../../_shared/zapi-client.ts';

// Formata data ISO (YYYY-MM-DD) para DD/MM/YYYY
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Formata horario HH:MM:SS ou HH:MM para HH:MM
function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

// Valida e normaliza um numero de telefone para envio Z-API
function isValidPhone(phone: string | null | undefined): phone is string {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  // Minimo 10 digitos (DDD + numero sem prefixo pais)
  return digits.length >= 10;
}

export async function handleShare(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
  console.log('[shooting-day-order/share] iniciando compartilhamento da OD', {
    odId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // 1. Parsear e validar body
  const body = await req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  });

  // Validacao basica dos campos
  const phones: string[] | undefined = Array.isArray(body.phones) ? (body.phones as string[]).slice(0, 100) : undefined;
  const sendToTeam: boolean = body.send_to_team === true;

  // 2. Buscar o registro da OD
  const client = getSupabaseClient(auth.token);

  const { data: od, error: odErr } = await client
    .from('shooting_day_orders')
    .select(
      'id, job_id, shooting_date_id, title, day_number, general_location, first_call, filming_start, status',
    )
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (odErr) {
    console.error('[shooting-day-order/share] erro ao buscar OD:', odErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar ordem do dia', 500);
  }

  if (!od) {
    throw new AppError('NOT_FOUND', 'Ordem do dia nao encontrada', 404);
  }

  const odObj = od as Record<string, unknown>;
  const jobId = odObj.job_id as string;
  const shootingDateId = odObj.shooting_date_id as string | null;

  // 3. Buscar dados complementares em paralelo
  const [jobResult, shootingDateResult] = await Promise.all([
    client
      .from('jobs')
      .select('id, code, job_aba, title')
      .eq('id', jobId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),

    shootingDateId
      ? client
          .from('job_shooting_dates')
          .select('id, shooting_date')
          .eq('id', shootingDateId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (jobResult.error || !jobResult.data) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const job = jobResult.data as Record<string, unknown>;
  const shootingDate = shootingDateResult.data as Record<string, unknown> | null;
  const jobCode = [job.code, job.job_aba].filter(Boolean).join('');

  // 4. Determinar lista de telefones para envio
  const phoneList: string[] = [];

  if (sendToTeam) {
    // Buscar telefones da equipe do job (apenas membros com telefone preenchido)
    const { data: teamRaw, error: teamErr } = await client
      .from('job_team')
      .select(`
        id,
        people!person_id (
          id,
          name,
          phone
        )
      `)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null);

    if (teamErr) {
      console.warn('[shooting-day-order/share] erro ao buscar equipe:', teamErr.message);
    } else if (teamRaw) {
      for (const member of teamRaw as Array<Record<string, unknown>>) {
        const person = member.people as Record<string, unknown> | null;
        const phone = person?.phone as string | null;
        if (isValidPhone(phone)) {
          phoneList.push(phone);
        }
      }
    }

    console.log(
      '[shooting-day-order/share] telefones da equipe coletados:',
      phoneList.length,
    );
  }

  if (phones && phones.length > 0) {
    // Adicionar telefones extras fornecidos no body (sem duplicar)
    const existing = new Set(phoneList.map((p) => p.replace(/\D/g, '')));
    for (const ph of phones) {
      if (isValidPhone(ph)) {
        const digits = ph.replace(/\D/g, '');
        if (!existing.has(digits)) {
          phoneList.push(ph);
          existing.add(digits);
        }
      }
    }
  }

  if (phoneList.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Nenhum telefone valido para envio. Informe "phones" ou use "send_to_team: true" com equipe cadastrada.',
      422,
    );
  }

  // 5. Montar mensagem WhatsApp
  const shootingDateStr = shootingDate?.shooting_date as string | null;
  const dateLine = shootingDateStr ? `Data: ${formatDate(shootingDateStr)}` : '';
  const dayLine = odObj.day_number ? `Dia: ${odObj.day_number}° dia de filmagem` : '';
  const locationLine = odObj.general_location
    ? `Local: ${odObj.general_location as string}`
    : '';
  const firstCallLine = odObj.first_call
    ? `1a Chamada: ${formatTime(odObj.first_call as string)}`
    : '';
  const filmingStartLine = odObj.filming_start
    ? `Inicio Filmagem: ${formatTime(odObj.filming_start as string)}`
    : '';

  const messageLines = [
    '*ORDEM DO DIA*',
    `Job: ${jobCode}${job.title ? ` — ${job.title as string}` : ''}`,
    dateLine,
    dayLine,
    locationLine,
    firstCallLine,
    filmingStartLine,
  ].filter(Boolean);

  const message = messageLines.join('\n');

  // 6. Obter credenciais Z-API do ambiente
  const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
  const zapiToken = Deno.env.get('ZAPI_TOKEN') ?? '';
  const zapiClientToken = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';

  if (!zapiInstanceId || !zapiToken) {
    console.error('[shooting-day-order/share] credenciais Z-API nao configuradas');
    throw new AppError(
      'INTERNAL_ERROR',
      'Servico de WhatsApp nao configurado. Verifique ZAPI_INSTANCE_ID e ZAPI_TOKEN.',
      503,
    );
  }

  const zapiConfig: ZapiConfig = {
    instanceId: zapiInstanceId,
    token: zapiToken,
    clientToken: zapiClientToken,
  };

  // 7. Enviar mensagem para cada telefone
  let sentCount = 0;
  let failedCount = 0;
  const failures: Array<{ phone: string; error: string }> = [];

  for (const rawPhone of phoneList) {
    const sanitized = sanitizePhone(rawPhone);

    console.log('[shooting-day-order/share] enviando mensagem', {
      phone: sanitized.slice(0, 6) + '****', // log parcial por privacidade
      odId,
    });

    const result = await sendText({
      config: zapiConfig,
      phone: sanitized,
      text: message,
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
      failures.push({
        phone: sanitized.slice(0, 4) + '****',
        error: result.error ?? 'Erro desconhecido',
      });
      console.warn('[shooting-day-order/share] falha ao enviar para', sanitized.slice(0, 6), ':', result.error);
    }
  }

  // 8. Atualizar status da OD para 'compartilhada' — somente se pelo menos um envio teve sucesso
  if (sentCount > 0) {
    const { error: updateErr } = await client
      .from('shooting_day_orders')
      .update({
        status: 'compartilhada',
        shared_at: new Date().toISOString(),
      })
      .eq('id', odId)
      .eq('tenant_id', auth.tenantId);

    if (updateErr) {
      // Nao e fatal — o envio ja foi feito; apenas loga o erro
      console.error(
        '[shooting-day-order/share] erro ao atualizar status da OD:',
        updateErr.message,
      );
    }
  }

  console.log('[shooting-day-order/share] compartilhamento concluido', {
    odId,
    jobId,
    totalPhones: phoneList.length,
    sentCount,
    failedCount,
  });

  return success(
    {
      shared: true,
      sent_count: sentCount,
      failed_count: failedCount,
      ...(failures.length > 0 ? { failures } : {}),
    },
    200,
    req,
  );
}
