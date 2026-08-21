import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { ChangeOwnUserPasswordUseCase } from '@application/use-cases/user/change-own-user-password.use-case';

describe('ChangeOwnUserPasswordUseCase', () => {
  let useCase: ChangeOwnUserPasswordUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new ChangeOwnUserPasswordUseCase(userRepository, hashService);
  });

  it('should change the password when current password matches', async () => {
    const user = createMockUser();
    const originalPasswordHash = user.passwordHash;
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);
    userRepository.update.mockResolvedValue(user);

    await useCase.execute(user.id, { currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' });

    expect(hashService.compare).toHaveBeenCalledWith('Senha@123', originalPasswordHash);
    expect(hashService.hash).toHaveBeenCalledWith('NovaSenha@456');
    expect(userRepository.update).toHaveBeenCalledWith(user);
  });

  it('should throw UnauthorizedAccessException if current password does not match', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(user.id, { currentPassword: 'errada', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('should throw DomainValidationException if new password is weak', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(user.id, { currentPassword: 'Senha@123', newPassword: 'weak' }),
    ).rejects.toThrow(DomainValidationException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { currentPassword: 'x', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
