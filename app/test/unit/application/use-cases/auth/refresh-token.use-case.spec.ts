import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  createMockTokenService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let logger: jest.Mocked<ILogger>;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    tokenService = createMockTokenService();
    logger = createMockLogger();
    useCase = new RefreshTokenUseCase(userRepository, tokenService, logger);
  });

  it('should renew tokens successfully', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

    expect(result.accessToken).toBe('access-token-mock');
    expect(result.refreshToken).toBe('refresh-token-mock');
    expect(result.user.id).toBe(user.id);
    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    expect(tokenService.signTokenPair).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
  });

  it('should throw UnauthorizedAccessException if refresh token is invalid', async () => {
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(useCase.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });

  it('should throw UnauthorizedAccessException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Refresh token inválido ou expirado',
    );
  });

  it('should throw UnauthorizedAccessException if user is deactivated', async () => {
    const user = createMockUser({ isActive: false });
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Refresh token inválido ou expirado',
    );
  });

  it('should report a distinct cause for each failure while throwing an identical message', async () => {
    tokenService.verifyRefreshToken.mockImplementationOnce(() => {
      throw new Error('expired');
    });
    await expect(useCase.execute({ refreshToken: 'bad' })).rejects.toThrow(
      'Refresh token inválido ou expirado',
    );

    userRepository.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Refresh token inválido ou expirado',
    );

    userRepository.findById.mockResolvedValueOnce(createMockUser({ isActive: false }));
    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Refresh token inválido ou expirado',
    );

    expect(logger.event.mock.calls.map((call) => call[1])).toEqual([
      { failureReason: 'invalid_token' },
      { failureReason: 'unknown_user', subjectId: 'user-uuid-123' },
      {
        failureReason: 'inactive_user',
        subjectId: 'user-uuid-123',
        subjectName: 'Rafael Neves',
        subjectEmail: 'rafael@email.com',
      },
    ]);
  });

  it('should not emit a business event on a successful refresh', async () => {
    userRepository.findById.mockResolvedValue(createMockUser());

    await useCase.execute({ refreshToken: 'valid-token' });

    expect(logger.event).not.toHaveBeenCalled();
  });
});
