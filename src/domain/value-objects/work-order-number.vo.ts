import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { WORK_ORDER_NUMBER_MIN_LENGTH } from '../constants/validation/work-order.constants';
import { WORK_ORDER_NUMBER_REGEX } from '../constants/regex/work-order-number.regex';

export class WorkOrderNumber {
  private constructor(public readonly value: string) {}

  static create(value: string): WorkOrderNumber {
    WorkOrderNumber.validatePresence(value);

    const sanitized = WorkOrderNumber.sanitize(value);

    WorkOrderNumber.validateFormat(sanitized);

    return new WorkOrderNumber(sanitized);
  }

  private static sanitize(value: string): string {
    return value.trim().padStart(WORK_ORDER_NUMBER_MIN_LENGTH, '0');
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Número da ordem de serviço é obrigatório');
    }
  }

  private static validateFormat(value: string): void {
    if (!WORK_ORDER_NUMBER_REGEX.test(value)) {
      throw new DomainValidationException(
        `Número da ordem de serviço inválido. Deve conter apenas dígitos e ter no mínimo ${WORK_ORDER_NUMBER_MIN_LENGTH} caracteres`,
      );
    }
  }

  equals(other: WorkOrderNumber): boolean {
    return other instanceof WorkOrderNumber && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
