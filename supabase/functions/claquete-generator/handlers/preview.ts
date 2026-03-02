import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AuthContext } from '../../_shared/auth.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { error } from '../../_shared/response.ts';
import { buildClaqueteHtml, type ClaqueteData } from '../../_shared/claquete-template.ts';

// Retorna HTML da claquete para preview no frontend (GET /claquete-generator/preview/:id)
export async function previewHandler(
  req: Request,
  auth: AuthContext,
  claqueteId: string | null,
): Promise<Response> {
  if (!claqueteId) {
    return error('VALIDATION_ERROR', 'ID da claquete e obrigatorio', 400, undefined, req);
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error: dbError } = await client
    .from('claquetes')
    .select('*')
    .eq('id', claqueteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (dbError) {
    console.error('[claquete-generator] preview error:', dbError.message);
    return error('INTERNAL_ERROR', `Falha ao buscar claquete: ${dbError.message}`, 500, undefined, req);
  }

  if (!data) {
    return error('NOT_FOUND', 'Claquete nao encontrada', 404, undefined, req);
  }

  // Montar dados para o template
  const claqueteData: ClaqueteData = {
    title: (data.title as string) ?? '',
    duration: (data.duration as string) ?? '',
    product: (data.product as string) ?? '',
    advertiser: (data.advertiser as string) ?? '',
    agency: (data.agency as string) ?? '',
    director: (data.director as string) ?? '',
    type: (data.type as string) ?? 'COMUM',
    segment: (data.segment as string) ?? 'TODOS OS SEGMENTOS DE MERCADO',
    crt: (data.crt as string) ?? '',
    production_company: (data.production_company as string) ?? '',
    cnpj: (data.cnpj as string) ?? '',
    audio_company: (data.audio_company as string) ?? '',
    production_year: (data.production_year as number) ?? new Date().getFullYear(),
    closed_caption: (data.closed_caption as boolean) ?? false,
    sap_key: (data.sap_key as boolean) ?? false,
    libras: (data.libras as boolean) ?? false,
    audio_description: (data.audio_description as boolean) ?? false,
  };

  const html = buildClaqueteHtml(claqueteData);

  return new Response(html, {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
