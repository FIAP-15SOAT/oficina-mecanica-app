import { Module } from '@nestjs/common';

import { FindStockMovementsUseCase } from '@application/use-cases/stock/find-stock-movements.use-case';
import { FindStockReservationsUseCase } from '@application/use-cases/stock/find-stock-reservations.use-case';

import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';
import { IStockReservationRepository } from '@domain/interfaces/repositories/stock-reservation.repository.interface';

import { StockMovementsController } from './stock-movements.controller';
import { StockReservationsController } from './stock-reservations.controller';

@Module({
  controllers: [StockMovementsController, StockReservationsController],
  providers: [
    {
      provide: 'IFindStockMovementsUseCase',
      useFactory: (movementRepo: IStockMovementRepository) =>
        new FindStockMovementsUseCase(movementRepo),
      inject: ['IStockMovementRepository'],
    },
    {
      provide: 'IFindStockReservationsUseCase',
      useFactory: (reservationRepo: IStockReservationRepository) =>
        new FindStockReservationsUseCase(reservationRepo),
      inject: ['IStockReservationRepository'],
    },
  ],
})
export class StockModule {}
