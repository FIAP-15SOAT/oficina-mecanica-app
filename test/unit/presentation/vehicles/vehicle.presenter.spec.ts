import { VehiclePresenter } from '@presentation/vehicles/vehicle.presenter';
import { createMockVehicle, createMockVehicleCustomer } from '../../../helpers/vehicle-mock.factory';
import { randomUUID } from 'node:crypto';

describe('VehiclePresenter', () => {
  describe('toResponse', () => {
    it('should map all vehicle fields correctly', () => {
      const vehicle = createMockVehicle({
        plate: 'XYZ-9876',
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: 'Branco',
        mileage: 30000,
      });

      const response = VehiclePresenter.toResponse(vehicle);

      expect(response.id).toBe(vehicle.id);
      expect(response.customerId).toBe(vehicle.customerId);
      expect(response.plate).toBe('XYZ-9876');
      expect(response.brand).toBe('Honda');
      expect(response.model).toBe('Civic');
      expect(response.year).toBe(2022);
      expect(response.color).toBe('Branco');
      expect(response.mileage).toBe(30000);
      expect(response.createdAt).toBe(vehicle.createdAt);
      expect(response.updatedAt).toBe(vehicle.updatedAt);
    });

    it('should map customer summary from nested customer relation', () => {
      const customer = createMockVehicleCustomer({
        id: randomUUID(),
        name: 'Maria Souza',
        document: '98765432100',
      });
      const vehicle = createMockVehicle({ customer });

      const response = VehiclePresenter.toResponse(vehicle);

      expect(response.customer.id).toBe(customer.id);
      expect(response.customer.name).toBe('Maria Souza');
      expect(response.customer.document).toBe('98765432100');
    });

    it('should return null for color and mileage when absent', () => {
      const vehicle = createMockVehicle({ color: null, mileage: null });

      const response = VehiclePresenter.toResponse(vehicle);

      expect(response.color).toBeNull();
      expect(response.mileage).toBeNull();
    });
  });

  describe('toDataResponse', () => {
    it('should wrap the vehicle response in a data property', () => {
      const vehicle = createMockVehicle();

      const result = VehiclePresenter.toDataResponse(vehicle);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(vehicle.id);
      expect(result.data.plate).toBe(vehicle.plate);
    });
  });

  describe('toPaginatedDataResponse', () => {
    it('should map items and preserve pagination metadata', () => {
      const vehicles = [createMockVehicle(), createMockVehicle()];
      const pagination = { totalRecords: 2, totalPages: 1, page: 1, limit: 10 };

      const result = VehiclePresenter.toPaginatedDataResponse({ items: vehicles, pagination });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(vehicles[0].id);
      expect(result.data[1].id).toBe(vehicles[1].id);
      expect(result.pagination).toEqual(pagination);
    });

    it('should return empty data array when items is empty', () => {
      const result = VehiclePresenter.toPaginatedDataResponse({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('toListDataResponse', () => {
    it('should map a list of vehicles to response DTOs', () => {
      const vehicles = [createMockVehicle(), createMockVehicle(), createMockVehicle()];

      const result = VehiclePresenter.toListDataResponse(vehicles);

      expect(result.data).toHaveLength(3);
      result.data.forEach((item, index) => {
        expect(item.id).toBe(vehicles[index].id);
        expect(item.plate).toBe(vehicles[index].plate);
        expect(item.customerId).toBe(vehicles[index].customerId);
      });
    });

    it('should return empty data array for an empty list', () => {
      const result = VehiclePresenter.toListDataResponse([]);

      expect(result.data).toHaveLength(0);
      expect(result.data).toEqual([]);
    });

    it('should include customer summary for each vehicle', () => {
      const customer = createMockVehicleCustomer({ name: 'Carlos Lima', document: '11122233300' });
      const vehicle = createMockVehicle({ customer });

      const result = VehiclePresenter.toListDataResponse([vehicle]);

      expect(result.data[0].customer.name).toBe('Carlos Lima');
      expect(result.data[0].customer.document).toBe('11122233300');
    });
  });
});
