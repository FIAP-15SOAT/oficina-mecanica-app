import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { Service } from '@domain/entities/service.entity';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { randomUUID } from 'node:crypto';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

function makeQuote(status: QuoteStatus): Quote {
  const now = new Date();

  return Quote.reconstitute({
    id: randomUUID(),
    workOrderId: '550e8400-e29b-41d4-a716-446655440111',
    servicesAmount: 0,
    partsAmount: 0,
    totalAmount: 0,
    status,
    notes: null,
    sentAt: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe('Quote Entity', () => {
  describe('create()', () => {
    it('should create a quote with PENDING status and zero amounts', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });

      expect(quote.id).toBeDefined();
      expect(quote.workOrderId).toBe('550e8400-e29b-41d4-a716-446655440111');
      expect(quote.status).toBe(QuoteStatus.PENDING);
      expect(quote.servicesAmount).toBe(0);
      expect(quote.partsAmount).toBe(0);
      expect(quote.totalAmount).toBe(0);
      expect(quote.notes).toBeNull();
      expect(quote.sentAt).toBeNull();
      expect(quote.approvedAt).toBeNull();
      expect(quote.rejectedAt).toBeNull();
    });

    it('should set notes when provided', () => {
      const quote = Quote.create({
        workOrderId: '550e8400-e29b-41d4-a716-446655440111',
        notes: 'Urgente',
      });
      expect(quote.notes).toBe('Urgente');
    });

    it('should throw when workOrderId is invalid', () => {
      expect(() => Quote.create({ workOrderId: 'invalid-id' })).toThrow(DomainValidationException);
    });

    it('should throw when workOrderId is empty', () => {
      expect(() => Quote.create({ workOrderId: '' })).toThrow(DomainValidationException);
    });

    it('should throw when notes exceed max length', () => {
      expect(() =>
        Quote.create({
          workOrderId: '550e8400-e29b-41d4-a716-446655440111',
          notes: 'N'.repeat(2001),
        }),
      ).toThrow(DomainValidationException);
    });

    it('should keep empty string when notes is only whitespace', () => {
      const quote = Quote.create({
        workOrderId: '550e8400-e29b-41d4-a716-446655440111',
        notes: '   ',
      });

      expect(quote.notes).toBe('');
    });
  });

  describe('approve()', () => {
    it('should throw when status is not SENT', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.approve()).toThrow(BusinessRuleViolationException);
    });

    it('should set status to APPROVED and set approvedAt', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.approve();

      expect(quote.status).toBe(QuoteStatus.APPROVED);
      expect(quote.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('reject()', () => {
    it('should set status to REJECTED and set rejectedAt', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.reject();

      expect(quote.status).toBe(QuoteStatus.REJECTED);
      expect(quote.rejectedAt).toBeInstanceOf(Date);
    });

    it('should throw when status is not SENT', () => {
      const quote = makeQuote(QuoteStatus.APPROVED);
      expect(() => quote.reject()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('submit()', () => {
    it('should set status to SENT and set sentAt when PENDING with items', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      quote.services = [{ totalPrice: 100 } as QuoteService];
      quote.submit();

      expect(quote.status).toBe(QuoteStatus.SENT);
      expect(quote.sentAt).toBeInstanceOf(Date);
      expect(quote.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw when not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.services = [{ totalPrice: 100 } as QuoteService];
      expect(() => quote.submit()).toThrow(BusinessRuleViolationException);
    });

    it('should throw when quote has no items', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.submit()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('addService()', () => {
    function makeService(basePrice = 100): Service {
      return Service.reconstitute({
        id: randomUUID(),
        name: 'Troca de óleo',
        description: null,
        basePrice,
        estimatedTimeMin: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    it('should add a service and recalculate totals', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      const service = makeService(200);

      const item = quote.addService(service, 2);

      expect(item.serviceId).toBe(service.id);
      expect(item.totalPrice).toBe(400);
      expect(quote.services).toHaveLength(1);
      expect(quote.servicesAmount).toBe(400);
      expect(quote.totalAmount).toBe(400);
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.services = [];
      const service = makeService();

      expect(() => quote.addService(service, 1)).toThrow(BusinessRuleViolationException);
    });

    it('should throw when service already added', () => {
      const service = makeService();
      const quote = makeQuote(QuoteStatus.PENDING);
      const existing = QuoteService.reconstitute({
        quoteId: quote.id,
        serviceId: service.id,
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.services = [existing];

      expect(() => quote.addService(service, 1)).toThrow(BusinessRuleViolationException);
    });
  });

  describe('removeService()', () => {
    function makeService(): Service {
      return Service.reconstitute({
        id: randomUUID(),
        name: 'Alinhamento',
        description: null,
        basePrice: 150,
        estimatedTimeMin: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    it('should remove the service and recalculate totals', () => {
      const service = makeService();
      const quote = makeQuote(QuoteStatus.PENDING);
      const item = QuoteService.reconstitute({
        quoteId: quote.id,
        serviceId: service.id,
        quantity: 1,
        unitPrice: 150,
        totalPrice: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.services = [item];
      quote.servicesAmount = 150;
      quote.totalAmount = 150;

      quote.removeService(service.id);

      expect(quote.services).toHaveLength(0);
      expect(quote.servicesAmount).toBe(0);
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.services = [];
      expect(() => quote.removeService(randomUUID())).toThrow(BusinessRuleViolationException);
    });

    it('should throw EntityNotFoundException when service not in quote', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.removeService(randomUUID())).toThrow(EntityNotFoundException);
    });
  });

  describe('updateServiceQuantity()', () => {
    it('should update quantity and recalculate totals', () => {
      const serviceId = randomUUID();
      const quote = makeQuote(QuoteStatus.PENDING);
      const item = QuoteService.reconstitute({
        quoteId: quote.id,
        serviceId,
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.services = [item];
      quote.servicesAmount = 100;

      quote.updateServiceQuantity(serviceId, 3);

      expect(item.quantity).toBe(3);
      expect(item.totalPrice).toBe(300);
      expect(quote.servicesAmount).toBe(300);
    });

    it('should throw EntityNotFoundException when service not in quote', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.updateServiceQuantity(randomUUID(), 2)).toThrow(EntityNotFoundException);
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.services = [];
      expect(() => quote.updateServiceQuantity(randomUUID(), 2)).toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('addPartSupply()', () => {
    function makePartSupply(salePrice = 50): PartSupply {
      return PartSupply.reconstitute({
        id: randomUUID(),
        name: 'Filtro de óleo',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 30,
        salePrice,
        stock: 10,
        minStock: 1,
        reservedStock: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    it('should add a part supply and recalculate totals', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      const part = makePartSupply(50);

      const item = quote.addPartSupply(part, 3);

      expect(item.partSupplyId).toBe(part.id);
      expect(item.totalPrice).toBe(150);
      expect(quote.partsSupplies).toHaveLength(1);
      expect(quote.partsAmount).toBe(150);
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.APPROVED);
      quote.partsSupplies = [];
      const part = makePartSupply();

      expect(() => quote.addPartSupply(part, 1)).toThrow(BusinessRuleViolationException);
    });

    it('should throw when part supply already added', () => {
      const part = makePartSupply();
      const quote = makeQuote(QuoteStatus.PENDING);
      const existing = QuotePartSupply.reconstitute({
        quoteId: quote.id,
        partSupplyId: part.id,
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.partsSupplies = [existing];

      expect(() => quote.addPartSupply(part, 1)).toThrow(BusinessRuleViolationException);
    });
  });

  describe('removePartSupply()', () => {
    it('should remove the part supply and recalculate totals', () => {
      const partSupplyId = randomUUID();
      const quote = makeQuote(QuoteStatus.PENDING);
      const item = QuotePartSupply.reconstitute({
        quoteId: quote.id,
        partSupplyId,
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.partsSupplies = [item];
      quote.partsAmount = 100;

      quote.removePartSupply(partSupplyId);

      expect(quote.partsSupplies).toHaveLength(0);
      expect(quote.partsAmount).toBe(0);
    });

    it('should throw EntityNotFoundException when part not in quote', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.removePartSupply(randomUUID())).toThrow(EntityNotFoundException);
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.partsSupplies = [];
      expect(() => quote.removePartSupply(randomUUID())).toThrow(BusinessRuleViolationException);
    });
  });

  describe('updatePartSupplyQuantity()', () => {
    it('should update quantity and recalculate totals', () => {
      const partSupplyId = randomUUID();
      const quote = makeQuote(QuoteStatus.PENDING);
      const item = QuotePartSupply.reconstitute({
        quoteId: quote.id,
        partSupplyId,
        quantity: 1,
        unitPrice: 80,
        totalPrice: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      quote.partsSupplies = [item];
      quote.partsAmount = 80;

      quote.updatePartSupplyQuantity(partSupplyId, 4);

      expect(item.quantity).toBe(4);
      expect(item.totalPrice).toBe(320);
      expect(quote.partsAmount).toBe(320);
    });

    it('should throw EntityNotFoundException when part not in quote', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.updatePartSupplyQuantity(randomUUID(), 2)).toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw when quote is not PENDING', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      quote.partsSupplies = [];
      expect(() => quote.updatePartSupplyQuantity(randomUUID(), 2)).toThrow(
        BusinessRuleViolationException,
      );
    });
  });
});
