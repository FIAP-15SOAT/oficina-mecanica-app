import { BusinessRuleViolationException } from './business-rule-violation.exception';

/**
 * Exceção lançada quando a saída de Estoque excede a quantidade disponível de Peças e Insumos.
 */
export class InsufficientStockException extends BusinessRuleViolationException {
  constructor(partSupplyId: string, requested: number, available: number) {
    super(
      `Estoque insuficiente para a Peça/Insumo "${partSupplyId}". ` +
        `Solicitado: ${requested}, disponível: ${available}.`,
    );
  }
}
