import {
  IsValidCpfCnpjConstraint,
  IsValidCpfCnpj,
} from '@infrastructure/validators/document.validator';

describe('IsValidCpfCnpjConstraint', () => {
  const constraint = new IsValidCpfCnpjConstraint();

  it('should return true for valid document', () => {
    expect(constraint.validate('12345678909')).toBe(true);
  });

  it('should return false for invalid document', () => {
    expect(constraint.validate('invalid')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(constraint.validate(123 as unknown as string)).toBe(false);
  });

  it('should return default error message', () => {
    expect(constraint.defaultMessage()).toContain('Documento inválido');
  });
});

describe('IsValidCpfCnpj Decorator', () => {
  class TestDto {
    @IsValidCpfCnpj()
    document!: string;
  }

  it('should be defined', () => {
    const dto = new TestDto();
    expect(dto).toBeDefined();
  });
});
