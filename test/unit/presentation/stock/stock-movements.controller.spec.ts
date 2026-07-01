import { StockMovementsController } from '@presentation/stock/stock-movements.controller';
import { randomUUID } from 'node:crypto';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IFindStockMovementsUseCase } from '@application/ports/input/stock/find-stock-movements.use-case.interface';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let findStockMovementsUseCase: jest.Mocked<IFindStockMovementsUseCase>;

  beforeEach(() => {
    findStockMovementsUseCase = { execute: jest.fn() };
    controller = new StockMovementsController(findStockMovementsUseCase);
  });

  describe('getStockMovements', () => {
    it('should return paginated stock movements', async () => {
      const page = 1;
      const limit = 10;
      const partSupply = createMockPartSupply();
      const type = StockMovementType.ENTRY;
      const resultUseCase = {
        items: [
          {
            id: randomUUID(),
            partSupplyId: partSupply.id,
            partSupply,
            type,
            quantity: 5,
            createdAt: new Date(),
          },
        ],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };
      findStockMovementsUseCase.execute.mockResolvedValue(resultUseCase);

      const result = await controller.getStockMovements({
        page,
        limit,
        partSupplyId: partSupply.id,
        type,
      });

      expect(result.data).toHaveLength(1);
      expect(findStockMovementsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page, limit, partSupplyId: partSupply.id, type }),
      );
    });

    it('should use default pagination values when not provided', async () => {
      const resultUseCase = {
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 20 },
      };
      findStockMovementsUseCase.execute.mockResolvedValue(resultUseCase);

      await controller.getStockMovements({});

      expect(findStockMovementsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should correctly parse startDate and endDate', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      findStockMovementsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      await controller.getStockMovements({ startDate, endDate });

      expect(findStockMovementsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate,
          endDate,
        }),
      );
    });
  });
});
