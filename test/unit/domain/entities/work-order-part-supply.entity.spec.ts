import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { LineItemPrice } from '@domain/value-objects/line-item-price.vo';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('WorkOrderPartSupply Entity', () => {
  const validProps = {
    workOrderId: '123e4567-e89b-12d3-a456-426614174000',
    partSupplyId: '223e4567-e89b-12d3-a456-426614174001',
    quantity: 2,
    unitPrice: 50,
  };

  describe('create()', () => {
    it('should create a valid WorkOrderPartSupply', () => {
      const entity = WorkOrderPartSupply.create(validProps);

      expect(entity).toBeInstanceOf(WorkOrderPartSupply);
      expect(entity.workOrderId).toBe(validProps.workOrderId);
      expect(entity.partSupplyId).toBe(validProps.partSupplyId);
      expect(entity.quantity).toBe(2);
      expect(entity.unitPrice).toBe(50);
      expect(entity.totalPrice).toBe(100);
      expect(entity.createdAt).toBeInstanceOf(Date);
    });

    it('should expose the lineItem as a LineItemPrice VO', () => {
      const entity = WorkOrderPartSupply.create(validProps);

      expect(entity.lineItem).toBeInstanceOf(LineItemPrice);
      expect(entity.lineItem.quantity).toBe(2);
      expect(entity.lineItem.unitPrice).toBe(50);
      expect(entity.lineItem.totalPrice).toBe(100);
    });

    it('should throw when quantity is zero', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, quantity: 0 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when quantity is negative', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, quantity: -1 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when quantity is not an integer', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, quantity: 1.5 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when unitPrice is zero', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, unitPrice: 0 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when unitPrice is negative', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, unitPrice: -10 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when unitPrice is NaN', () => {
      expect(() => WorkOrderPartSupply.create({ ...validProps, unitPrice: NaN })).toThrow(
        DomainValidationException,
      );
    });
  });

  describe('reconstitute()', () => {
    it('should assign all partial props and expose a LineItemPrice VO', () => {
      const now = new Date();

      const entity = WorkOrderPartSupply.reconstitute({
        workOrderId: 'wo-id',
        partSupplyId: 'part-id',
        quantity: 1,
        unitPrice: 20,
        totalPrice: 20,
        createdAt: now,
        updatedAt: now,
      });

      expect(entity.quantity).toBe(1);
      expect(entity.unitPrice).toBe(20);
      expect(entity.totalPrice).toBe(20);
      expect(entity.lineItem).toBeInstanceOf(LineItemPrice);
    });
  });
});
