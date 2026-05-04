import { randomUUID } from 'node:crypto';
import { AuthController } from '@presentation/auth/auth.controller';
import { IAuthenticateUserUseCase } from '@domain/interfaces/use-cases/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@domain/interfaces/use-cases/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@domain/interfaces/use-cases/auth/refresh-token.use-case.interface';
import { LoginRequestDto } from '@presentation/auth/dto/login-request.dto';
import { RefreshTokenRequestDto } from '@presentation/auth/dto/refresh-token-request.dto';
import { UserRole } from '@domain/enums/user-role.enum';
import { AuthenticatedUser } from '@infrastructure/auth/current-user.decorator';

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
    it('should authenticate user and return tokens', async () => {
      const request: LoginRequestDto = {
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
      };

      const userId = randomUUID();
      const authResult = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-uuid',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: UserRole.ATTENDANT,
        },
      };

      authenticateUseCase.execute.mockResolvedValue(authResult);

      const result = await controller.login(request);

      expect(result).toEqual({ data: authResult });
      expect(authenticateUseCase.execute).toHaveBeenCalledWith({
        email: request.email,
        password: request.password,
      });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const request: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };

      const userId = randomUUID();
      const refreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: UserRole.ATTENDANT,
        },
      };

      refreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const result = await controller.refresh(request);

      expect(result).toEqual({ data: refreshResult });
      expect(refreshTokenUseCase.execute).toHaveBeenCalledWith({
        refreshToken: request.refreshToken,
      });
    });
  });

  describe('me', () => {
    it('should return current user data', async () => {
      const userId = randomUUID();
      const authenticatedUser: AuthenticatedUser = {
        sub: userId,
        email: 'john.doe@example.com',
        role: UserRole.ATTENDANT,
      };

      const currentUser = {
        id: userId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: UserRole.ATTENDANT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getCurrentUserUseCase.execute.mockResolvedValue(currentUser);

      const result = await controller.me(authenticatedUser);

      expect(result).toEqual({ data: currentUser });
      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });
});
