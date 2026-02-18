import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AppError } from './errors.ts';

// Contexto de autenticacao extraido do JWT
export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  token: string;
}

// Extrai e valida autenticacao do request
export async function getAuthContext(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Token de autenticacao ausente', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Token invalido ou expirado', 401);
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    throw new AppError('FORBIDDEN', 'Usuario sem tenant associado', 403);
  }

  return {
    userId: user.id,
    tenantId,
    email: user.email ?? '',
    role: user.app_metadata?.role ?? 'freelancer',
    token,
  };
}
