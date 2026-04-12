import { ResourceNotFoundException } from '../../../../../src/application/exceptions';
import { DomainValidationException } from '../../../../../src/domain/exceptions';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { ToggleUserStatusUseCase } from '../../../../../src/application/use-cases/user/toggle-user-status.use-case';

describe('ToggleUserStatusUseCase', () => {
  let useCase: ToggleUserStatusUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new ToggleUserStatusUseCase(userRepository);
  });

  describe('activate', () => {
    it('deve ativar um usuário desativado', async () => {
      const user = createMockUser({ isActive: false });
      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockImplementation(async () => createMockUser({ isActive: true }));

      const result = await useCase.activate('user-uuid-123');

      expect(result.isActive).toBe(true);
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('deve lançar DomainValidationException se já estiver ativo', async () => {
      const user = createMockUser({ isActive: true });
      userRepository.findById.mockResolvedValue(user);

      await expect(useCase.activate('user-uuid-123')).rejects.toThrow(DomainValidationException);
    });

    it('deve lançar ResourceNotFoundException se não encontrar', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.activate('inexistente')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('deactivate', () => {
    it('deve desativar um usuário ativo', async () => {
      const user = createMockUser({ isActive: true });
      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockImplementation(async () => createMockUser({ isActive: false }));

      const result = await useCase.deactivate('user-uuid-123');

      expect(result.isActive).toBe(false);
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('deve lançar DomainValidationException se já estiver desativado', async () => {
      const user = createMockUser({ isActive: false });
      userRepository.findById.mockResolvedValue(user);

      await expect(useCase.deactivate('user-uuid-123')).rejects.toThrow(DomainValidationException);
    });

    it('deve lançar ResourceNotFoundException se não encontrar', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.deactivate('inexistente')).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
