import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { AuthenticationFailedException } from '@infrastructure/exceptions/authentication-failed.exception';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@infrastructure/auth/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  describe('handleRequest', () => {
    it('should return user when no error and user is provided', () => {
      const user = { sub: 'user-id', email: 'user@example.com' };

      const result = guard.handleRequest(null, user);

      expect(result).toBe(user);
    });

    it('should throw AuthenticationFailedException when err is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null)).toThrow(AuthenticationFailedException);
      expect(() => guard.handleRequest(error, null)).toThrow(
        'Token de autenticação inválido ou ausente.',
      );
    });

    it('should throw AuthenticationFailedException when user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(AuthenticationFailedException);
    });

    it('should throw AuthenticationFailedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(AuthenticationFailedException);
    });

    it('should throw AuthenticationFailedException when user is false', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(AuthenticationFailedException);
    });

    it('should throw AuthenticationFailedException when both err and user are present', () => {
      const error = new Error('Some error');
      const user = { sub: 'user-id' };

      expect(() => guard.handleRequest(error, user)).toThrow(AuthenticationFailedException);
    });
  });

  describe('canActivate', () => {
    let reflector: jest.Mocked<Reflector>;
    let context: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      reflector = {
        getAllAndOverride: jest.fn(),
      } as any;
      context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
      guard = new JwtAuthGuard(reflector);
    });

    it('should return true when route is public', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate when route is not public', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const superCanActivateSpy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);

      superCanActivateSpy.mockRestore();
    });
  });
});
