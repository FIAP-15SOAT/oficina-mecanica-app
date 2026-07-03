import { ZipCode } from '@domain/value-objects/zip-code.vo';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('ZipCode VO', () => {
  describe('create', () => {
    it.each([
      ['01310100', '01310100'],
      ['01310-100', '01310100'],
      ['  01310-100  ', '01310100'],
    ])('sanitizes and creates from %p → %p', (input, expected) => {
      expect(ZipCode.create(input).value).toBe(expected);
    });

    it.each([null, undefined, '', '   '])('throws when value is %p', (value) => {
      expect(() => ZipCode.create(value as string)).toThrow(DomainValidationException);
      expect(() => ZipCode.create(value as string)).toThrow('CEP é obrigatório');
    });

    it.each(['abc', '123', '01310-1000'])('throws on malformed zip %p', (value) => {
      expect(() => ZipCode.create(value)).toThrow(DomainValidationException);
      expect(() => ZipCode.create(value)).toThrow(/CEP inválido/);
    });
  });

  describe('equals', () => {
    it('returns true for same value (regardless of input formatting)', () => {
      expect(ZipCode.create('01310100').equals(ZipCode.create('01310-100'))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(ZipCode.create('01310100').equals(ZipCode.create('20040020'))).toBe(false);
    });

    it('returns false for non-ZipCode instance', () => {
      expect(ZipCode.create('01310100').equals({ value: '01310100' } as unknown as ZipCode)).toBe(
        false,
      );
    });
  });

  describe('toString', () => {
    it('returns the sanitized value', () => {
      expect(ZipCode.create('01310-100').toString()).toBe('01310100');
    });
  });
});
