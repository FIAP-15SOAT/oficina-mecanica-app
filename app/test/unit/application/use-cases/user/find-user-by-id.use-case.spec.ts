import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';

describe('FindUserByIdUseCase', () => {
  let useCase: FindUserByIdUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let userCustomerRepository: { findCustomersByUserId: jest.Mock };

  beforeEach(() => {
    userRepository = createMockUserRepository();
    userCustomerRepository = { findCustomersByUserId: jest.fn().mockResolvedValue([]) };
    useCase = new FindUserByIdUseCase(userRepository, userCustomerRepository as never);
  });

  it('should return user by ID', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-uuid-123');

    expect(result.id).toBe(user.id);
    expect(result.name).toBe(user.name);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should return the full, unfiltered list of linked customers', async () => {
    const user = createMockUser();
    const individual = createMockCustomer({ type: CustomerType.INDIVIDUAL });
    const company = createMockCustomer({ type: CustomerType.COMPANY });
    userRepository.findById.mockResolvedValue(user);
    userCustomerRepository.findCustomersByUserId.mockResolvedValue([individual, company]);

    const result = await useCase.execute(user.id);

    expect(userCustomerRepository.findCustomersByUserId).toHaveBeenCalledWith(user.id);
    expect(result.customers).toEqual([individual, company]);
  });

  it('should throw NotFoundException if not found', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
  });
});
