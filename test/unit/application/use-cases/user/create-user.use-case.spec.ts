import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new CreateUserUseCase(userRepository, hashService);
  });

  it('deve criar usuário com sucesso', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (user) =>
      createMockUser({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      }),
    );

    const result = await useCase.execute({
      name: 'Lucas Almeida',
      email: 'lucas@email.com',
      password: 'Senha@123',
      role: UserRole.MECHANIC,
    });

    expect(result.name).toBe('Lucas Almeida');
    expect(result.role).toBe(UserRole.MECHANIC);
    expect(hashService.hash).toHaveBeenCalledWith('Senha@123');
  });

  it('deve criar usuário desativado quando isActive=false', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (user) =>
      createMockUser({ isActive: user.isActive }),
    );

    const result = await useCase.execute({
      name: 'Ramoon Camacho',
      email: 'ramoon@email.com',
      password: 'Senha@123',
      isActive: false,
    });

    expect(result.isActive).toBe(false);
  });

  it('deve lançar ResourceConflictException se e-mail já existir', async () => {
    userRepository.findByEmail.mockResolvedValue(createMockUser());

    await expect(
      useCase.execute({
        name: 'Duplicado',
        email: 'rafael@email.com',
        password: 'Senha@123',
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
