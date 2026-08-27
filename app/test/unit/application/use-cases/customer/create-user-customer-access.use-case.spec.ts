import { CreateUserCustomerAccessUseCase } from '@application/use-cases/customer/create-user-customer-access.use-case';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { PersonType } from '@domain/enums/person-type.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { Document } from '@domain/value-objects/document.vo';

describe('CreateUserCustomerAccessUseCase', () => {
  let useCase: CreateUserCustomerAccessUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let accessRepository: {
    create: jest.Mock;
    findByUserId: jest.Mock;
  };

  beforeEach(() => {
    userRepository = createMockUserRepository();
    customerRepository = createMockCustomerRepository();
    accessRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
    };
    useCase = new CreateUserCustomerAccessUseCase(
      userRepository,
      customerRepository,
      accessRepository,
    );
  });

  it('should create a SELF link when documents match', async () => {
    const user = createMockUser({
      role: UserRole.CUSTOMER,
      document: Document.create('12345678909'),
    });
    const customer = createMockCustomer({
      type: PersonType.INDIVIDUAL,
      document: Document.create('12345678909', PersonType.INDIVIDUAL),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);
    accessRepository.create.mockImplementation((access) => Promise.resolve(access));

    const result = await useCase.execute({
      userId: user.id,
      customerId: customer.id,
      relationship: AccessRelationship.SELF,
    });

    expect(result.relationship).toBe(AccessRelationship.SELF);
    expect(accessRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw DomainValidationException for SELF when documents differ', async () => {
    const user = createMockUser({
      role: UserRole.CUSTOMER,
      document: Document.create('12345678909'),
    });
    const customer = createMockCustomer({
      document: Document.create('98765432100', PersonType.INDIVIDUAL),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);

    await expect(
      useCase.execute({
        userId: user.id,
        customerId: customer.id,
        relationship: AccessRelationship.SELF,
      }),
    ).rejects.toThrow(DomainValidationException);
    expect(accessRepository.create).not.toHaveBeenCalled();
  });

  it('should create a REPRESENTATIVE link even when documents differ', async () => {
    const user = createMockUser({
      role: UserRole.CUSTOMER,
      document: Document.create('12345678909'),
    });
    const customer = createMockCustomer({
      type: PersonType.COMPANY,
      document: Document.create('12345678000195', PersonType.COMPANY),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);
    accessRepository.create.mockImplementation((access) => Promise.resolve(access));

    const result = await useCase.execute({
      userId: user.id,
      customerId: customer.id,
      relationship: AccessRelationship.REPRESENTATIVE,
    });

    expect(result.relationship).toBe(AccessRelationship.REPRESENTATIVE);
  });

  it('should throw ResourceNotFoundException when the customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        customerId: 'missing',
        relationship: AccessRelationship.SELF,
      }),
    ).rejects.toThrow(ResourceNotFoundException);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when the user does not exist', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'missing',
        customerId: customer.id,
        relationship: AccessRelationship.SELF,
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw DomainValidationException when the user role is not CUSTOMER', async () => {
    const user = createMockUser({ role: UserRole.ATTENDANT });
    const customer = createMockCustomer();

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);

    await expect(
      useCase.execute({
        userId: user.id,
        customerId: customer.id,
        relationship: AccessRelationship.SELF,
      }),
    ).rejects.toThrow(DomainValidationException);
    expect(accessRepository.create).not.toHaveBeenCalled();
  });
});
