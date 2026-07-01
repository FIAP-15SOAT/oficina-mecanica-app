import { randomUUID } from 'node:crypto';
import { CustomerController } from '@interface-adapters/customer/customer.controller';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';
import { ICreateCustomerUseCase } from '@domain/interfaces/use-cases/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@domain/interfaces/use-cases/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@domain/interfaces/use-cases/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@domain/interfaces/use-cases/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@domain/interfaces/use-cases/customer/delete-customer.use-case.interface';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

describe('CustomerController', () => {
  let controller: CustomerController;
  let createUseCase: jest.Mocked<ICreateCustomerUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllCustomersUseCase>;
  let findByIdUseCase: jest.Mocked<IFindCustomerByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdateCustomerUseCase>;
  let deleteUseCase: jest.Mocked<IDeleteCustomerUseCase>;

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    controller = new CustomerController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
    );
  });

  describe('create', () => {
    it('should return customer wrapped in data', async () => {
      const input = {
        name: 'João da Silva',
        document: '123.456.789-09',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@email.com',
        phone: '11999999999',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        },
      };

      const created = createMockCustomer({
        name: input.name,
        document: Document.create(input.document, input.type),
        type: input.type,
        email: Email.create(input.email),
        phone: Phone.create(input.phone),
      });

      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(input);

      expect(result).toEqual(CustomerPresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith(input);
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const customers = [createMockCustomer(), createMockCustomer()];

      findAllUseCase.execute.mockResolvedValue({
        items: customers,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ name: 'João' });

      expect(result).toEqual(
        CustomerPresenter.toPaginatedDataResponse({
          items: customers,
          pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
        }),
      );

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10, name: 'João' });
    });

    it('should forward provided page and limit', async () => {
      findAllUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.findAll({ page: 2, limit: 5 });

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });

  describe('findById', () => {
    it('should return customer wrapped in data', async () => {
      const customer = createMockCustomer();
      findByIdUseCase.execute.mockResolvedValue(customer);

      const result = await controller.findById(customer.id);

      expect(result).toEqual(CustomerPresenter.toDataResponse(customer));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('update', () => {
    it('should return updated customer wrapped in data', async () => {
      const updated = createMockCustomer({ name: 'Novo Nome' });
      updateUseCase.execute.mockResolvedValue(updated);

      const input = { name: 'Novo Nome' } as unknown as Parameters<typeof controller.update>[1];

      const result = await controller.update(updated.id, input);

      expect(result).toEqual(CustomerPresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, input);
    });
  });

  describe('remove', () => {
    it('should call the delete use case with the correct id', async () => {
      const id = randomUUID();
      deleteUseCase.execute.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(deleteUseCase.execute).toHaveBeenCalledWith(id);
    });
  });
});
