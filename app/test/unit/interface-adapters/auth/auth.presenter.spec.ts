import { randomUUID } from 'node:crypto';

import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

import { UserRole } from '@domain/enums/user-role.enum';

describe('AuthPresenter', () => {
  describe('toAuthDataResponse', () => {
    it('should map tokens and user summary wrapped in data', () => {
      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: randomUUID(),
          name: 'João da Silva',
          email: 'joao@email.com',
          role: UserRole.MECHANIC,
        },
      };

      const result = AuthPresenter.toAuthDataResponse(authResult);

      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
      expect(result.data.user).toEqual(authResult.user);
    });
  });

  describe('toMeDataResponse', () => {
    it('should map the current user data wrapped in data', () => {
      const now = new Date();
      const currentUser: GetCurrentUserOutputDto = {
        id: randomUUID(),
        name: 'João da Silva',
        email: 'joao@email.com',
        document: '12345678909',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = AuthPresenter.toMeDataResponse(currentUser);

      expect(result.data).toEqual(currentUser);
    });
  });
});
