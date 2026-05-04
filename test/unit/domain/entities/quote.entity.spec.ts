import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

describe('Quote Entity', () => {
  describe('create()', () => {
    it('should create a quote with PENDING status and zero amounts', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });

      expect(quote.id).toBeDefined();
      expect(quote.workOrderId).toBe('wo-uuid');
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
      const quote = Quote.create({ workOrderId: 'wo-uuid', notes: 'Urgente' });
      expect(quote.notes).toBe('Urgente');
    });
  });

  describe('recalculateTotals()', () => {
    it('should update amounts and totalAmount', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      quote.services = [{ totalPrice: 300 } as QuoteService];
      quote.partsSupplies = [{ totalPrice: 150 } as QuotePartSupply];
      quote.recalculateTotals();

      expect(quote.servicesAmount).toBe(300);
      expect(quote.partsAmount).toBe(150);
      expect(quote.totalAmount).toBe(450);
    });

    it('should handle zero amounts', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      quote.services = [];
      quote.partsSupplies = [];
      quote.recalculateTotals();

      expect(quote.totalAmount).toBe(0);
    });

    it('should treat undefined services and partsSupplies as empty arrays', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      quote.services = undefined;
      quote.partsSupplies = undefined;
      quote.recalculateTotals();

      expect(quote.servicesAmount).toBe(0);
      expect(quote.partsAmount).toBe(0);
      expect(quote.totalAmount).toBe(0);
    });
  });

  describe('canSubmit() / ensureCanSubmit()', () => {
    it('should return true when status is PENDING', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      expect(quote.canSubmit()).toBe(true);
    });

    it('should return false when status is SENT', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      expect(quote.canSubmit()).toBe(false);
    });

    it('ensureCanSubmit should throw when not PENDING', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.APPROVED });
      expect(() => quote.ensureCanSubmit()).toThrow(BusinessRuleViolationException);
    });

    it('ensureCanSubmit should not throw when PENDING', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      expect(() => quote.ensureCanSubmit()).not.toThrow();
    });
  });

  describe('canApprove() / ensureCanApprove()', () => {
    it('should return true when status is SENT', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      expect(quote.canApprove()).toBe(true);
    });

    it('should return false when status is PENDING', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      expect(quote.canApprove()).toBe(false);
    });

    it('ensureCanApprove should throw when not SENT', () => {
      const quote = Quote.create({ workOrderId: 'wo-uuid' });
      expect(() => quote.ensureCanApprove()).toThrow(BusinessRuleViolationException);
    });

    it('ensureCanApprove should not throw when SENT', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      expect(() => quote.ensureCanApprove()).not.toThrow();
    });
  });

  describe('canReject() / ensureCanReject()', () => {
    it('should return true when status is SENT', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      expect(quote.canReject()).toBe(true);
    });

    it('should return false when status is APPROVED', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.APPROVED });
      expect(quote.canReject()).toBe(false);
    });

    it('ensureCanReject should throw when not SENT', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.PENDING });
      expect(() => quote.ensureCanReject()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('approve()', () => {
    it('should set status to APPROVED and set approvedAt', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      quote.approve();

      expect(quote.status).toBe(QuoteStatus.APPROVED);
      expect(quote.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('reject()', () => {
    it('should set status to REJECTED and set rejectedAt', () => {
      const quote = new Quote({ workOrderId: 'wo-uuid', status: QuoteStatus.SENT });
      quote.reject();

      expect(quote.status).toBe(QuoteStatus.REJECTED);
      expect(quote.rejectedAt).toBeInstanceOf(Date);
    });
  });
});
