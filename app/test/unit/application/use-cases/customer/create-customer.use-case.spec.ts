import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Document } from '@domain/value-objects/document.vo';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { createMockHashService } from '../../../../helpers/mock-factories';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  const validInput = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: { street: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
  };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new CreateCustomerUseCase(customerRepository, hashService, emailSenderService);
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

    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(validInput);

    expect(result).toEqual(saved);
    expect(customerRepository.findByDocument).toHaveBeenCalledWith(sanitizedDocument);
    expect(customerRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(createMockCustomer());
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(createMockCustomer());

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('should generate a random password, hash it, and send it by e-mail', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockImplementation((customer) => Promise.resolve(customer));

    await useCase.execute({
      name: 'Cliente Teste',
      document: '12345678909',
      type: CustomerType.INDIVIDUAL,
      email: 'cliente@email.com',
      phone: '11999999999',
      address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01310100' },
    });

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(typeof generatedPassword).toBe('string');
    expect(generatedPassword.length).toBeGreaterThanOrEqual(8);

    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'cliente@email.com',
        toName: 'Cliente Teste',
        message: expect.objectContaining({
          text: expect.stringContaining(generatedPassword),
        }),
      }),
    );
  });

  it('should never return the plain-text password', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockImplementation((customer) => Promise.resolve(customer));

    const result = await useCase.execute({
      name: 'Cliente Teste',
      document: '12345678909',
      type: CustomerType.INDIVIDUAL,
      email: 'cliente@email.com',
      phone: '11999999999',
      address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01310100' },
    });

    // Capture the plaintext password that was passed to the hash service
    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];

    // Verify the result does not contain the plaintext password value
    expect(result.passwordHash).not.toBe(generatedPassword);

    // Verify structural assertions: no 'password' property and 'passwordHash' key not in serialization
    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
});
