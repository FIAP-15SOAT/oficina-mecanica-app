import { randomUUID } from 'node:crypto';

import { CustomerController } from '@interface-adapters/customer/customer.controller';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';

import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@application/ports/input/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@application/ports/input/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@application/ports/input/customer/delete-customer.use-case.interface';
import { ICreateUserCustomerAccessUseCase } from '@application/ports/input/customer/create-user-customer-access.use-case.interface';

import { PersonType } from '@domain/enums/person-type.enum';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';
import { UpdateCustomerRequest } from '@interface-adapters/customer/requests/update-customer-request';

import { createMockCustomer } from '../../../helpers/customer-mock.factory';

describe('CustomerController', () => {
  let controller: CustomerController;
  let createUseCase: jest.Mocked<ICreateCustomerUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllCustomersUseCase>;
  let findByIdUseCase: jest.Mocked<IFindCustomerByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdateCustomerUseCase>;
  let deleteUseCase: jest.Mocked<IDeleteCustomerUseCase>;
  let createAccessUseCase: jest.Mocked<ICreateUserCustomerAccessUseCase>;

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    createAccessUseCase = { execute: jest.fn() };
    controller = new CustomerController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
      createAccessUseCase,
    );
  });

  describe('create', () => {
    it('should return customer wrapped in data', async () => {
      const input = {
        name: 'João da Silva',
        document: '123.456.789-09',
        type: PersonType.INDIVIDUAL,
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
      const input: UpdateCustomerRequest = {
        name: 'Novo Nome',
        document: '123.456.789-09',
        type: PersonType.INDIVIDUAL,
        email: 'joao@email.com',
        phone: '11999999999',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        },
      };

      const updated = createMockCustomer({ name: input.name });
      updateUseCase.execute.mockResolvedValue(updated);

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

  describe('createAccess', () => {
    it('should delegate to the create-access use case and return the link wrapped in data', async () => {
      const customerId = randomUUID();
      const input = { userId: randomUUID(), relationship: AccessRelationship.SELF };

      const created = UserCustomerAccess.create({ customerId, ...input });
      createAccessUseCase.execute.mockResolvedValue(created);

      const result = await controller.createAccess(customerId, input);

      expect(result).toEqual(CustomerPresenter.toAccessDataResponse(created));
      expect(createAccessUseCase.execute).toHaveBeenCalledWith({ customerId, ...input });
    });
  });
});
