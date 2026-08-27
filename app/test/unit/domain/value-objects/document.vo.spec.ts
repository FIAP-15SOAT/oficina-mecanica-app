import { Document } from '@domain/value-objects/document.vo';
import { PersonType } from '@domain/enums/person-type.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Document VO', () => {
  describe('create — INDIVIDUAL (CPF)', () => {
    it.each([
      ['123.456.789-09', '12345678909'],
      ['12345678909', '12345678909'],
      ['  123.456.789-09  ', '12345678909'],
    ])('sanitizes and creates from %p → %p', (input, expected) => {
      const doc = Document.create(input, PersonType.INDIVIDUAL);
      expect(doc.value).toBe(expected);
      expect(doc.type).toBe(PersonType.INDIVIDUAL);
    });

    it.each(['000.000.000-00', '111.111.111-11', '12345', 'abc'])(
      'throws on invalid CPF %p',
      (value) => {
        expect(() => Document.create(value, PersonType.INDIVIDUAL)).toThrow(
          DomainValidationException,
        );
        expect(() => Document.create(value, PersonType.INDIVIDUAL)).toThrow(
          'Pessoa física deve informar um CPF válido',
        );
      },
    );
  });

  describe('create — COMPANY (CNPJ)', () => {
    it.each([
      ['12.345.678/0001-95', '12345678000195'],
      ['12345678000195', '12345678000195'],
    ])('sanitizes and creates from %p → %p', (input, expected) => {
      const doc = Document.create(input, PersonType.COMPANY);
      expect(doc.value).toBe(expected);
      expect(doc.type).toBe(PersonType.COMPANY);
    });

    it.each(['00.000.000/0000-00', '12345', 'abc'])('throws on invalid CNPJ %p', (value) => {
      expect(() => Document.create(value, PersonType.COMPANY)).toThrow(DomainValidationException);
      expect(() => Document.create(value, PersonType.COMPANY)).toThrow(
        'Pessoa jurídica deve informar um CNPJ válido',
      );
    });
  });

  describe('create — presence', () => {
    it.each([null, undefined, '', '   '])('throws when value is %p', (value) => {
      expect(() => Document.create(value as string, PersonType.INDIVIDUAL)).toThrow(
        'Documento é obrigatório',
      );
    });
  });

  describe('equals', () => {
    it('returns true for same value and type (regardless of input formatting)', () => {
      const a = Document.create('123.456.789-09', PersonType.INDIVIDUAL);
      const b = Document.create('12345678909', PersonType.INDIVIDUAL);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = Document.create('123.456.789-09', PersonType.INDIVIDUAL);
      const b = Document.create('529.982.247-25', PersonType.INDIVIDUAL);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for non-Document instance', () => {
      const a = Document.create('123.456.789-09', PersonType.INDIVIDUAL);
      expect(a.equals({ value: '12345678909' } as unknown as Document)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the sanitized value', () => {
      expect(Document.create('123.456.789-09', PersonType.INDIVIDUAL).toString()).toBe(
        '12345678909',
      );
    });
  });
});

describe('create — autodetect (no type)', () => {
  it.each([
    ['123.456.789-09', '12345678909', PersonType.INDIVIDUAL],
    ['12345678909', '12345678909', PersonType.INDIVIDUAL],
    ['12.345.678/0001-95', '12345678000195', PersonType.COMPANY],
    ['12345678000195', '12345678000195', PersonType.COMPANY],
  ])('detects type for %p', (input, expectedValue, expectedType) => {
    const doc = Document.create(input);
    expect(doc.value).toBe(expectedValue);
    expect(doc.type).toBe(expectedType);
  });

  it('throws when sanitized value has neither CPF nor CNPJ length', () => {
    expect(() => Document.create('12345')).toThrow(DomainValidationException);
    expect(() => Document.create('12345')).toThrow('Documento inválido: informe um CPF ou CNPJ');
  });

  it('still throws on invalid checksum when autodetecting', () => {
    expect(() => Document.create('111.111.111-11')).toThrow(DomainValidationException);
    expect(() => Document.create('111.111.111-11')).toThrow(
      'Pessoa física deve informar um CPF válido',
    );
  });
});

describe('sanitize (public helper)', () => {
  it('strips formatting characters and uppercases', () => {
    expect(Document.sanitize('  12.345.678/0001-95  ')).toBe('12345678000195');
  });
});
