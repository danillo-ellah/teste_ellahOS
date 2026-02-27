import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para criar vendors
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de criacao de vendor
const CreateVendorSchema = z.object({
  full_name: z.string().min(2).max(200),
  entity_type: z.enum(['pf', 'pj']).default('pf'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 digitos').optional(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 digitos').optional(),
  razao_social: z.string().optional(),
  email: z.string().email('Email invalido').optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  people_id: z.string().uuid().optional(),
  bank_account: z
    .object({
      bank_name: z.string().optional(),
      bank_code: z.string().optional(),
      agency: z.string().optional(),
      account_number: z.string().optional(),
      account_type: z.enum(['corrente', 'poupanca']).optional(),
      pix_key: z.string().optional(),
      pix_key_type: z
        .enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'])
        .optional(),
    })
    .optional(),
});

// Normaliza nome de vendor no JavaScript — mesma logica do banco (lowercase, sem acentos, sem especiais)
function normalizeVendorNameJs(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s\-]/g, '') // remove caracteres especiais exceto hifen
    .trim()
    .toLowerCase();
}

export async function createVendor(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[vendors/create] iniciando criacao de vendor', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas financeiro, admin e ceo podem cadastrar vendors',
      403,
    );
  }

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(CreateVendorSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // === Dedup: verificar por nome normalizado ===
  const normalizedName = normalizeVendorNameJs(validated.full_name);

  const { data: byName, error: nameErr } = await supabase
    .from('vendors')
    .select('id, full_name, email')
    .eq('tenant_id', auth.tenantId)
    .eq('normalized_name', normalizedName)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (nameErr) {
    console.error('[vendors/create] erro ao verificar duplicata por nome:', nameErr);
    throw new AppError('INTERNAL_ERROR', nameErr.message, 500);
  }

  if (byName) {
    console.log('[vendors/create] vendor duplicado por nome:', byName.id);
    return new Response(
      JSON.stringify({
        error: {
          code: 'DUPLICATE_VENDOR',
          message: 'Vendor com este nome ja existe',
          details: {
            existing_vendor: {
              id: byName.id,
              full_name: byName.full_name,
              email: byName.email,
              similarity_score: 1.0,
            },
          },
        },
      }),
      {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',
        },
      },
    );
  }

  // === Dedup: verificar por CPF ===
  if (validated.cpf) {
    const { data: byCpf } = await supabase
      .from('vendors')
      .select('id, full_name, email')
      .eq('tenant_id', auth.tenantId)
      .eq('cpf', validated.cpf)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (byCpf) {
      console.log('[vendors/create] vendor duplicado por CPF:', byCpf.id);
      return new Response(
        JSON.stringify({
          error: {
            code: 'DUPLICATE_VENDOR',
            message: 'Vendor com este CPF ja existe',
            details: {
              existing_vendor: {
                id: byCpf.id,
                full_name: byCpf.full_name,
                email: byCpf.email,
                similarity_score: 1.0,
              },
            },
          },
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers':
              'authorization, x-client-info, apikey, content-type',
          },
        },
      );
    }
  }

  // === Dedup: verificar por CNPJ ===
  if (validated.cnpj) {
    const { data: byCnpj } = await supabase
      .from('vendors')
      .select('id, full_name, email')
      .eq('tenant_id', auth.tenantId)
      .eq('cnpj', validated.cnpj)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (byCnpj) {
      console.log('[vendors/create] vendor duplicado por CNPJ:', byCnpj.id);
      return new Response(
        JSON.stringify({
          error: {
            code: 'DUPLICATE_VENDOR',
            message: 'Vendor com este CNPJ ja existe',
            details: {
              existing_vendor: {
                id: byCnpj.id,
                full_name: byCnpj.full_name,
                email: byCnpj.email,
                similarity_score: 1.0,
              },
            },
          },
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers':
              'authorization, x-client-info, apikey, content-type',
          },
        },
      );
    }
  }

  // === Dedup: verificar por email ===
  if (validated.email) {
    const { data: byEmail } = await supabase
      .from('vendors')
      .select('id, full_name, email')
      .eq('tenant_id', auth.tenantId)
      .eq('email', validated.email)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (byEmail) {
      console.log('[vendors/create] vendor duplicado por email:', byEmail.id);
      return new Response(
        JSON.stringify({
          error: {
            code: 'DUPLICATE_VENDOR',
            message: 'Vendor com este email ja existe',
            details: {
              existing_vendor: {
                id: byEmail.id,
                full_name: byEmail.full_name,
                email: byEmail.email,
                similarity_score: 0.85,
              },
            },
          },
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers':
              'authorization, x-client-info, apikey, content-type',
          },
        },
      );
    }
  }

  // === Inserir vendor ===
  const { bank_account, ...vendorFields } = validated;

  const { data: vendor, error: insertErr } = await supabase
    .from('vendors')
    .insert({
      ...vendorFields,
      tenant_id: auth.tenantId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[vendors/create] erro ao inserir vendor:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[vendors/create] vendor criado:', vendor.id);

  // === Inserir bank_account se fornecido ===
  let bankAccountData = null;
  if (bank_account) {
    const { data: ba, error: baErr } = await supabase
      .from('bank_accounts')
      .insert({
        ...bank_account,
        vendor_id: vendor.id,
        tenant_id: auth.tenantId,
        is_primary: true,
      })
      .select()
      .single();

    if (baErr) {
      console.error('[vendors/create] erro ao inserir bank_account:', baErr);
      // Nao falhar a criacao do vendor por causa do bank_account
    } else {
      bankAccountData = ba;
      console.log('[vendors/create] bank_account criado:', ba.id);
    }
  }

  return created({ ...vendor, bank_accounts: bankAccountData ? [bankAccountData] : [] });
}
