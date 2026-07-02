import { randomUUID } from 'node:crypto';

import { AuthController } from '@infrastructure/http/auth/auth.controller';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';

import { LoginRequestDto } from '@infrastructure/http/auth/dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from '@infrastructure/http/auth/dto/requests/refresh-token-request.dto';
import { AuthenticatedUser } from '@infrastructure/auth/current-user.decorator';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

import { UserRole } from '@domain/enums/user-role.enum';

describe('AuthController', () => {
  let httpController: AuthController;
  let cleanController: AuthCleanController;

  beforeEach(() => {
    cleanController = new AuthCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new AuthController(cleanController);
  });

  describe('login', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: LoginRequestDto = { email: 'joao@email.com', password: 'SecurePass123!' };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: randomUUID(), name: 'João', email: dto.email, role: UserRole.ATTENDANT },
      };

      const response = AuthPresenter.toAuthDataResponse(authResult);

      jest.spyOn(cleanController, 'login').mockResolvedValue(response);

      const result = await httpController.login(dto);

      expect(result).toBe(response);
      expect(cleanController.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: RefreshTokenRequestDto = { refreshToken: 'valid-refresh-token' };

      const refreshResult: AuthenticateUserOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: randomUUID(), name: 'João', email: 'joao@email.com', role: UserRole.ATTENDANT },
      };

      const response = AuthPresenter.toAuthDataResponse(refreshResult);

      jest.spyOn(cleanController, 'refresh').mockResolvedValue(response);

      const result = await httpController.refresh(dto);

      expect(result).toBe(response);
      expect(cleanController.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('me', () => {
    it('should delegate to the clean controller with the current user id', async () => {
      const authenticatedUser: AuthenticatedUser = {
        sub: randomUUID(),
        email: 'joao@email.com',
        role: UserRole.ATTENDANT,
      };

      const currentUser: GetCurrentUserOutputDto = {
        id: authenticatedUser.sub,
        name: 'João',
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = AuthPresenter.toMeDataResponse(currentUser);

      jest.spyOn(cleanController, 'me').mockResolvedValue(response);

      const result = await httpController.me(authenticatedUser);

      expect(result).toBe(response);
      expect(cleanController.me).toHaveBeenCalledWith(authenticatedUser.sub);
    });
  });
});
