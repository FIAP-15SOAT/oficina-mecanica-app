import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export class DocumentValidator {
  static validateCpf(value: string): boolean {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let remainder = sum % 11;
    const d1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cpf[9]) !== d1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    remainder = sum % 11;
    const d2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(cpf[10]) === d2;
  }

  static validateCnpj(value: string): boolean {
    // Strips formatting; keeps alphanumeric (new format allows letters in base)
    const cnpj = value.replace(/[.\-/]/g, '').toUpperCase();
    if (cnpj.length !== 14) return false;
    if (/^(.)\1{13}$/.test(cnpj)) return false;

    // Check digits (last 2) must be numeric
    if (!/^\d$/.test(cnpj[12]) || !/^\d$/.test(cnpj[13])) return false;

    // Maps digit → 0-9, letter → 10-35 (A=10 ... Z=35)
    const charValue = (c: string): number => {
      const code = c.charCodeAt(0);
      return code >= 48 && code <= 57 ? code - 48 : code - 55;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = weights1.reduce((acc, w, i) => acc + charValue(cnpj[i]) * w, 0);
    let remainder = sum % 11;
    const d1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cnpj[12]) !== d1) return false;

    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = weights2.reduce((acc, w, i) => acc + charValue(cnpj[i]) * w, 0);
    remainder = sum % 11;
    const d2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(cnpj[13]) === d2;
  }

  static validateCpfCnpj(value: string): boolean {
    const stripped = value.replace(/[.\-/]/g, '');
    if (stripped.length === 11) return DocumentValidator.validateCpf(value);
    if (stripped.length === 14) return DocumentValidator.validateCnpj(value);
    return false;
  }
}

@ValidatorConstraint({ name: 'isValidCpfCnpj', async: false })
export class IsValidCpfCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return typeof value === 'string' && DocumentValidator.validateCpfCnpj(value);
  }

  defaultMessage(): string {
    return 'Documento inválido. Informe um CPF (000.000.000-00) ou CNPJ válido.';
  }
}

export function IsValidCpfCnpj(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsValidCpfCnpjConstraint,
    });
  };
}
