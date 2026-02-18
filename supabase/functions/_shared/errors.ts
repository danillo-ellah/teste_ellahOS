// Codigos de erro padronizados da API
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

// Erro de aplicacao com codigo, mensagem e status HTTP
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
