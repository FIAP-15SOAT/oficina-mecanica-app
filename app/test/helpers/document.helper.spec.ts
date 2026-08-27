import { DocumentValidator } from '@domain/validators/document.validator';
import { generateValidCpf, nextValidCpf } from './document.helper';

describe('generateValidCpf', () => {
  it('generates a valid, 11-digit CPF for arbitrary seeds', () => {
    // 899_999_999 is the boundary seed: seed % 900_000_000 + 100_000_000
    // lands exactly on 999_999_999 (all nines), the one base value whose
    // all-repeated-digit fallback must not overflow past 9 digits.
    for (const seed of [1, 42, 999_999_999, 123_456_789, 899_999_999, Date.now()]) {
      const cpf = generateValidCpf(seed);
      expect(cpf).toHaveLength(11);
      expect(DocumentValidator.validateCpf(cpf)).toBe(true);
    }
  });

  it('generates different CPFs for different seeds', () => {
    expect(generateValidCpf(1)).not.toBe(generateValidCpf(2));
  });
});

describe('nextValidCpf', () => {
  it('returns a valid CPF', () => {
    const cpf = nextValidCpf();
    expect(cpf).toHaveLength(11);
    expect(DocumentValidator.validateCpf(cpf)).toBe(true);
  });

  it('never collides across many consecutive calls', () => {
    const cpfs = Array.from({ length: 50 }, () => nextValidCpf());

    expect(new Set(cpfs).size).toBe(50);
    for (const cpf of cpfs) {
      expect(DocumentValidator.validateCpf(cpf)).toBe(true);
    }
  });
});
