import { randomUUID } from 'node:crypto';
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { Customer } from '@domain/entities/customer.entity';
import { Document } from '@domain/value-objects/document.vo';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let repos: jest.Mocked<IRepositories>;
  let grantCustomerAccessUseCase: { execute: jest.Mock };

  const validInput = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: { street: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
  };

  beforeEach(() => {
    const mocks = createMockUnitOfWorkWithRepos();
    unitOfWork = mocks.unitOfWork;
    repos = mocks.repos;
    grantCustomerAccessUseCase = {
      execute: jest.fn().mockResolvedValue({
        user: { id: randomUUID(), name: 'x', email: 'x@example.com', role: null, isActive: true },
        customer: { id: randomUUID(), name: 'x', type: CustomerType.INDIVIDUAL, isActive: true },
        initialPasswordSent: true,
      }),
    };
    useCase = new CreateCustomerUseCase(unitOfWork, grantCustomerAccessUseCase as never);
  });

  it('should create customer when document and email are unique', async () => {
    const sanitizedDocument = '12345678909';

    const saved = createMockCustomer({
      name: validInput.name,
      document: Document.create(sanitizedDocument, validInput.type),
      type: validInput.type,
      email: Email.create(validInput.email),
      phone: Phone.create(validInput.phone),
    });

    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(null);
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(null);
    (repos.customer.create as jest.Mock).mockResolvedValue(saved);

    const result = await useCase.execute(validInput, randomUUID());

    expect(result).toEqual(saved);
    expect(repos.customer.findByDocument).toHaveBeenCalledWith(sanitizedDocument);
    expect(repos.customer.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(createMockCustomer());
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(validInput, randomUUID())).rejects.toThrow(
      ResourceConflictException,
    );
    expect(repos.customer.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(null);
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(createMockCustomer());

    await expect(useCase.execute(validInput, randomUUID())).rejects.toThrow(
      ResourceConflictException,
    );
    expect(repos.customer.create).not.toHaveBeenCalled();
  });

  it('should grant access within the same transaction when createAccess defaults true for INDIVIDUAL', async () => {
    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(null);
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(null);
    (repos.customer.create as jest.Mock).mockImplementation((c: Customer) => Promise.resolve(c));

    const created = await useCase.execute(
      {
        name: 'João da Silva',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@example.com',
        phone: '11999990000',
        address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01001000' },
      },
      randomUUID(),
    );

    expect(grantCustomerAccessUseCase.execute).toHaveBeenCalledWith(
      created.id,
      expect.any(String),
      undefined,
      repos,
    );
  });

  it('should skip GrantCustomerAccessUseCase when createAccess is false', async () => {
    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(null);
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(null);
    (repos.customer.create as jest.Mock).mockImplementation((c: Customer) => Promise.resolve(c));

    await useCase.execute(
      {
        name: 'João da Silva',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@example.com',
        phone: '11999990000',
        address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01001000' },
        createAccess: false,
      },
      randomUUID(),
    );

    expect(grantCustomerAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject createAccess true combined with COMPANY', async () => {
    await expect(
      useCase.execute(
        {
          name: 'Oficina Parceira LTDA',
          document: '12345678000195',
          type: CustomerType.COMPANY,
          email: 'contato@parceira.com.br',
          phone: '1133330000',
          address: { street: 'Av B', city: 'SP', state: 'SP', zipCode: '02002000' },
          createAccess: true,
        },
        randomUUID(),
      ),
    ).rejects.toThrow(BusinessRuleViolationException);
    expect(unitOfWork.executeTransaction).not.toHaveBeenCalled();
  });

  it('should propagate a grant conflict out of the shared transaction', async () => {
    (repos.customer.findByDocument as jest.Mock).mockResolvedValue(null);
    (repos.customer.findByEmail as jest.Mock).mockResolvedValue(null);
    (repos.customer.create as jest.Mock).mockImplementation((c: Customer) => Promise.resolve(c));
    grantCustomerAccessUseCase.execute.mockRejectedValue(
      new ResourceConflictException(
        'O e-mail informado já pertence a outro usuário. Verifique o cadastro do cliente.',
      ),
    );

    await expect(
      useCase.execute(
        {
          name: 'João da Silva',
          document: '12345678909',
          type: CustomerType.INDIVIDUAL,
          email: 'joao@example.com',
          phone: '11999990000',
          address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01001000' },
        },
        randomUUID(),
      ),
    ).rejects.toThrow(ResourceConflictException);
  });
});
