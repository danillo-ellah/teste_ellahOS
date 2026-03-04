import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ImportSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  csv_content: z.string().min(10, 'Conteudo CSV muito curto'),
});

// Parse "R$450,00" ou "R$1.050,00" para numero
function parseBRL(value: string | undefined): number {
  if (!value) return 0;
  return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Parse "21/12/2003" para "2003-12-21"
function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Parser de linha CSV correto — lida com campos entre aspas contendo virgulas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export async function handleImportCsv(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[job-cast/import-csv] iniciando importacao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const body = await req.json();
  const { job_id, csv_content } = validate(ImportSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', job_id)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Parsear CSV — dividir por linhas e remover linhas vazias no final
  const rawLines = csv_content.split('\n');
  const lines = rawLines.map((line) => parseCSVLine(line));

  if (lines.length < 4) {
    throw new AppError(
      'VALIDATION_ERROR',
      'CSV invalido: esperado pelo menos 4 linhas (cabecalho da agencia + 2 linhas de header + dados)',
      400,
    );
  }

  // Linha 0: dados da agencia de casting
  const headerLine = lines[0];
  const castingAgency = {
    name: headerLine[1]?.trim() || null,
    address: headerLine[3]?.trim() || null,
    cnpj: headerLine[5]?.trim() || null,
    representative: headerLine[7]?.trim() || null,
    rep_rg: headerLine[9]?.trim() || null,
    rep_cpf: headerLine[11]?.trim() || null,
    email: headerLine[13]?.trim() || null,
    phone: headerLine[15]?.trim() || null,
  };

  console.log('[job-cast/import-csv] agencia de casting detectada:', castingAgency.name);

  // Linhas 1-2: headers da tabela (ignorar)
  // Linha 3 em diante: dados dos membros do elenco

  // Mapa de dedup por CPF — CPFs iguais indicam o mesmo ator em dias diferentes
  const members: Record<string, Record<string, unknown>> = {};
  let parsedRows = 0;
  let skippedRows = 0;

  for (let i = 3; i < lines.length; i++) {
    const cols = lines[i];
    const name = cols[1]?.trim();

    // Pular linhas sem nome (fim do CSV ou linha em branco)
    if (!name) {
      skippedRows++;
      continue;
    }

    parsedRows++;
    const cpf = cols[3]?.trim() || null;
    const key = cpf || `no-cpf-${i}`; // dedup por CPF; sem CPF usa posicao como chave unica

    const serviceFee = parseBRL(cols[13]);
    const imageRightsFee = parseBRL(cols[14]);
    const agencyFee = parseBRL(cols[15]);
    const totalFee = parseBRL(cols[16]);
    const numDays = parseInt(cols[17] ?? '') || 1;

    if (members[key]) {
      // Membro ja existe (mesmo CPF): somar dias de trabalho e manter o maior total
      members[key].num_days = (members[key].num_days as number) + numDays;
      if (totalFee > (members[key].total_fee as number)) {
        members[key].service_fee = serviceFee;
        members[key].image_rights_fee = imageRightsFee;
        members[key].agency_fee = agencyFee;
        members[key].total_fee = totalFee;
      }
    } else {
      members[key] = {
        tenant_id: auth.tenantId,
        job_id,
        name,
        cast_category: cols[2]?.trim()?.toLowerCase() || 'ator',
        cpf,
        rg: cols[4]?.trim() || null,
        birth_date: parseDate(cols[5]) || null,
        drt: cols[6]?.trim() || null,
        address: cols[7]?.trim() || null,
        city: cols[8]?.trim() || null,
        state: cols[9]?.trim() || null,
        zip_code: cols[10]?.trim() || null,
        email: cols[11]?.trim() || null,
        phone: cols[12]?.trim() || null,
        service_fee: serviceFee,
        image_rights_fee: imageRightsFee,
        agency_fee: agencyFee,
        total_fee: totalFee,
        num_days: numDays,
        profession: cols[18]?.trim() || null,
        scenes_description: cols[19]?.trim() || null,
        casting_agency: castingAgency,
        data_status: 'completo',
        contract_status: 'pendente',
        sort_order: 0,
        created_by: auth.userId,
      };
    }
  }

  const rows = Object.values(members);

  if (rows.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Nenhum membro do elenco encontrado no CSV',
      400,
    );
  }

  console.log('[job-cast/import-csv] inserindo', rows.length, 'membros (', parsedRows, 'linhas parseadas,', skippedRows, 'ignoradas)');

  const { data, error: insertErr } = await supabase
    .from('job_cast')
    .insert(rows)
    .select();

  if (insertErr) {
    console.error('[job-cast/import-csv] erro ao inserir em lote:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[job-cast/import-csv] importacao concluida:', data?.length, 'registros inseridos');

  return created(
    {
      inserted: data?.length ?? 0,
      casting_agency: castingAgency,
      data,
    },
    req,
  );
}
