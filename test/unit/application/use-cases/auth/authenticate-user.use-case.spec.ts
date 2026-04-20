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

  it('deve autenticar usuário com sucesso e retornar tokens', async () => {
    const user = createMockUser();
    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'rafael@email.com',
      password: 'Senha@123',
    });

    expect(result.accessToken).toBe('access-token-mock');
    expect(result.refreshToken).toBe('refresh-token-mock');
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe(user.email);
    expect(tokenService.signTokenPair).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it('deve lançar UnauthorizedAccessException se usuário não existir', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'naoexiste@email.com', password: '123456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('deve lançar UnauthorizedAccessException se usuário estiver desativado', async () => {
    const user = createMockUser({ isActive: false });
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ email: 'rafael@email.com', password: 'Senha@123' }),
    ).rejects.toThrow('Usuário desativado');
  });

  it('deve lançar UnauthorizedAccessException se senha estiver incorreta', async () => {
    const user = createMockUser();
    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'rafael@email.com', password: 'errada' }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('não deve gerar tokens se autenticação falhar', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'rafael@email.com', password: '123456' }),
    ).rejects.toThrow();

    expect(tokenService.signTokenPair).not.toHaveBeenCalled();
  });
});
