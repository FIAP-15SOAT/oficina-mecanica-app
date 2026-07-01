import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '@application/ports/output/token.service.interface';

/**
 * Alias de conveniência para TokenPayload.
 * Mantido como type alias (não interface) para evitar duplicação de contrato.
 * Se TokenPayload receber novos campos, AuthenticatedUser os herda automaticamente.
 */
export type AuthenticatedUser = TokenPayload;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: TokenPayload }>();
    return request.user;
  },
);
