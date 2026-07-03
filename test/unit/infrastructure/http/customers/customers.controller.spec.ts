import { randomUUID } from 'node:crypto';

import { CustomersController } from '@infrastructure/http/customers/customers.controller';
import { CustomerController } from '@interface-adapters/customer/customer.controller';

import { CreateCustomerRequestDto } from '@infrastructure/http/customers/dto/requests/create-customer-request.dto';
import { FindAllCustomersQueryDto } from '@infrastructure/http/customers/dto/requests/filter-customers.dto';

import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';
import { CustomerType } from '@domain/enums/customer-type.enum';

import { createMockCustomer } from '../../../../helpers/customer-mock.factory';

describe('CustomersController', () => {
  let httpController: CustomersController;
  let cleanController: CustomerController;

  const customerRequestStub: CreateCustomerRequestDto = {
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

  beforeEach(() => {
    cleanController = new CustomerController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new CustomersController(cleanController);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const response = CustomerPresenter.toDataResponse(createMockCustomer());
      jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(customerRequestStub);

      expect(result).toBe(response);
      expect(cleanController.create).toHaveBeenCalledWith(customerRequestStub);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const query: FindAllCustomersQueryDto = { page: 1, limit: 10, name: 'João' };
      const response = CustomerPresenter.toPaginatedDataResponse({
        items: [createMockCustomer()],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });
      jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const result = await httpController.findAll(query);

      expect(result).toBe(response);
      expect(cleanController.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const customer = createMockCustomer();
      const response = CustomerPresenter.toDataResponse(customer);
      jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(customer.id);

      expect(result).toBe(response);
      expect(cleanController.findById).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = CustomerPresenter.toDataResponse(createMockCustomer({ name: 'Novo Nome' }));
      jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, customerRequestStub);

      expect(result).toBe(response);
      expect(cleanController.update).toHaveBeenCalledWith(id, customerRequestStub);
    });
  });

  describe('remove', () => {
    it('should delegate to the clean controller', async () => {
      const id = randomUUID();
      jest.spyOn(cleanController, 'remove').mockResolvedValue(undefined);

      await httpController.remove(id);

      expect(cleanController.remove).toHaveBeenCalledWith(id);
    });
  });
});
