import { UserRole } from '@domain/enums/user-role.enum';

/**
 * O campo authFlow é sempre atribuído pela estratégia Passport que validou o
 * token (JwtStrategy ou CustomerJwtStrategy) — nunca lido do próprio token
 * (spec §12), para que o valor não dependa do conteúdo apresentado pelo cliente.
 */
export type AuthenticatedPrincipal =
  | { sub: string; authFlow: 'INTERNAL'; email: string; role: UserRole }
  | { sub: string; authFlow: 'CUSTOMER'; email: string };
