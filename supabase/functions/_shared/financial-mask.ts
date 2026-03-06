/**
 * Mascaramento de dados financeiros sensíveis por role.
 *
 * Fonte de verdade sincronizada com frontend/src/lib/access-control-map.ts
 * (FINANCIAL_VIEW_ROLES e FEE_VIEW_ROLES definidos lá).
 *
 * Regras:
 *  - FINANCIAL_VIEW_ROLES → acesso completo a todos os campos
 *  - view_restricted (dp, atd, cco, dc, pos) → veem apenas budget_estimated / budget_approved
 *  - Demais roles → todos os campos financeiros retornam null
 */

// Roles com acesso financeiro completo (espelho de access-control-map.ts)
const FINANCIAL_VIEW_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

// Roles que podem ver fee/cache da equipe (espelho de access-control-map.ts)
const FEE_VIEW_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

/**
 * Campos financeiros confidenciais do job.
 * São mascarados (→ null) para qualquer role fora de FINANCIAL_VIEW_ROLES,
 * exceto os campos de orçamento que view_restricted pode ver.
 */
const FINANCIAL_FIELDS: string[] = [
  'closed_value',
  'production_cost',
  'other_costs',
  'tax_percentage',
  'tax_value',
  'gross_profit',
  'margin_percentage',
  'agency_commission_percentage',
  'budget_estimated',
  'budget_approved',
];

/**
 * Subset de FINANCIAL_FIELDS que roles "view_restricted" podem ver
 * (Diretor de Produção, Atendimento, CCO, Diretor Criativo, Pós).
 */
const RESTRICTED_ALLOWED_FIELDS: string[] = ['budget_estimated', 'budget_approved'];

/**
 * Roles cujo acesso financeiro é "view_restricted":
 * veem apenas orçamento estimado/aprovado, nada confidencial.
 * Inclui user_role e team_role values relevantes.
 */
const VIEW_RESTRICTED_ROLES = [
  'diretor',
  'coordenador',
  'atendimento',
  'comercial',
  // team_roles que caem em grupos dc / dp / coord / pos / da / cas / cco
  'diretor_producao',
  'cco',
];

/**
 * Mascara os campos financeiros de um objeto job de acordo com o role do usuário.
 *
 * @param job   - Objeto retornado pelo banco (já passado por mapDbToApi ou não)
 * @param role  - auth.role do usuário autenticado
 * @returns     - Cópia do objeto com campos sensíveis nullificados conforme permissão
 */
export function maskFinancialData(
  job: Record<string, unknown>,
  role: string,
): Record<string, unknown> {
  // Acesso completo: retorna sem modificação
  if (FINANCIAL_VIEW_ROLES.includes(role)) {
    return job;
  }

  const masked = { ...job };

  for (const field of FINANCIAL_FIELDS) {
    // view_restricted: mantém apenas orçamento estimado/aprovado
    if (VIEW_RESTRICTED_ROLES.includes(role) && RESTRICTED_ALLOWED_FIELDS.includes(field)) {
      continue;
    }
    // Freelancer e demais roles sem acesso: null em tudo
    masked[field] = null;
  }

  return masked;
}

/**
 * Mascara o campo fee/rate de cada membro da equipe para roles sem acesso.
 *
 * @param members - Array de membros já mapeados para o formato da API
 * @param role    - auth.role do usuário autenticado
 * @returns       - Array com fee/rate nullificados para roles sem permissão
 */
export function maskTeamFees(
  members: Array<Record<string, unknown>>,
  role: string,
): Array<Record<string, unknown>> {
  if (FEE_VIEW_ROLES.includes(role)) {
    return members;
  }

  return members.map((m) => ({ ...m, fee: null, rate: null }));
}

/**
 * Retorna true se o role tem acesso financeiro completo.
 */
export function canViewFinancials(role: string): boolean {
  return FINANCIAL_VIEW_ROLES.includes(role);
}

/**
 * Retorna true se o role pode ver fee/cache da equipe.
 */
export function canViewFees(role: string): boolean {
  return FEE_VIEW_ROLES.includes(role);
}
