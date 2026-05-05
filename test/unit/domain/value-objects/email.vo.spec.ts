import { Email } from '@domain/value-objects/email.vo';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Email VO', () => {
  describe('create', () => {
    it('creates from a valid email', () => {
      const email = Email.create('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    it('trims whitespace', () => {
      const email = Email.create('  user@example.com  ');
      expect(email.value).toBe('user@example.com');
    });

    it('lowercases the email', () => {
      const email = Email.create('User@Example.COM');
      expect(email.value).toBe('user@example.com');
    });

    it.each([null, undefined, '', '   '])('throws when value is %p', (raw) => {
      expect(() => Email.create(raw as string)).toThrow(DomainValidationException);
      expect(() => Email.create(raw as string)).toThrow('E-mail é obrigatório');
    });

    it.each(['invalid', 'no-at-sign.com', 'spaces in@email.com', 'no-domain@'])(
      'throws on malformed email %p',
      (raw) => {
        expect(() => Email.create(raw)).toThrow(DomainValidationException);
        expect(() => Email.create(raw)).toThrow('E-mail inválido');
      },
    );

    it('throws when email exceeds 150 chars', () => {
      const local = 'a'.repeat(140);
      const longEmail = `${local}@example.com`;
      expect(() => Email.create(longEmail)).toThrow(/no máximo 150 caracteres/);
    });
  });

  describe('equals', () => {
    it('returns true for same value', () => {
      expect(Email.create('a@b.com').equals(Email.create('a@b.com'))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(Email.create('a@b.com').equals(Email.create('c@d.com'))).toBe(false);
    });

    it('returns false for non-Email instance', () => {
      expect(Email.create('a@b.com').equals({ value: 'a@b.com' } as unknown as Email)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the value', () => {
      expect(Email.create('a@b.com').toString()).toBe('a@b.com');
    });
  });

  describe('toJSON', () => {
    it('serializes as the raw string value', () => {
      const obj = { email: Email.create('a@b.com') };
      expect(JSON.stringify(obj)).toBe('{"email":"a@b.com"}');
    });
  });
});
