import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { success, error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { callGroq } from '../_shared/groq-client.ts';

// POST /emoji-suggest
// Body: { phase_label: string }
// Response: { data: { emojis: string[] } }

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);

    if (req.method !== 'POST') {
      return error('METHOD_NOT_ALLOWED', 'Apenas POST e permitido', 405, undefined, req);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
    }

    const phaseLabel =
      body && typeof body === 'object' && 'phase_label' in (body as object)
        ? String((body as Record<string, unknown>).phase_label ?? '').trim()
        : '';

    if (!phaseLabel) {
      throw new AppError('VALIDATION_ERROR', 'phase_label e obrigatorio', 400);
    }

    if (phaseLabel.length > 200) {
      throw new AppError('VALIDATION_ERROR', 'phase_label muito longo (max 200 chars)', 400);
    }

    // Criamos o cliente Supabase com o token do usuario para acessar o Vault
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
    );

    const groqResponse = await callGroq(supabaseClient, {
      system: `Voce e um assistente especializado em producao audiovisual. Sua tarefa e sugerir emojis para nomes de fases de projetos audiovisuais. Responda APENAS com os emojis solicitados, sem nenhum texto adicional, explicacao ou pontuacao. Use apenas emojis Unicode validos.`,
      messages: [
        {
          role: 'user',
          content: `Sugira exatamente 4 emojis que melhor representam esta fase de producao audiovisual: "${phaseLabel}".
Responda APENAS com os 4 emojis separados por espaco, sem texto adicional, sem numeros, sem pontuacao.
Exemplo de resposta valida: 🎬 🎥 📹 🎞️`,
        },
      ],
      max_tokens: 30,
      temperature: 0.7,
    });

    // Extrair emojis da resposta — filtrar caracteres que sao emojis ou whitespace
    const raw = groqResponse.content.trim();

    // Regex para extrair sequencias de emoji Unicode (incluindo ZWJ, variation selectors, etc.)
    const emojiRegex =
      /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;

    const extracted = raw.match(emojiRegex) ?? [];

    // Fallback: split por espaco e filtrar strings nao-ASCII (provavelmente emojis)
    let emojis: string[] = extracted;
    if (emojis.length === 0) {
      emojis = raw
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && /[^\x00-\x7F]/.test(s))
        .slice(0, 4);
    }

    // Limitar a 4 emojis
    emojis = emojis.slice(0, 4);

    // Se a IA nao retornou emojis validos, retornar conjunto padrao baseado em palavras-chave
    if (emojis.length === 0) {
      console.warn(`[emoji-suggest] IA nao retornou emojis validos para: "${phaseLabel}". Raw: "${raw}"`);
      emojis = ['📋', '🎬', '✅', '🎯'];
    }

    console.log(`[emoji-suggest] user=${auth.userId} label="${phaseLabel}" emojis=${emojis.join(' ')}`);

    return success({ emojis }, 200, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[emoji-suggest] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
