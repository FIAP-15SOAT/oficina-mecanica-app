import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

import { PrismaCustomerRepository } from '@infrastructure/persistence/prisma/repositories/prisma-customer.repository';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Address } from '@domain/value-objects/address.vo';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

import {
  createMockPrismaClient,
  MockPrismaService,
} from '../../../../../helpers/prisma-mock.factory';
import { createMockPrismaCustomer } from '../../../../../helpers/customer-mock.factory';

describe('PrismaCustomerRepository', () => {
  let repository: PrismaCustomerRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaCustomerRepository(prisma);
  });

  describe('create', () => {
    it('should create a customer and return domain entity', async () => {
      // Valid CPF for testing
      const customer = Customer.create({
        name: 'John Doe',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'john@example.com',
        phone: '11999999999',
        passwordHash: '$2b$12$hashedpassword',
        address: {
          street: 'Main St',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01001000',
        },
      });

      const prismaModel = createMockPrismaCustomer({ id: customer.id, name: customer.name });

      prisma.customer.create.mockResolvedValue(prismaModel);

      const result = await repository.create(customer);

      expect(result.id).toBe(prismaModel.id);
      expect(prisma.customer.create).toHaveBeenCalled();
    });

    it('should throw ResourceConflictException on P2002', async () => {
      const customer = Customer.create({
        name: 'John Doe',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'john@example.com',
        phone: '11999999999',
        passwordHash: '$2b$12$hashedpassword',
        address: {
          street: 'Main St',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01001000',
        },
      });

      const error = new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.customer.create.mockRejectedValue(error);

      await expect(repository.create(customer)).rejects.toThrow(ResourceConflictException);
    });

    it('should rethrow unexpected errors', async () => {
      const customer = Customer.create({
        name: 'John Doe',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'john@example.com',
        phone: '11999999999',
        passwordHash: '$2b$12$hashedpassword',
        address: {
          street: 'Main St',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01001000',
        },
      });

      const error = new Error('Database connection lost');
      prisma.customer.create.mockRejectedValue(error);

      await expect(repository.create(customer)).rejects.toThrow('Database connection lost');
    });
  });

  describe('findById', () => {
    it('should return a customer when found', async () => {
      const id = randomUUID();
      prisma.customer.findUnique.mockResolvedValue(createMockPrismaCustomer({ id }));

      const result = await repository.findById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return null when not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      const result = await repository.findById(randomUUID());

      expect(result).toBeNull();
    });
  });

  describe('findByDocument', () => {
    it('should return a customer when found', async () => {
      const document = '12345678909';
      prisma.customer.findUnique.mockResolvedValue(createMockPrismaCustomer({ document }));

      const result = await repository.findByDocument(document);

      expect(result).toBeDefined();
    });

    it('should return null when not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      const result = await repository.findByDocument('12345678909');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a customer when found', async () => {
      const email = 'john@example.com';
      prisma.customer.findUnique.mockResolvedValue(createMockPrismaCustomer({ email }));

      const result = await repository.findByEmail(email);

      expect(result).toBeDefined();
    });

    it('should return null when not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      const result = await repository.findByEmail('john@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a customer entity and return domain entity', async () => {
      const customer = Customer.reconstitute({
        id: randomUUID(),
        name: 'Updated Name',
        document: Document.create('12345678000195', CustomerType.COMPANY),
        type: CustomerType.COMPANY,
        email: Email.create('updated@example.com'),
        phone: Phone.create('11999998888'),
        passwordHash: '$2b$12$hashedpassword',
        address: Address.create({
          street: 'Main St',
          city: 'City',
          state: 'ST',
          zipCode: '12345678',
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.customer.update.mockResolvedValue(
        createMockPrismaCustomer({ id: customer.id, name: customer.name }),
      );

      const result = await repository.update(customer);

      expect(result.name).toBe(customer.name);
      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: customer.id } }),
      );
    });

    it('should send delete for address when customer has no address', async () => {
      const customer = Customer.reconstitute({
        id: randomUUID(),
        name: 'Test',
        document: Document.create('12345678909', CustomerType.INDIVIDUAL),
        type: CustomerType.INDIVIDUAL,
        email: Email.create('test@example.com'),
        phone: Phone.create('11999999999'),
        passwordHash: '$2b$12$hashedpassword',
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.customer.update.mockResolvedValue(createMockPrismaCustomer({ id: customer.id }));

      await repository.update(customer);

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ address: { delete: true } }),
        }),
      );
    });

    it('should throw ResourceConflictException on P2002', async () => {
      const customer = Customer.reconstitute({
        id: randomUUID(),
        name: 'Test',
        document: Document.create('12345678909', CustomerType.INDIVIDUAL),
        type: CustomerType.INDIVIDUAL,
        email: Email.create('dup@example.com'),
        phone: Phone.create('11999999999'),
        passwordHash: '$2b$12$hashedpassword',
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const error = new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.customer.update.mockRejectedValue(error);

      await expect(repository.update(customer)).rejects.toThrow(ResourceConflictException);
    });

    it('should rethrow unexpected errors from update', async () => {
      const customer = Customer.reconstitute({
        id: randomUUID(),
        name: 'Test',
        document: Document.create('12345678909', CustomerType.INDIVIDUAL),
        type: CustomerType.INDIVIDUAL,
        email: Email.create('test@example.com'),
        phone: Phone.create('11999999999'),
        passwordHash: '$2b$12$hashedpassword',
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const unexpectedError = new Error('Database connection lost');
      prisma.customer.update.mockRejectedValue(unexpectedError);

      await expect(repository.update(customer)).rejects.toThrow('Database connection lost');
    });
  });

  describe('delete', () => {
    it('should delete a customer', async () => {
      const id = randomUUID();
      prisma.customer.delete.mockResolvedValue({ id });

      await repository.delete(id);

      expect(prisma.customer.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated customers', async () => {
      prisma.customer.findMany.mockResolvedValue([createMockPrismaCustomer({ id: randomUUID() })]);
      prisma.customer.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should apply filters correctly', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        {
          name: 'John',
          type: CustomerType.INDIVIDUAL,
          document: '12345678909',
        },
      );

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: 'John', mode: 'insensitive' },
            type: CustomerType.INDIVIDUAL,
            document: '12345678909',
          },
        }),
      );
    });
  });

  describe('isCustomerInUse', () => {
    it('should return true if customer has vehicles', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'some-id' });
      prisma.workOrder.findFirst.mockResolvedValue(null);
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(true);
    });

    it('should return true if customer has work orders', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'some-id' });
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(true);
    });

    it('should return false if customer has no dependencies', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.workOrder.findFirst.mockResolvedValue(null);
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(false);
    });
  });
});
