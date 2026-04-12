import { ResourceNotFoundException } from '../../../../../src/application/exceptions';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { FindUserByIdUseCase } from '../../../../../src/application/use-cases/user/find-user-by-id.use-case';

describe('FindUserByIdUseCase', () => {
  let useCase: FindUserByIdUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new FindUserByIdUseCase(userRepository);
  });

  it('deve retornar usuário por ID', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-uuid-123');

    expect(result.id).toBe(user.id);
    expect(result.name).toBe(user.name);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('deve lançar NotFoundException se não encontrar', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
  });
});
