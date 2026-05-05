import { PrismaCustomerRepository } from '@infrastructure/repositories/prisma-customer.repository';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { createMockPrismaCustomer } from '../../../helpers/customer-mock.factory';
import { Address } from '@domain/entities/address.entity';
import { randomUUID } from 'node:crypto';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

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
    it('should update a customer with all fields', async () => {
      const id = randomUUID();
      const data: Partial<Customer> = {
        name: 'Updated Name',
        document: Document.create('12345678000195', CustomerType.COMPANY),
        type: CustomerType.COMPANY,
        email: Email.create('updated@example.com'),
        phone: Phone.create('11999998888'),
        address: {
          id: randomUUID(),
          street: 'Main St',
          number: '123',
          city: 'City',
          state: 'ST',
          zipCode: '12345678',
        } as unknown as Address,
      };

      prisma.customer.update.mockResolvedValue(
        createMockPrismaCustomer({
          id,
          name: data.name,
        }),
      );

      const result = await repository.update(id, data);

      expect(result.name).toBe(data.name);
      expect(prisma.customer.update).toHaveBeenCalled();
    });

    it('should delete address when address is null', async () => {
      const id = randomUUID();
      const data: Partial<Customer> = { address: null };

      prisma.customer.update.mockResolvedValue(createMockPrismaCustomer({ id }));

      await repository.update(id, data);

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: { delete: true },
          }),
        }),
      );
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
      expect(result.items.length).toBe(1);
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
      prisma.vehicle.count.mockResolvedValue(1);
      prisma.workOrder.count.mockResolvedValue(0);
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(true);
    });

    it('should return true if customer has work orders', async () => {
      prisma.vehicle.count.mockResolvedValue(0);
      prisma.workOrder.count.mockResolvedValue(1);
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(true);
    });

    it('should return false if customer has no dependencies', async () => {
      prisma.vehicle.count.mockResolvedValue(0);
      prisma.workOrder.count.mockResolvedValue(0);
      const result = await repository.isCustomerInUse(randomUUID());
      expect(result).toBe(false);
    });
  });
});
