import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { createMockHashService } from '../../../../helpers/mock-factories';
import { ChangeOwnCustomerPasswordUseCase } from '@application/use-cases/auth/change-own-customer-password.use-case';

describe('ChangeOwnCustomerPasswordUseCase', () => {
  let useCase: ChangeOwnCustomerPasswordUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    useCase = new ChangeOwnCustomerPasswordUseCase(customerRepository, hashService);
  });

  it('should change the password when current password matches', async () => {
    const customer = createMockCustomer();
    const originalPasswordHash = customer.passwordHash;
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);
    customerRepository.update.mockResolvedValue(customer);

    await useCase.execute(customer.id, {
      currentPassword: 'Senha@123',
      newPassword: 'NovaSenha@456',
    });

    expect(hashService.compare).toHaveBeenCalledWith('Senha@123', originalPasswordHash);
    expect(hashService.hash).toHaveBeenCalledWith('NovaSenha@456');
    expect(customerRepository.update).toHaveBeenCalledWith(customer);
  });

  it('should throw UnauthorizedAccessException if current password does not match', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(customer.id, { currentPassword: 'errada', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('should throw DomainValidationException if new password is weak', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(customer.id, { currentPassword: 'Senha@123', newPassword: 'weak' }),
    ).rejects.toThrow(DomainValidationException);
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException if customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { currentPassword: 'x', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
