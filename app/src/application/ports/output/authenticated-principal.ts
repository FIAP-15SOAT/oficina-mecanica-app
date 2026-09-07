import { UserRole } from '@domain/enums/user-role.enum';
import { AuthFlow } from '@domain/enums/auth-flow.enum';

/**
 * O campo authFlow é sempre atribuído pela estratégia Passport que validou o
 * token (JwtStrategy ou CustomerJwtStrategy) — nunca lido do próprio token,
 * para que o valor não dependa do conteúdo apresentado pelo cliente.
 */
export type AuthenticatedPrincipal =
  | { sub: string; authFlow: AuthFlow.INTERNAL; email: string; role: UserRole }
  | { sub: string; authFlow: AuthFlow.CUSTOMER; email: string };
