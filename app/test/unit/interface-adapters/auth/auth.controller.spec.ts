import { randomUUID } from 'node:crypto';

import { AuthController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';

import { LoginRequest } from '@interface-adapters/auth/requests/login-request';
import { RefreshTokenRequest } from '@interface-adapters/auth/requests/refresh-token-request';

import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { RefreshTokenOutputDto } from '@application/ports/input/auth/dto/refresh-token.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

import { UserRole } from '@domain/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authenticateUseCase: jest.Mocked<IAuthenticateUserUseCase>;
  let getCurrentUserUseCase: jest.Mocked<IGetCurrentUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<IRefreshTokenUseCase>;

  beforeEach(() => {
    authenticateUseCase = { execute: jest.fn() };
    getCurrentUserUseCase = { execute: jest.fn() };
    refreshTokenUseCase = { execute: jest.fn() };

    controller = new AuthController(
      authenticateUseCase,
      getCurrentUserUseCase,
      refreshTokenUseCase,
    );
  });

  describe('login', () => {
    it('should authenticate the user and return tokens wrapped in data', async () => {
      const request: LoginRequest = {
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
      };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-uuid',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: request.email,
          role: UserRole.ATTENDANT,
        },
      };

      authenticateUseCase.execute.mockResolvedValue(authResult);

      const result = await controller.login(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(authResult));
      expect(authenticateUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return them wrapped in data', async () => {
      const request: RefreshTokenRequest = { refreshToken: 'valid-refresh-token' };

      const refreshResult: RefreshTokenOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: UserRole.ATTENDANT,
        },
      };

      refreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const result = await controller.refresh(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(refreshResult));
      expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('me', () => {
    it('should return the current user data wrapped in data', async () => {
      const userId = randomUUID();

      const currentUser: GetCurrentUserOutputDto = {
        id: userId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: UserRole.ATTENDANT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getCurrentUserUseCase.execute.mockResolvedValue(currentUser);

      const result = await controller.me(userId);

      expect(result).toEqual(AuthPresenter.toMeDataResponse(currentUser));
      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });
});
