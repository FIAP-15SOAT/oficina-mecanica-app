import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerTokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CustomerTokenPayload }>();
    return request.user;
  },
);
