import { randomUUID } from 'node:crypto';
import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';
import { Customer } from '@domain/entities/customer.entity';
import { User } from '@domain/entities/user.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

function buildIndividualCustomer(): Customer {
  return Customer.create({
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@example.com',
    phone: '11999990000',
    address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
  });
}

function buildCompanyCustomer(): Customer {
  return Customer.create({
    name: 'Oficina Parceira LTDA',
    document: '12345678000195',
    type: CustomerType.COMPANY,
    email: 'contato@parceira.com.br',
    phone: '1133330000',
    address: { street: 'Av B', city: 'São Paulo', state: 'SP', zipCode: '02002000' },
  });
}

describe('GrantCustomerAccessUseCase', () => {
  let unitOfWork: {
    executeTransaction: jest.Mock;
  };
  let repos: {
    customer: { findById: jest.Mock };
    user: { findByCpf: jest.Mock; findByEmail: jest.Mock; create: jest.Mock; update: jest.Mock };
    userCustomer: { exists: jest.Mock; create: jest.Mock };
  };
  let hashService: { hash: jest.Mock };
  let emailSender: { send: jest.Mock };
  let logger: { event: jest.Mock; forContext: jest.Mock; error: jest.Mock };
  let useCase: GrantCustomerAccessUseCase;

  beforeEach(() => {
    repos = {
      customer: { findById: jest.fn() },
      user: { findByCpf: jest.fn(), findByEmail: jest.fn(), create: jest.fn(), update: jest.fn() },
      userCustomer: { exists: jest.fn(), create: jest.fn() },
    };
    unitOfWork = {
      executeTransaction: jest.fn((work: (repositories: typeof repos) => unknown) => work(repos)),
    };
    hashService = { hash: jest.fn().mockResolvedValue('hashed-password') };
    emailSender = { send: jest.fn().mockResolvedValue(undefined) };
    logger = { event: jest.fn(), forContext: jest.fn(), error: jest.fn() };

    useCase = new GrantCustomerAccessUseCase(
      unitOfWork as never,
      hashService as never,
      emailSender as never,
      logger as never,
    );
  });

  it('should create a new user and link for an individual customer with no body', async () => {
    const customer = buildIndividualCustomer();
    repos.customer.findById.mockResolvedValue(customer);
    repos.user.findByCpf.mockResolvedValue(null);
    repos.user.findByEmail.mockResolvedValue(null);
    repos.user.create.mockImplementation((user: User) => Promise.resolve(user));
    repos.userCustomer.exists.mockResolvedValue(false);
    repos.userCustomer.create.mockImplementation((link) => Promise.resolve(link));

    const result = await useCase.execute(customer.id, randomUUID());

    expect(result.initialPasswordSent).toBe(true);
    expect(result.customerId).toBe(customer.id);
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: customer.email.value }),
    );
  });

  it('should require name, email and cpf for a company customer', async () => {
    const customer = buildCompanyCustomer();
    repos.customer.findById.mockResolvedValue(customer);

    await expect(useCase.execute(customer.id, randomUUID())).rejects.toThrow(
      BusinessRuleViolationException,
    );
  });

  it('should reject an inactive customer', async () => {
    const customer = buildIndividualCustomer();
    customer.deactivate();
    repos.customer.findById.mockResolvedValue(customer);

    await expect(useCase.execute(customer.id, randomUUID())).rejects.toThrow(
      BusinessRuleViolationException,
    );
  });

  it('should throw when the customer does not exist', async () => {
    repos.customer.findById.mockResolvedValue(null);

    await expect(useCase.execute(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should conflict when a user already exists with the given cpf', async () => {
    const customer = buildIndividualCustomer();
    const existingUser = User.create({
      name: 'Outra Pessoa',
      email: 'outra@example.com',
      passwordHash: 'existing-hash',
      role: null,
      cpf: '12345678909',
    });
    repos.customer.findById.mockResolvedValue(customer);
    repos.user.findByCpf.mockResolvedValue(existingUser);
    repos.user.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(customer.id, randomUUID())).rejects.toThrow(
      ResourceConflictException,
    );
    expect(repos.user.create).not.toHaveBeenCalled();
    expect(repos.userCustomer.create).not.toHaveBeenCalled();
  });

  it('should conflict when a user already exists with the given email, regardless of role', async () => {
    const customer = buildIndividualCustomer();
    const staffUser = User.create({
      name: 'Funcionário Interno',
      email: 'joao@example.com',
      passwordHash: 'existing-hash',
      role: UserRole.ATTENDANT,
    });
    repos.customer.findById.mockResolvedValue(customer);
    repos.user.findByCpf.mockResolvedValue(null);
    repos.user.findByEmail.mockResolvedValue(staffUser);

    await expect(useCase.execute(customer.id, randomUUID())).rejects.toThrow(
      ResourceConflictException,
    );
    expect(repos.user.create).not.toHaveBeenCalled();
    expect(repos.userCustomer.create).not.toHaveBeenCalled();
  });

  it('should still respond successfully when the initial password email fails to send', async () => {
    const customer = buildIndividualCustomer();
    repos.customer.findById.mockResolvedValue(customer);
    repos.user.findByCpf.mockResolvedValue(null);
    repos.user.findByEmail.mockResolvedValue(null);
    repos.user.create.mockImplementation((user: User) => Promise.resolve(user));
    repos.userCustomer.exists.mockResolvedValue(false);
    repos.userCustomer.create.mockImplementation((link) => Promise.resolve(link));
    emailSender.send.mockRejectedValue(new Error('smtp down'));

    const result = await useCase.execute(customer.id, randomUUID());

    expect(result.initialPasswordSent).toBe(false);
  });
});
