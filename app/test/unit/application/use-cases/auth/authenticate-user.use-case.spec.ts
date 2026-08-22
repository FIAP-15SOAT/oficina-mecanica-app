import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  createMockHashService,
  createMockTokenService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';

describe('AuthenticateUserUseCase', () => {
  let useCase: AuthenticateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    tokenService = createMockTokenService();
    useCase = new AuthenticateUserUseCase(userRepository, hashService, tokenService);
  });

  it('should authenticate user successfully and return tokens', async () => {
    const user = createMockUser();
    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      identifier: 'rafael@email.com',
      password: 'Senha@123',
    });

    expect(result.accessToken).toBe('access-token-mock');
    expect(result.refreshToken).toBe('refresh-token-mock');
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe(user.email.value);
    expect(tokenService.signTokenPair).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
  });

  it('should throw UnauthorizedAccessException if user does not exist', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'naoexiste@email.com', password: '123456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should throw UnauthorizedAccessException if user is deactivated', async () => {
    const user = createMockUser({ isActive: false });
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ identifier: 'rafael@email.com', password: 'Senha@123' }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('should throw UnauthorizedAccessException if password is incorrect', async () => {
    const user = createMockUser();
    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ identifier: 'rafael@email.com', password: 'errada' }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('não deve gerar tokens se autenticação falhar', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'rafael@email.com', password: '123456' }),
    ).rejects.toThrow();

    expect(tokenService.signTokenPair).not.toHaveBeenCalled();
  });

  it('should authenticate by document when identifier has no @', async () => {
    const user = createMockUser();
    userRepository.findByDocument.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      identifier: '12345678909',
      password: 'Senha@123',
    });

    expect(result.accessToken).toBe('access-token-mock');
    expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678909');
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('should sanitize a masked document identifier before lookup', async () => {
    userRepository.findByDocument.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: '123.456.789-09', password: 'Senha@123' }),
    ).rejects.toThrow('Credenciais inválidas');

    expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678909');
  });

  it('should still perform a password comparison even when the identifier is not found (timing-safety)', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'naoexiste@email.com', password: 'x' }),
    ).rejects.toThrow();

    expect(hashService.compare).toHaveBeenCalled();
  });
});
