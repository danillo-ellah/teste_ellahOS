import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.22.4';
import { created, error } from '../../_shared/response.ts';

const LeadSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  email: z.string().email('Email invalido').max(320),
  company: z.string().min(1, 'Empresa e obrigatoria').max(200),
  phone: z.string().max(30).optional().default(''),
  message: z.string().max(2000).optional().default(''),
  source: z.string().max(50).optional().default('enterprise_page'),
  // Honeypot — campo invisivel no form; se preenchido = bot
  website: z.string().max(500).optional(),
});

// Rate limit: max 3 leads do mesmo IP em 10 minutos
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX = 3;

export async function handleSubmit(req: Request): Promise<Response> {
  // 1. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  // 2. Validate
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return error(
      'VALIDATION_ERROR',
      firstIssue?.message ?? 'Dados invalidos',
      400,
    );
  }

  const data = parsed.data;

  // 3. Honeypot — retorna 201 fake para nao alertar o bot
  if (data.website && data.website.trim().length > 0) {
    return created({ id: crypto.randomUUID(), message: 'Lead registrado com sucesso' });
  }

  // 4. IP do request
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? null;

  // 5. Service role client (bypass RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 6. Rate limit via DB
  if (ip) {
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { count } = await supabase
      .from('enterprise_leads')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', windowStart);

    if (count !== null && count >= RATE_LIMIT_MAX) {
      return error(
        'BUSINESS_RULE_VIOLATION',
        'Muitas solicitacoes. Tente novamente em alguns minutos.',
        429,
      );
    }
  }

  // 7. Insert
  const { data: lead, error: dbError } = await supabase
    .from('enterprise_leads')
    .insert({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      company: data.company.trim(),
      phone: data.phone?.trim() || null,
      message: data.message?.trim() || null,
      source: data.source,
      ip_address: ip,
      user_agent: req.headers.get('user-agent')?.substring(0, 500) || null,
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('[enterprise-leads/submit] erro DB:', dbError);
    return error('INTERNAL_ERROR', 'Erro ao registrar solicitacao', 500);
  }

  console.log(`[enterprise-leads/submit] lead criado: ${lead.id}`);

  return created({ id: lead.id, message: 'Lead registrado com sucesso' });
}
