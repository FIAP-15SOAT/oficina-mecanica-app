import { randomUUID } from 'node:crypto';
import { CustomersController } from '@infrastructure/http/customers/customers.controller';
import { CustomerController } from '@interface-adapters/customer/customer.controller';
import {
  CustomerDataResponse,
  CustomerPaginatedResponse,
} from '@interface-adapters/customer/responses/customer.response';
import { IFindVehiclesByCustomerIdUseCase } from '@domain/interfaces/use-cases/vehicle/find-vehicles-by-customer-id.use-case.interface';
import { Vehicle } from '@domain/entities/vehicle.entity';

describe('CustomersController', () => {
  let httpController: CustomersController;
  let cleanController: CustomerController;
  let findVehiclesUseCase: jest.Mocked<IFindVehiclesByCustomerIdUseCase>;

  beforeEach(() => {
    cleanController = new CustomerController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    findVehiclesUseCase = { execute: jest.fn() };
    httpController = new CustomersController(cleanController, findVehiclesUseCase);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto = {} as unknown as Parameters<typeof httpController.create>[0];
      const response = { data: {} } as unknown as CustomerDataResponse;
      const spy = jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(dto);

      expect(result).toBe(response);
      expect(spy).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const response = { data: [] } as unknown as CustomerPaginatedResponse;
      const spy = jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const query = { name: 'João' } as unknown as Parameters<typeof httpController.findAll>[0];
      const result = await httpController.findAll(query);

      expect(result).toBe(response);
      expect(spy).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = { data: { id } } as unknown as CustomerDataResponse;
      const spy = jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(id);

      expect(result).toBe(response);
      expect(spy).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const dto = {} as unknown as Parameters<typeof httpController.update>[1];
      const response = { data: { id } } as unknown as CustomerDataResponse;
      const spy = jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, dto);

      expect(result).toBe(response);
      expect(spy).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('should delegate to the clean controller', async () => {
      const id = randomUUID();
      const spy = jest.spyOn(cleanController, 'remove').mockResolvedValue(undefined);

      await httpController.remove(id);

      expect(spy).toHaveBeenCalledWith(id);
    });
  });

  describe('findVehiclesByCustomerId', () => {
    it('should return the vehicles of the customer wrapped in data', async () => {
      const id = randomUUID();
      const vehicles: Vehicle[] = [];
      findVehiclesUseCase.execute.mockResolvedValue(vehicles);

      const result = await httpController.findVehiclesByCustomerId(id);

      expect(result).toEqual({ data: [] });
      expect(findVehiclesUseCase.execute).toHaveBeenCalledWith(id);
    });
  });
});
