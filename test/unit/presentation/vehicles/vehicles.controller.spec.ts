import { randomUUID } from 'node:crypto';
import { VehiclesController } from '@presentation/vehicles/vehicles.controller';
import { VehiclePresenter } from '@presentation/vehicles/vehicle.presenter';
import { ICreateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/create-vehicle.use-case.interface';
import { IFindAllVehiclesUseCase } from '@domain/interfaces/use-cases/vehicle/find-all-vehicles.use-case.interface';
import { IFindVehicleByIdUseCase } from '@domain/interfaces/use-cases/vehicle/find-vehicle-by-id.use-case.interface';
import { IUpdateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/update-vehicle.use-case.interface';
import { IDeleteVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/delete-vehicle.use-case.interface';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { Plate } from '@domain/value-objects/plate.vo';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let createUseCase: jest.Mocked<ICreateVehicleUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllVehiclesUseCase>;
  let findByIdUseCase: jest.Mocked<IFindVehicleByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdateVehicleUseCase>;
  let deleteUseCase: jest.Mocked<IDeleteVehicleUseCase>;

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    controller = new VehiclesController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
    );
  });

  describe('create', () => {
    it('should return vehicle wrapped in data', async () => {
      const dto = {
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const created = createMockVehicle({ ...dto, plate: Plate.create(dto.plate) });
      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(result).toEqual(VehiclePresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated response', async () => {
      const vehicles = [createMockVehicle(), createMockVehicle()];
      const useCaseOutput = {
        items: vehicles,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      };
      findAllUseCase.execute.mockResolvedValue(useCaseOutput);

      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(result).toEqual(VehiclePresenter.toPaginatedDataResponse(useCaseOutput));
      expect(findAllUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should use default values for page and limit', async () => {
      findAllUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });
      await controller.findAll({});
      expect(findAllUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
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
      const updated = createMockVehicle({ brand: 'Honda' });
      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, {
        brand: 'Honda',
      } as unknown as Parameters<typeof controller.update>[1]);

      expect(result).toEqual(VehiclePresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, { brand: 'Honda' });
    });
  });

  describe('remove', () => {
    it('should call delete use case with correct id', async () => {
      const id = randomUUID();
      deleteUseCase.execute.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(deleteUseCase.execute).toHaveBeenCalledWith(id);
    });
  });
});
