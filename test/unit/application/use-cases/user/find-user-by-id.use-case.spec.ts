import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';

describe('FindUserByIdUseCase', () => {
  let useCase: FindUserByIdUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new FindUserByIdUseCase(userRepository);
  });

  it('should return user by ID', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-uuid-123');

    expect(result.id).toBe(user.id);
    expect(result.name).toBe(user.name);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should throw NotFoundException if not found', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
  });
});
