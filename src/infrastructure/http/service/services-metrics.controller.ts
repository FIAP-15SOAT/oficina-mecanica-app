import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';

import { ServiceController as ServiceCleanController } from '@interface-adapters/service/service.controller';

import { PaginationDto } from '@presentation/common/dto/pagination.dto';
import { ServiceMetricsPaginatedResponseDto } from './dto/responses/service-metrics-response.dto';

@ApiTags('Gestão de Serviços - Métricas')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('services-metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ServicesMetricsController {
  constructor(
    @Inject('ServiceCleanController')
    private readonly controller: ServiceCleanController,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obter métricas de todos os serviços' })
  @ApiOkResponse({
    type: ServiceMetricsPaginatedResponseDto,
    description: 'Lista paginada de métricas de todos os serviços',
  })
  getAllMetrics(@Query() query: PaginationDto): Promise<ServiceMetricsPaginatedResponseDto> {
    return this.controller.getAllMetrics(query);
  }
}
