import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new DeleteUserUseCase(userRepository);
  });

  it('should delete existing user', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.delete.mockResolvedValue();

    await useCase.execute('user-uuid-123');

    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
    expect(userRepository.delete).toHaveBeenCalledWith('user-uuid-123');
  });

  it('should throw NotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
    expect(userRepository.delete).not.toHaveBeenCalled();
  });
});
