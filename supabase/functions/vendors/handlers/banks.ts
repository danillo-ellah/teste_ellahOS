import { success } from '../../_shared/response.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Lista estatica de bancos brasileiros mais comuns
const BRAZILIAN_BANKS = [
  { code: '1', name: 'Banco do Brasil' },
  { code: '33', name: 'Santander' },
  { code: '77', name: 'Banco Inter' },
  { code: '104', name: 'Caixa Economica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nubank' },
  { code: '336', name: 'Banco C6' },
  { code: '341', name: 'Itau Unibanco' },
  { code: '422', name: 'Safra' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '212', name: 'Banco Original' },
  { code: '655', name: 'Neon / Votorantim' },
  { code: '380', name: 'PicPay' },
  { code: '290', name: 'PagSeguro' },
  { code: '403', name: 'Cora' },
];

export async function listBanks(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[vendors/banks] listando bancos brasileiros', {
    userId: auth.userId,
  });

  return success(BRAZILIAN_BANKS);
}
