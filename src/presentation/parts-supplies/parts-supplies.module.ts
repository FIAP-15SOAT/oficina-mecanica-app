import { Module } from '@nestjs/common';
import { CreatePartSupplyUseCase } from '@application/use-cases/part-supply/create-part-supply.use-case';
import { FindAllPartsSuppliesUseCase } from '@application/use-cases/part-supply/find-all-parts-supplies.use-case';
import { FindPartSupplyByIdUseCase } from '@application/use-cases/part-supply/find-part-supply-by-id.use-case';
import { UpdatePartSupplyUseCase } from '@application/use-cases/part-supply/update-part-supply.use-case';
import { DeletePartSupplyUseCase } from '@application/use-cases/part-supply/delete-part-supply.use-case';
import { UpdateStockUseCase } from '@application/use-cases/part-supply/update-stock.use-case';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { PartsSuppliesController } from './parts-supplies.controller';

@Module({
  controllers: [PartsSuppliesController],
  providers: [
    {
      provide: 'ICreatePartSupplyUseCase',
      useFactory: (repo: IPartSupplyRepository) => new CreatePartSupplyUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
    {
      provide: 'IFindAllPartsSuppliesUseCase',
      useFactory: (repo: IPartSupplyRepository) => new FindAllPartsSuppliesUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
    {
      provide: 'IFindPartSupplyByIdUseCase',
      useFactory: (repo: IPartSupplyRepository) => new FindPartSupplyByIdUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
    {
      provide: 'IUpdatePartSupplyUseCase',
      useFactory: (repo: IPartSupplyRepository) => new UpdatePartSupplyUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
    {
      provide: 'IDeletePartSupplyUseCase',
      useFactory: (repo: IPartSupplyRepository) => new DeletePartSupplyUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
    {
      provide: 'IUpdateStockUseCase',
      useFactory: (repo: IPartSupplyRepository) => new UpdateStockUseCase(repo),
      inject: ['IPartSupplyRepository'],
    },
  ],
})
export class PartsSuppliesModule {}
