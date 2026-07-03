import { randomUUID } from 'node:crypto';

import { VehiclesController } from '@infrastructure/http/vehicles/vehicles.controller';
import { VehicleController } from '@interface-adapters/vehicle/vehicle.controller';

import { VehiclePresenter } from '@interface-adapters/vehicle/vehicle.presenter';

import { CreateVehicleRequestDto } from '@infrastructure/http/vehicles/dto/requests/create-vehicle-request.dto';
import { FindAllVehiclesQueryDto } from '@infrastructure/http/vehicles/dto/requests/filter-vehicles.dto';

import { createMockVehicle } from '../../../../helpers/vehicle-mock.factory';

describe('VehiclesController', () => {
  let httpController: VehiclesController;
  let cleanController: VehicleController;

  const vehicleRequestStub: CreateVehicleRequestDto = {
    customerId: randomUUID(),
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  };

  beforeEach(() => {
    cleanController = new VehicleController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new VehiclesController(cleanController);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const response = VehiclePresenter.toDataResponse(createMockVehicle());
      jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(vehicleRequestStub);

      expect(result).toBe(response);
      expect(cleanController.create).toHaveBeenCalledWith(vehicleRequestStub);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const query: FindAllVehiclesQueryDto = { page: 1, limit: 10, brand: 'Toyota' };

      const response = VehiclePresenter.toPaginatedDataResponse({
        items: [createMockVehicle()],
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
      const vehicle = createMockVehicle();
      const response = VehiclePresenter.toDataResponse(vehicle);

      jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(vehicle.id);

      expect(result).toBe(response);
      expect(cleanController.findById).toHaveBeenCalledWith(vehicle.id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = VehiclePresenter.toDataResponse(createMockVehicle({ brand: 'Honda' }));

      jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, vehicleRequestStub);

      expect(result).toBe(response);
      expect(cleanController.update).toHaveBeenCalledWith(id, vehicleRequestStub);
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
