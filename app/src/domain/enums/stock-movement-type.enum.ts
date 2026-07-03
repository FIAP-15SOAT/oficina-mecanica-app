/** Tipo de movimentação no Controle de Estoque */
export enum StockMovementType {
  /** Entrada de Peças e Insumos no estoque */
  ENTRY = 'ENTRY',
  /** Saída por consumo em Ordem de Serviço */
  EXIT = 'EXIT',
  /** Ajuste de estoque (inventário) */
  ADJUSTMENT = 'ADJUSTMENT',
}
