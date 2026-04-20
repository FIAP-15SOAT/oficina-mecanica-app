import { StockMovementType } from '../enums/stock-movement-type.enum';

/**
 * Entidade de domínio que representa uma movimentação no Estoque.
 * Tipos: Entrada de Peças e Insumos (ENTRY), Saída por OS (EXIT), Ajuste (ADJUSTMENT).
 * O campo `workOrderId` é preenchido quando a saída ocorre por consumo numa Ordem de Serviço.
 */
export class StockMovement {
  readonly id: string;
  readonly partSupplyId: string;
  /** ID da Ordem de Serviço vinculada à saída (preenchido apenas em EXIT) */
  readonly workOrderId?: string;
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly reason?: string;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    partSupplyId: string;
    workOrderId?: string;
    type: StockMovementType;
    quantity: number;
    reason?: string;
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
}
