import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  createMockTokenService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    tokenService = createMockTokenService();
    useCase = new RefreshTokenUseCase(userRepository, tokenService);
  });

  it('deve renovar tokens com sucesso', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

    expect(result.accessToken).toBe('access-token-mock');
    expect(result.refreshToken).toBe('refresh-token-mock');
    expect(result.user.id).toBe(user.id);
    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    expect(tokenService.signTokenPair).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it('deve lançar UnauthorizedAccessException se refresh token for inválido', async () => {
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(useCase.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });

  it('deve lançar UnauthorizedAccessException se usuário não existir', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Usuário inválido ou desativado',
    );
  });

  it('deve lançar UnauthorizedAccessException se usuário estiver desativado', async () => {
    const user = createMockUser({ isActive: false });
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow(
      'Usuário inválido ou desativado',
    );
  });
});
