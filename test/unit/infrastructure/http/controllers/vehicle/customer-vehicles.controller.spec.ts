import { randomUUID } from 'node:crypto';

import { CustomerVehiclesController } from '@infrastructure/http/controllers/vehicle/customer-vehicles.controller';
import { VehicleController } from '@interface-adapters/vehicle/vehicle.controller';

import { VehiclePresenter } from '@interface-adapters/vehicle/vehicle.presenter';

import { createMockVehicle } from '../../../../../helpers/vehicle-mock.factory';

describe('CustomerVehiclesController', () => {
  let httpController: CustomerVehiclesController;
  let cleanController: VehicleController;

  beforeEach(() => {
    cleanController = new VehicleController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new CustomerVehiclesController(cleanController);
  });

  describe('findByCustomerId', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const customerId = randomUUID();
      const response = VehiclePresenter.toListResponse([createMockVehicle({ customerId })]);

      jest.spyOn(cleanController, 'findByCustomerId').mockResolvedValue(response);

      const result = await httpController.findByCustomerId(customerId);

      expect(result).toBe(response);
      expect(cleanController.findByCustomerId).toHaveBeenCalledWith(customerId);
    });
  });
});
