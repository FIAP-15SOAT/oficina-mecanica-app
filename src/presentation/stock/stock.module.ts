import { Module } from '@nestjs/common';

import { FindStockMovementsUseCase } from '@application/use-cases/stock/find-stock-movements.use-case';
import { FindStockReservationsUseCase } from '@application/use-cases/stock/find-stock-reservations.use-case';

import { PrismaStockMovementRepository } from '@infrastructure/repositories/prisma-stock-movement.repository';
import { PrismaStockReservationRepository } from '@infrastructure/repositories/prisma-stock-reservation.repository';

import { StockMovementsController } from './stock-movements.controller';
import { StockReservationsController } from './stock-reservations.controller';

@Module({
  controllers: [StockMovementsController, StockReservationsController],
  providers: [
    { provide: 'IStockMovementRepository', useClass: PrismaStockMovementRepository },
    { provide: 'IStockReservationRepository', useClass: PrismaStockReservationRepository },
    {
      provide: 'IFindStockMovementsUseCase',
      useFactory: (movementRepo: PrismaStockMovementRepository) =>
        new FindStockMovementsUseCase(movementRepo),
      inject: ['IStockMovementRepository'],
    },
    {
      provide: 'IFindStockReservationsUseCase',
      useFactory: (reservationRepo: PrismaStockReservationRepository) =>
        new FindStockReservationsUseCase(reservationRepo),
      inject: ['IStockReservationRepository'],
    },
  ],
})
export class StockModule { }
