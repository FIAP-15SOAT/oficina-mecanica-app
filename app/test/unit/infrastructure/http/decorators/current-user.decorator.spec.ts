import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { TokenPayload } from '@application/ports/output/token.service.interface';
import { UserRole } from '@domain/enums/user-role.enum';
import { CurrentUser } from '@infrastructure/http/decorators/current-user.decorator';

class TestController {
  handler(@CurrentUser() _user: TokenPayload): void {}
}

function getDecoratorFactory() {
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler') as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => TokenPayload }
  >;

  return Object.values(metadata)[0].factory;
}

describe('CurrentUserDecorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => TokenPayload;

  beforeEach(() => {
    factory = getDecoratorFactory();
  });

  it('should extract user from request', () => {
    const mockUser: TokenPayload = {
      sub: 'user-uuid-123',
      email: 'john@example.com',
      role: UserRole.ADMIN,
    };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as ExecutionContext;

    const result = factory(null, ctx);

    expect(result).toEqual(mockUser);
  });

  it('should return user with correct properties', () => {
    const mockUser: TokenPayload = {
      sub: 'another-user-uuid',
      email: 'jane@example.com',
      role: UserRole.MECHANIC,
    };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as ExecutionContext;

    const result = factory(null, ctx);

    expect(result.sub).toBe(mockUser.sub);
    expect(result.email).toBe(mockUser.email);
    expect(result.role).toBe(mockUser.role);
  });

  it('should handle all user roles', () => {
    const testRoles = [UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT];

    testRoles.forEach((role) => {
      const mockUser: TokenPayload = {
        sub: `user-${role}`,
        email: `${role.toLowerCase()}@example.com`,
        role,
      };

      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: mockUser }),
        }),
      } as ExecutionContext;

      const result = factory(null, ctx);

      expect(result.role).toBe(role);
    });
  });
});
