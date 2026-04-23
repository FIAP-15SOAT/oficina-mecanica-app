import { randomUUID } from 'crypto';
import { PartsSuppliesController } from '@presentation/parts-supplies/parts-supplies.controller';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { ICreatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/create-part-supply.use-case.interface';
import { IFindAllPartsSuppliesUseCase } from '@domain/interfaces/use-cases/part-supply/find-all-parts-supplies.use-case.interface';
import { IFindPartSupplyByIdUseCase } from '@domain/interfaces/use-cases/part-supply/find-part-supply-by-id.use-case.interface';
import { IUpdatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/update-part-supply.use-case.interface';
import { IDeletePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/delete-part-supply.use-case.interface';
import { IUpdateStockUseCase } from '@domain/interfaces/use-cases/part-supply/update-stock.use-case.interface';
import {
  createMockPartSupply,
} from '../../../helpers/part-supply-mock.factory';

describe('PartsSuppliesController', () => {
  let controller: PartsSuppliesController;
  let createPartSupplyUseCase: jest.Mocked<ICreatePartSupplyUseCase>;
  let findAllPartsSuppliesUseCase: jest.Mocked<IFindAllPartsSuppliesUseCase>;
  let findPartSupplyByIdUseCase: jest.Mocked<IFindPartSupplyByIdUseCase>;
  let updatePartSupplyUseCase: jest.Mocked<IUpdatePartSupplyUseCase>;
  let deletePartSupplyUseCase: jest.Mocked<IDeletePartSupplyUseCase>;
  let updateStockUseCase: jest.Mocked<IUpdateStockUseCase>;

  beforeEach(() => {
    createPartSupplyUseCase = { execute: jest.fn() };
    findAllPartsSuppliesUseCase = { execute: jest.fn() };
    findPartSupplyByIdUseCase = { execute: jest.fn() };
    updatePartSupplyUseCase = { execute: jest.fn() };
    deletePartSupplyUseCase = { execute: jest.fn() };
    updateStockUseCase = { execute: jest.fn() };

    controller = new PartsSuppliesController(
      createPartSupplyUseCase,
      findAllPartsSuppliesUseCase,
      findPartSupplyByIdUseCase,
      updatePartSupplyUseCase,
      deletePartSupplyUseCase,
      updateStockUseCase,
    );
  });

  describe('create', () => {
    it('should create a part/supply and return it wrapped in data', async () => {
      const dto = {
        name: 'Filtro de Óleo',
        sku: 'FO-001',
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 25,
        salePrice: 45,
      };
      const created = createMockPartSupply({ name: dto.name, sku: dto.sku });
      createPartSupplyUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(dto as any);

      expect(result).toEqual({ data: created });
      expect(createPartSupplyUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should convert expiresAt string to Date before calling use case', async () => {
      const dto = {
        name: 'Fluido de Freio',
        sku: 'FF-001',
        category: PartSupplyCategory.SUPPLY,
        unit: Unit.L,
        costPrice: 15,
        salePrice: 30,
        expiresAt: '2026-12-31',
      };
      const created = createMockPartSupply({ sku: dto.sku });
      createPartSupplyUseCase.execute.mockResolvedValue(created);

      await controller.create(dto as any);

      const callArg = createPartSupplyUseCase.execute.mock.calls[0][0];
      expect(callArg.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should return paginated result with defaults when no query filters are given', async () => {
      const items = [
        createMockPartSupply({ id: randomUUID(), name: 'Peça 1' }),
        createMockPartSupply({ id: randomUUID(), name: 'Peça 2' }),
      ];
      const useCaseOutput = { items, totalRecords: 2, totalPages: 1, page: 1, limit: 10 };
      findAllPartsSuppliesUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await controller.findAll({} as any);

      expect(result).toEqual({ data: items, totalRecords: 2, totalPages: 1, page: 1, limit: 10 });
      expect(findAllPartsSuppliesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should forward name, sku, category, isActive and lowStock filters', async () => {
      const items = [createMockPartSupply()];
      const useCaseOutput = { items, totalRecords: 1, totalPages: 1, page: 1, limit: 10 };
      findAllPartsSuppliesUseCase.execute.mockResolvedValue(useCaseOutput);

      await controller.findAll({
        page: 1,
        limit: 10,
        name: 'Filtro',
        sku: 'FO',
        category: PartSupplyCategory.PART,
        isActive: true,
        lowStock: true,
      } as any);

      expect(findAllPartsSuppliesUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        name: 'Filtro',
        sku: 'FO',
        category: PartSupplyCategory.PART,
        isActive: true,
        lowStock: true,
      });
    });
  });

  describe('findById', () => {
    it('should return a part/supply wrapped in data', async () => {
      const id = randomUUID();
      const partSupply = createMockPartSupply({ id });
      findPartSupplyByIdUseCase.execute.mockResolvedValue(partSupply);

      const result = await controller.findById(id);

      expect(result).toEqual({ data: partSupply });
      expect(findPartSupplyByIdUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a part/supply and return it wrapped in data', async () => {
      const id = randomUUID();
      const dto = { name: 'Filtro de Óleo Premium', salePrice: 59.9 };
      const updated = createMockPartSupply({ id, name: dto.name, salePrice: dto.salePrice });
      updatePartSupplyUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(id, dto as any);

      expect(result).toEqual({ data: updated });
      expect(updatePartSupplyUseCase.execute).toHaveBeenCalledWith(id, expect.objectContaining(dto));
    });
  });

  describe('remove', () => {
    it('should call delete use case and return nothing', async () => {
      const id = randomUUID();
      deletePartSupplyUseCase.execute.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(deletePartSupplyUseCase.execute).toHaveBeenCalledWith(id);
      expect(deletePartSupplyUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStock', () => {
    it('should register a stock ENTRY and return updated part/supply', async () => {
      const id = randomUUID();
      const dto = { type: StockMovementType.ENTRY, quantity: 5, reason: 'Reposição' };
      const after = createMockPartSupply({ id, stock: 15 });
      updateStockUseCase.execute.mockResolvedValue(after);

      const result = await controller.updateStock(id, dto as any);

      expect(result).toEqual({ data: after });
      expect(updateStockUseCase.execute).toHaveBeenCalledWith(id, {
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Reposição',
        workOrderId: undefined,
      });
    });

    it('should register a stock EXIT linked to a work order', async () => {
      const id = randomUUID();
      const workOrderId = randomUUID();
      const dto = { type: StockMovementType.EXIT, quantity: 3, workOrderId };
      const after = createMockPartSupply({ id, stock: 7 });
      updateStockUseCase.execute.mockResolvedValue(after);

      const result = await controller.updateStock(id, dto as any);

      expect(result).toEqual({ data: after });
      expect(updateStockUseCase.execute).toHaveBeenCalledWith(id, {
        type: StockMovementType.EXIT,
        quantity: 3,
        reason: undefined,
        workOrderId,
      });
    });

    it('should register a stock ADJUSTMENT', async () => {
      const id = randomUUID();
      const dto = { type: StockMovementType.ADJUSTMENT, quantity: 8, reason: 'Inventário' };
      const after = createMockPartSupply({ id, stock: 8 });
      updateStockUseCase.execute.mockResolvedValue(after);

      const result = await controller.updateStock(id, dto as any);

      expect(result).toEqual({ data: after });
    });
  });
});
