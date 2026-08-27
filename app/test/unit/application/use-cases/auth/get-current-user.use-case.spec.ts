import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new GetCurrentUserUseCase(userRepository);
  });

  it('should return authenticated user data', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-uuid-123');

    expect(result).toEqual({
      id: user.id,
      name: user.name,
      email: user.email.value,
      document: user.document.value,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
  });

  it('should throw NotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
  });
});
