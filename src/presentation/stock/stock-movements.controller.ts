import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { UserRole } from '@domain/enums/user-role.enum';

import { IFindStockMovementsUseCase } from '@domain/interfaces/use-cases/reporting/find-stock-movements.use-case.interface';

import { StockPresenter } from './stock.presenter';

import { StockMovementPaginatedResponseDto } from './dto/stock-movement-response.dto';
import { FindStockMovementsQueryDto } from './dto/filter-stock-movements.dto';

@ApiTags('Estoque - Movimentações')
@Controller('stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class StockMovementsController {
  constructor(
    @Inject('IFindStockMovementsUseCase')
    private readonly findStockMovementsUseCase: IFindStockMovementsUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  @ApiOkResponse({
    type: StockMovementPaginatedResponseDto,
    description: 'Lista paginada de movimentações',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async getStockMovements(@Query() query: FindStockMovementsQueryDto) {
    const { page, limit, ...filters } = query;

    const result = await this.findStockMovementsUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });

    return StockPresenter.toPaginatedStockMovementsResponse(result);
  }
}
