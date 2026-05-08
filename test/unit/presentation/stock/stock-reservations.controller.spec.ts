import { StockReservationsController } from '@presentation/stock/stock-reservations.controller';
import { randomUUID } from 'node:crypto';
import { IFindStockReservationsUseCase } from '@domain/interfaces/use-cases/reporting/find-stock-reservations.use-case.interface';

describe('StockReservationsController', () => {
  let controller: StockReservationsController;
  let findStockReservationsUseCase: jest.Mocked<IFindStockReservationsUseCase>;

  beforeEach(() => {
    findStockReservationsUseCase = { execute: jest.fn() };
    controller = new StockReservationsController(findStockReservationsUseCase);
  });

  describe('getStockReservations', () => {
    it('should return paginated stock reservations', async () => {
      const page = 1;
      const limit = 10;
      const partSupplyId = randomUUID();
      const workOrderId = randomUUID();
      const resultUseCase = {
        items: [
          { id: randomUUID(), partSupplyId, workOrderId, quantity: 5, createdAt: new Date() },
        ],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };

      findStockReservationsUseCase.execute.mockResolvedValue(resultUseCase);

      const result = await controller.getStockReservations({
        page,
        limit,
        partSupplyId,
        workOrderId,
      });

      expect(result.data).toHaveLength(1);
      expect(findStockReservationsUseCase.execute).toHaveBeenCalledWith({
        page,
        limit,
        partSupplyId,
        workOrderId,
      });
    });

    it('should use default pagination values when not provided', async () => {
      const resultUseCase = {
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 20 },
      };
      findStockReservationsUseCase.execute.mockResolvedValue(resultUseCase);

      await controller.getStockReservations({});

      expect(findStockReservationsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });
});
