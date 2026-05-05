import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

function makeQuote(status: QuoteStatus): Quote {
  const now = new Date();

  return Quote.reconstitute({
    id: 'quote-uuid',
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

  describe('recalculateTotals()', () => {
    it('should update amounts and totalAmount', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      quote.services = [{ totalPrice: 300 } as QuoteService];
      quote.partsSupplies = [{ totalPrice: 150 } as QuotePartSupply];
      quote.recalculateTotals();

      expect(quote.servicesAmount).toBe(300);
      expect(quote.partsAmount).toBe(150);
      expect(quote.totalAmount).toBe(450);
    });

    it('should handle zero amounts', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      quote.services = [];
      quote.partsSupplies = [];
      quote.recalculateTotals();

      expect(quote.totalAmount).toBe(0);
    });

    it('should treat undefined services and partsSupplies as empty arrays', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
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
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      expect(quote.canSubmit()).toBe(true);
    });

    it('should return false when status is SENT', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      expect(quote.canSubmit()).toBe(false);
    });

    it('ensureCanSubmit should throw when not PENDING', () => {
      const quote = makeQuote(QuoteStatus.APPROVED);
      expect(() => quote.ensureCanSubmit()).toThrow(BusinessRuleViolationException);
    });

    it('ensureCanSubmit should not throw when PENDING', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      expect(() => quote.ensureCanSubmit()).not.toThrow();
    });
  });

  describe('canApprove() / ensureCanApprove()', () => {
    it('should return true when status is SENT', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      expect(quote.canApprove()).toBe(true);
    });

    it('should return false when status is PENDING', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      expect(quote.canApprove()).toBe(false);
    });

    it('ensureCanApprove should throw when not SENT', () => {
      const quote = Quote.create({ workOrderId: '550e8400-e29b-41d4-a716-446655440111' });
      expect(() => quote.ensureCanApprove()).toThrow(BusinessRuleViolationException);
    });

    it('ensureCanApprove should not throw when SENT', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      expect(() => quote.ensureCanApprove()).not.toThrow();
    });
  });

  describe('canReject() / ensureCanReject()', () => {
    it('should return true when status is SENT', () => {
      const quote = makeQuote(QuoteStatus.SENT);
      expect(quote.canReject()).toBe(true);
    });

    it('should return false when status is APPROVED', () => {
      const quote = makeQuote(QuoteStatus.APPROVED);
      expect(quote.canReject()).toBe(false);
    });

    it('ensureCanReject should throw when not SENT', () => {
      const quote = makeQuote(QuoteStatus.PENDING);
      expect(() => quote.ensureCanReject()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('approve()', () => {
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
  });
});
