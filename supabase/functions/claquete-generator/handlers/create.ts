import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { created, error } from '../../_shared/response.ts';
import { buildClaqueteHtml, type ClaqueteData } from '../../_shared/claquete-template.ts';

// Schema de validacao para criar claquete
const createSchema = z.object({
  job_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  duration: z.string().min(1).max(20),
  product: z.string().max(300).optional().default(''),
  advertiser: z.string().max(300).optional().default(''),
  agency: z.string().max(300).optional().default(''),
  director: z.string().max(300).optional().default(''),
  type: z.string().max(100).optional().default('COMUM'),
  segment: z.string().max(300).optional().default('TODOS OS SEGMENTOS DE MERCADO'),
  crt: z.string().max(50).optional().default(''),
  production_company: z.string().max(300).optional().default(''),
  cnpj: z.string().max(20).optional().default(''),
  audio_company: z.string().max(300).optional().default(''),
  production_year: z.number().int().min(1900).max(2100).optional(),
  closed_caption: z.boolean().optional().default(false),
  sap_key: z.boolean().optional().default(false),
  libras: z.boolean().optional().default(false),
  audio_description: z.boolean().optional().default(false),
});

// Cria claquete e gera HTML (POST /claquete-generator)
export async function createHandler(req: Request, auth: AuthContext): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400, undefined, req);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error('VALIDATION_ERROR', 'Dados invalidos', 400, { issues: parsed.error.issues }, req);
  }

  const input = parsed.data;

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  // Buscar proxima versao
  const { data: latestVersion } = await client
    .from('claquetes')
    .select('version')
    .eq('job_id', input.job_id)
    .is('deleted_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latestVersion?.version as number) ?? 0) + 1;

  // Se production_company e cnpj nao foram passados, buscar do tenant
  let productionCompany = input.production_company;
  let cnpj = input.cnpj;

  if (!productionCompany || !cnpj) {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('name, cnpj')
      .eq('id', auth.tenantId)
      .single();

    if (tenant) {
      if (!productionCompany) productionCompany = (tenant.name as string) ?? '';
      if (!cnpj) cnpj = (tenant.cnpj as string) ?? '';
    }
  }

  // Converter strings vazias em null para campos com CHECK constraints
  const safeStr = (v: string | undefined): string | null => v && v.trim() ? v.trim() : null;

  // Inserir no banco
  const { data: claquete, error: dbError } = await client
    .from('claquetes')
    .insert({
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      version: nextVersion,
      title: input.title,
      duration: input.duration,
      product: safeStr(input.product),
      advertiser: safeStr(input.advertiser),
      agency: safeStr(input.agency),
      director: safeStr(input.director),
      type: input.type || 'COMUM',
      segment: safeStr(input.segment),
      crt: safeStr(input.crt),
      production_company: safeStr(productionCompany),
      cnpj: safeStr(cnpj),
      audio_company: safeStr(input.audio_company),
      production_year: input.production_year ?? new Date().getFullYear(),
      closed_caption: input.closed_caption,
      sap_key: input.sap_key,
      libras: input.libras,
      audio_description: input.audio_description,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (dbError || !claquete) {
    console.error('[claquete-generator] create error:', dbError?.message);
    return error('INTERNAL_ERROR', `Falha ao criar claquete: ${dbError?.message}`, 500, undefined, req);
  }

  // Gerar HTML para preview (retornado como campo extra)
  const claqueteData: ClaqueteData = {
    title: input.title,
    duration: input.duration,
    product: input.product || '',
    advertiser: input.advertiser || '',
    agency: input.agency || '',
    director: input.director || '',
    type: input.type || 'COMUM',
    segment: input.segment || 'TODOS OS SEGMENTOS DE MERCADO',
    crt: input.crt || '',
    production_company: productionCompany,
    cnpj: cnpj,
    audio_company: input.audio_company || '',
    production_year: input.production_year ?? new Date().getFullYear(),
    closed_caption: input.closed_caption ?? false,
    sap_key: input.sap_key ?? false,
    libras: input.libras ?? false,
    audio_description: input.audio_description ?? false,
  };

  const html = buildClaqueteHtml(claqueteData);

  console.log(
    `[claquete-generator] claquete criada: id=${claquete.id}, job=${input.job_id}, version=${nextVersion}`,
  );

  return created({ ...claquete, _preview_html: html }, req);
}
