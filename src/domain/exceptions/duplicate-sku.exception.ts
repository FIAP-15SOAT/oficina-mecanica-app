import { BusinessRuleViolationException } from './business-rule-violation.exception';

/**
 * Exceção lançada quando o SKU informado já está cadastrado no Estoque.
 */
export class DuplicateSkuException extends BusinessRuleViolationException {
  constructor(sku: string) {
    super(`Já existe uma Peça ou Insumo cadastrado com o SKU "${sku}".`);
  }
}
