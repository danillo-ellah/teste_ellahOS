import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { success, error } from '../../_shared/response.ts';

// Schema de validacao para atualizar claquete (todos os campos opcionais)
const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  duration: z.string().min(1).max(20).optional(),
  product: z.string().max(300).optional(),
  advertiser: z.string().max(300).optional(),
  agency: z.string().max(300).optional(),
  director: z.string().max(300).optional(),
  type: z.string().max(100).optional(),
  segment: z.string().max(300).optional(),
  crt: z.string().max(50).optional(),
  production_company: z.string().max(300).optional(),
  cnpj: z.string().max(20).optional(),
  audio_company: z.string().max(300).optional(),
  production_year: z.number().int().min(1900).max(2100).optional(),
  closed_caption: z.boolean().optional(),
  sap_key: z.boolean().optional(),
  libras: z.boolean().optional(),
  audio_description: z.boolean().optional(),
  // URLs de arquivos gerados (preenchidos pelo frontend apos gerar PDF/PNG)
  pdf_url: z.string().url().optional(),
  png_url: z.string().url().optional(),
  drive_file_id: z.string().optional(),
});

// Atualiza campos da claquete (PATCH /claquete-generator/:id)
export async function updateHandler(req: Request, auth: AuthContext, claqueteId: string): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400, undefined, req);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return error('VALIDATION_ERROR', 'Dados invalidos', 400, { issues: parsed.error.issues }, req);
  }

  const updates = parsed.data;

  // Remover campos undefined (nao passados)
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  if (Object.keys(cleanUpdates).length === 0) {
    return error('VALIDATION_ERROR', 'Nenhum campo para atualizar', 400, undefined, req);
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error: dbError } = await client
    .from('claquetes')
    .update(cleanUpdates)
    .eq('id', claqueteId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (dbError) {
    console.error('[claquete-generator] update error:', dbError.message);
    return error('INTERNAL_ERROR', `Falha ao atualizar claquete: ${dbError.message}`, 500, undefined, req);
  }

  if (!data) {
    return error('NOT_FOUND', 'Claquete nao encontrada', 404, undefined, req);
  }

  console.log(`[claquete-generator] claquete atualizada: id=${claqueteId}`);
  return success(data, 200, req);
}
