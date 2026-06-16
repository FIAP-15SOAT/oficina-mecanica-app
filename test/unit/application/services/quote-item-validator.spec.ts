import { QuoteItemValidator } from '@application/services/quote-item-validator';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../helpers/service-mock.factory';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../helpers/part-supply-mock.factory';

describe('QuoteItemValidator', () => {
  let serviceRepo: jest.Mocked<IServiceRepository>;
  let partSupplyRepo: jest.Mocked<IPartSupplyRepository>;
  let validator: QuoteItemValidator;

  beforeEach(() => {
    serviceRepo = createMockServiceRepository();
    partSupplyRepo = createMockPartSupplyRepository();
    validator = new QuoteItemValidator(serviceRepo, partSupplyRepo);
  });

  describe('resolveServiceItems()', () => {
    it('should return [] when inputs are empty', async () => {
      const result = await validator.resolveServiceItems([]);

      expect(result).toEqual([]);
      expect(serviceRepo.findByIds).not.toHaveBeenCalled();
    });

    it('should return assembled items for valid service ids', async () => {
      const service = createMockService({ basePrice: 100 });

      serviceRepo.findByIds.mockResolvedValue([service]);

      const result = await validator.resolveServiceItems([{ serviceId: service.id, quantity: 2 }]);

      expect(result).toHaveLength(1);
      expect(result[0].service).toBe(service);
      expect(result[0].quantity).toBe(2);
    });

    it('should throw ResourceNotFoundException for unknown serviceId', async () => {
      serviceRepo.findByIds.mockResolvedValue([]);

      await expect(
        validator.resolveServiceItems([{ serviceId: 'unknown-service-id', quantity: 1 }]),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('resolvePartSupplyItems()', () => {
    it('should return [] when inputs are empty', async () => {
      const result = await validator.resolvePartSupplyItems([]);

      expect(result).toEqual([]);
      expect(partSupplyRepo.findByIds).not.toHaveBeenCalled();
    });

    it('should return assembled items for valid part supply ids', async () => {
      const part = createMockPartSupply({ salePrice: 50 });

      partSupplyRepo.findByIds.mockResolvedValue([part]);

      const result = await validator.resolvePartSupplyItems([
        { partSupplyId: part.id, quantity: 3 },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].partSupply).toBe(part);
      expect(result[0].quantity).toBe(3);
    });

    it('should throw ResourceNotFoundException for unknown partSupplyId', async () => {
      partSupplyRepo.findByIds.mockResolvedValue([]);

      await expect(
        validator.resolvePartSupplyItems([{ partSupplyId: 'unknown-part-id', quantity: 1 }]),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('validateAndResolve()', () => {
    it('should validate then return resolved services and parts', async () => {
      const service = createMockService({ basePrice: 100 });
      const part = createMockPartSupply({ salePrice: 50 });

      serviceRepo.findByIds.mockResolvedValue([service]);
      partSupplyRepo.findByIds.mockResolvedValue([part]);

      const result = await validator.validateAndResolve(
        [{ serviceId: service.id, quantity: 1 }],
        [{ partSupplyId: part.id, quantity: 2 }],
      );

      expect(result.services).toHaveLength(1);
      expect(result.services[0].service).toBe(service);
      expect(result.partsSupplies).toHaveLength(1);
      expect(result.partsSupplies[0].partSupply).toBe(part);
    });

    it('should throw BusinessRuleViolationException for parts without a service before any lookup', async () => {
      const part = createMockPartSupply();

      await expect(
        validator.validateAndResolve([], [{ partSupplyId: part.id, quantity: 1 }]),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(serviceRepo.findByIds).not.toHaveBeenCalled();
      expect(partSupplyRepo.findByIds).not.toHaveBeenCalled();
    });

    it('should throw BusinessRuleViolationException for duplicate service ids before any lookup', async () => {
      await expect(
        validator.validateAndResolve(
          [
            { serviceId: 'dup-id', quantity: 1 },
            { serviceId: 'dup-id', quantity: 2 },
          ],
          [],
        ),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(serviceRepo.findByIds).not.toHaveBeenCalled();
    });
  });
});
