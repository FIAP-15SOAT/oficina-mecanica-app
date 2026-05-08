import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { UserRole } from '@domain/enums/user-role.enum';

import { IFindStockReservationsUseCase } from '@domain/interfaces/use-cases/reporting/find-stock-reservations.use-case.interface';

import { StockPresenter } from './stock.presenter';

import { StockReservationPaginatedResponseDto } from './dto/stock-reservation-response.dto';
import { FindStockReservationsQueryDto } from './dto/filter-stock-reservations.dto';

@ApiTags('Estoque - Reservas')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('stock-reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class StockReservationsController {
  constructor(
    @Inject('IFindStockReservationsUseCase')
    private readonly findStockReservationsUseCase: IFindStockReservationsUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar reservas de estoque' })
  @ApiOkResponse({
    type: StockReservationPaginatedResponseDto,
    description: 'Lista paginada de reservas',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async getStockReservations(@Query() query: FindStockReservationsQueryDto) {
    const { page, limit, ...filters } = query;

    const result = await this.findStockReservationsUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });

    return StockPresenter.toPaginatedStockReservationsResponse(result);
  }
}
