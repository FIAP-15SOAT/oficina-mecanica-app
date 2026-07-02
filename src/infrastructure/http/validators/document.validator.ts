import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DocumentValidator } from '@domain/validators/document.validator';

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
