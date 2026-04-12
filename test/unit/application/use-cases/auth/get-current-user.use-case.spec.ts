import { ResourceNotFoundException } from '../../../../../src/application/exceptions';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { GetCurrentUserUseCase } from '../../../../../src/application/use-cases/auth/get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new GetCurrentUserUseCase(userRepository);
  });

  it('deve retornar dados do usuário autenticado', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-uuid-123');

    expect(result.id).toBe(user.id);
    expect(result.name).toBe(user.name);
    expect(result.email).toBe(user.email);
    expect(result.role).toBe(user.role);
    expect(result.isActive).toBe(true);
    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
  });

  it('deve lançar NotFoundException se usuário não existir', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
  });
});
