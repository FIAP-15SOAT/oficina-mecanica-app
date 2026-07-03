import { randomUUID } from 'node:crypto';

import { VehicleController } from '@interface-adapters/vehicle/vehicle.controller';
import { VehiclePresenter } from '@interface-adapters/vehicle/vehicle.presenter';

import { CreateVehicleRequest } from '@interface-adapters/vehicle/requests/create-vehicle-request';
import { UpdateVehicleRequest } from '@interface-adapters/vehicle/requests/update-vehicle-request';

import { ICreateVehicleUseCase } from '@application/ports/input/vehicle/create-vehicle.use-case.interface';
import { IFindAllVehiclesUseCase } from '@application/ports/input/vehicle/find-all-vehicles.use-case.interface';
import { IFindVehicleByIdUseCase } from '@application/ports/input/vehicle/find-vehicle-by-id.use-case.interface';
import { IUpdateVehicleUseCase } from '@application/ports/input/vehicle/update-vehicle.use-case.interface';
import { IDeleteVehicleUseCase } from '@application/ports/input/vehicle/delete-vehicle.use-case.interface';
import { IFindVehiclesByCustomerIdUseCase } from '@application/ports/input/vehicle/find-vehicles-by-customer-id.use-case.interface';

import { Plate } from '@domain/value-objects/plate.vo';

import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';

describe('VehicleController', () => {
  let controller: VehicleController;
  let createUseCase: jest.Mocked<ICreateVehicleUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllVehiclesUseCase>;
  let findByIdUseCase: jest.Mocked<IFindVehicleByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdateVehicleUseCase>;
  let deleteUseCase: jest.Mocked<IDeleteVehicleUseCase>;
  let findByCustomerIdUseCase: jest.Mocked<IFindVehiclesByCustomerIdUseCase>;

  const createRequestStub: CreateVehicleRequest = {
    customerId: randomUUID(),
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  };

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    findByCustomerIdUseCase = { execute: jest.fn() };
    controller = new VehicleController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
      findByCustomerIdUseCase,
    );
  });

  describe('create', () => {
    it('should return vehicle wrapped in data', async () => {
      const created = createMockVehicle({
        customerId: createRequestStub.customerId,
        plate: Plate.create(createRequestStub.plate),
        brand: createRequestStub.brand,
        model: createRequestStub.model,
        year: createRequestStub.year,
      });

      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(createRequestStub);

      expect(result).toEqual(VehiclePresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith(createRequestStub);
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const vehicles = [createMockVehicle(), createMockVehicle()];

      findAllUseCase.execute.mockResolvedValue({
        items: vehicles,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ brand: 'Toyota' });

      expect(result).toEqual(
        VehiclePresenter.toPaginatedDataResponse({
          items: vehicles,
          pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
        }),
      );
      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10, brand: 'Toyota' });
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
    it('should return vehicle wrapped in data', async () => {
      const vehicle = createMockVehicle();

      findByIdUseCase.execute.mockResolvedValue(vehicle);

      const result = await controller.findById(vehicle.id);

      expect(result).toEqual(VehiclePresenter.toDataResponse(vehicle));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(vehicle.id);
    });
  });

  describe('update', () => {
    it('should return updated vehicle wrapped in data', async () => {
      const updateRequest: UpdateVehicleRequest = { ...createRequestStub, brand: 'Honda' };

      const updated = createMockVehicle({
        customerId: updateRequest.customerId,
        plate: Plate.create(updateRequest.plate),
        brand: updateRequest.brand,
        model: updateRequest.model,
        year: updateRequest.year,
      });
      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, updateRequest);

      expect(result).toEqual(VehiclePresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, updateRequest);
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

  describe('findByCustomerId', () => {
    it('should return the vehicles of the customer wrapped in data', async () => {
      const customerId = randomUUID();
      const vehicles = [createMockVehicle({ customerId })];

      findByCustomerIdUseCase.execute.mockResolvedValue(vehicles);

      const result = await controller.findByCustomerId(customerId);

      expect(result).toEqual(VehiclePresenter.toListResponse(vehicles));
      expect(findByCustomerIdUseCase.execute).toHaveBeenCalledWith(customerId);
    });
  });
});
