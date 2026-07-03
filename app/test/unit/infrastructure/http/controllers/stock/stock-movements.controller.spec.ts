import { randomUUID } from 'node:crypto';

import { StockMovementsController } from '@infrastructure/http/controllers/stock/stock-movements.controller';

import { StockController } from '@interface-adapters/stock/stock.controller';
import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

import { FindStockMovementsQueryDto } from '@infrastructure/http/controllers/stock/dto/requests/filter-stock-movements.dto';

import { createMockPartSupply } from '../../../../../helpers/part-supply-mock.factory';

describe('StockMovementsController', () => {
  let httpController: StockMovementsController;
  let cleanController: StockController;

  beforeEach(() => {
    cleanController = new StockController({ execute: jest.fn() }, { execute: jest.fn() });
    httpController = new StockMovementsController(cleanController);
  });

  describe('getStockMovements', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const partSupply = createMockPartSupply();

      const movement = StockMovement.reconstitute({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: null,
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Restock',
        createdAt: new Date(),
      });

      movement.partSupply = partSupply;

      const query: FindStockMovementsQueryDto = {
        page: 1,
        limit: 10,
        partSupplyId: partSupply.id,
      };

      const response = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      jest.spyOn(cleanController, 'getStockMovements').mockResolvedValue(response);

      const result = await httpController.getStockMovements(query);

      expect(result).toBe(response);
      expect(cleanController.getStockMovements).toHaveBeenCalledWith(query);
    });
  });
});
