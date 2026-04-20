import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new UpdateUserUseCase(userRepository, hashService);
  });

  it('deve atualizar o nome do usuário', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(async (_id, data) =>
      createMockUser({ name: data.name }),
    );

    const result = await useCase.execute('user-uuid-123', { name: 'Novo Nome' });

    expect(result.name).toBe('Novo Nome');
  });

  it('deve atualizar o e-mail verificando unicidade', async () => {
    const user = createMockUser({ email: 'antigo@email.com' });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.update.mockImplementation(async (_id, data) =>
      createMockUser({ email: data.email }),
    );

    const result = await useCase.execute('user-uuid-123', { email: 'novo@email.com' });

    expect(result.email).toBe('novo@email.com');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('novo@email.com');
  });

  it('deve permitir manter o mesmo e-mail', async () => {
    const user = createMockUser({ email: 'rafael@email.com' });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(async () => user);

    await useCase.execute('user-uuid-123', { email: 'rafael@email.com' });

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('deve lançar ResourceConflictException se novo e-mail já existir', async () => {
    const user = createMockUser({ email: 'antigo@email.com' });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByEmail.mockResolvedValue(createMockUser({ id: 'outro-id' }));

    await expect(
      useCase.execute('user-uuid-123', { email: 'existente@email.com' }),
    ).rejects.toThrow(ResourceConflictException);
  });

  it('deve atualizar a role', async () => {
    const user = createMockUser({ role: UserRole.ATTENDANT });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(async (_id, data) =>
      createMockUser({ role: data.role }),
    );

    const result = await useCase.execute('user-uuid-123', { role: UserRole.ADMIN });

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('deve atualizar a senha com hash', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(async () => createMockUser());

    await useCase.execute('user-uuid-123', { password: 'NovaSenha@123' });

    expect(hashService.hash).toHaveBeenCalledWith('NovaSenha@123');
  });

  it('deve lançar ResourceNotFoundException se usuário não existir', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente', { name: 'Novo' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
