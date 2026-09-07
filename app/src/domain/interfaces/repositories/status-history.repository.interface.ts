import { StatusHistory } from '../../entities/status-history.entity';

export interface IStatusHistoryRepository {
  create(entry: StatusHistory): Promise<StatusHistory>;

  /**
   * Devolve o histórico **em ordem cronológica crescente** por `createdAt` — a
   * entrada mais antiga primeiro.
   *
   * ⚠️ A ordem é parte do contrato, não detalhe de implementação. O cálculo de
   * permanência por status (`measureWorkOrderDurations`) depende dela nas duas
   * pontas: a permanência ancora na **última** entrada que abriu o status, e os
   * totais ancoram na **primeira**. Uma implementação que devolva outra ordem
   * não quebra nada de forma visível — ela corrompe as durações em silêncio,
   * porque não existe no dado nenhum sinal de que a ordem mudou.
   */
  findByWorkOrderId(workOrderId: string): Promise<StatusHistory[]>;
}
