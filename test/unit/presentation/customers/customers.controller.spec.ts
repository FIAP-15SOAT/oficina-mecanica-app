import { CustomersController } from '@presentation/customers/customers.controller';
import { ICreateCustomerUseCase } from '@domain/interfaces/use-cases/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@domain/interfaces/use-cases/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@domain/interfaces/use-cases/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@domain/interfaces/use-cases/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@domain/interfaces/use-cases/customer/delete-customer.use-case.interface';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('CustomersController', () => {
  let controller: CustomersController;
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
    controller = new CustomersController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
    );
  });

  describe('create', () => {
    it('should return customer wrapped in data', async () => {
      const dto = {
        name: 'João da Silva',
        document: '123.456.789-09',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
      };
      const created = createMockCustomer(dto);
      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(dto as any);

      expect(result).toEqual({ data: created });
      expect(createUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated response', async () => {
      const customers = [createMockCustomer(), createMockCustomer()];
      const useCaseOutput = {
        items: customers,
        totalRecords: 2,
        totalPages: 1,
        page: 1,
        limit: 10,
      };
      findAllUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await controller.findAll({ page: 1, limit: 10 } as any);

      expect(result.data).toEqual(customers);
      expect(result.totalRecords).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(findAllUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should forward name, type and document filters', async () => {
      findAllUseCase.execute.mockResolvedValue({
        items: [],
        totalRecords: 0,
        totalPages: 0,
        page: 1,
        limit: 10,
      });

      await controller.findAll({
        page: 1,
        limit: 10,
        name: 'João',
        type: CustomerType.INDIVIDUAL,
        document: '123.456.789-09',
      } as any);

      expect(findAllUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        name: 'João',
        type: CustomerType.INDIVIDUAL,
        document: '123.456.789-09',
      });
    });
  });

  describe('findById', () => {
    it('should return customer wrapped in data', async () => {
      const customer = createMockCustomer();
      findByIdUseCase.execute.mockResolvedValue(customer);

      const result = await controller.findById(customer.id);

      expect(result).toEqual({ data: customer });
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('update', () => {
    it('should return updated customer wrapped in data', async () => {
      const updated = createMockCustomer({ name: 'Novo Nome' });
      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, { name: 'Novo Nome' } as any);

      expect(result).toEqual({ data: updated });
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, { name: 'Novo Nome' });
    });
  });

  describe('remove', () => {
    it('should call delete use case with correct id', async () => {
      deleteUseCase.execute.mockResolvedValue(undefined);

      await controller.remove('some-id');

      expect(deleteUseCase.execute).toHaveBeenCalledWith('some-id');
    });
  });
});
