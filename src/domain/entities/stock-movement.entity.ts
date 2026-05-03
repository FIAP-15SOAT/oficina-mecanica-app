import { randomUUID } from 'node:crypto';
import { validate as isUuid } from 'uuid';
import { StockMovementType } from '../enums/stock-movement-type.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';

/**
 * Entidade de domínio que representa uma movimentação no Estoque.
 * Tipos: Entrada de Peças e Insumos (ENTRY), Saída por OS (EXIT), Ajuste (ADJUSTMENT).
 * O campo `workOrderId` é preenchido quando a saída ocorre por consumo numa Ordem de Serviço.
 */
export class StockMovement {
  readonly id: string;
  readonly partSupplyId: string;
  /** ID da Ordem de Serviço vinculada à saída (preenchido apenas em EXIT) */
  readonly workOrderId?: string | null;
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly reason?: string | null;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    partSupplyId: string;
    workOrderId?: string | null;
    type: StockMovementType;
    quantity: number;
    reason?: string | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.partSupplyId = props.partSupplyId;
    this.workOrderId = props.workOrderId;
    this.type = props.type;
    this.quantity = props.quantity;
    this.reason = props.reason;
    this.createdAt = props.createdAt;
  }

  static create(props: {
    partSupplyId: string;
    workOrderId?: string | null;
    type: StockMovementType;
    quantity: number;
    reason?: string | null;
  }): StockMovement {
    const movement = new StockMovement({
      id: randomUUID(),
      partSupplyId: props.partSupplyId?.trim(),
      workOrderId: props.workOrderId?.trim() ?? null,
      type: props.type,
      quantity: props.quantity,
      reason: props.reason?.trim() ?? null,
      createdAt: new Date(),
    });

    movement.validatePartSupplyId();
    movement.validateWorkOrderId();
    movement.validateQuantity();

    return movement;
  }

  private validatePartSupplyId(): void {
    if (!this.partSupplyId) {
      throw new DomainValidationException('ID da peça/insumo é obrigatório.');
    }

    if (!isUuid(this.partSupplyId)) {
      throw new DomainValidationException(`ID da peça/insumo inválido.`);
    }
  }

  private validateWorkOrderId(): void {
    if (this.workOrderId && !isUuid(this.workOrderId)) {
      throw new DomainValidationException('ID da ordem de serviço inválido.');
    }
  }

  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser um inteiro positivo.');
    }
  }
}
