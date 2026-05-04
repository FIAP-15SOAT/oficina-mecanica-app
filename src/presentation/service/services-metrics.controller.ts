import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';

import { UserRole } from '@domain/enums/user-role.enum';
import { IFindAllServicesMetricsUseCase } from '@domain/interfaces/use-cases/service/find-all-services-metrics.use-case.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceMetricsPaginatedResponseDto } from './dto/service-metrics-response.dto';
import { ServiceMetricsPresenter } from './service-metrics.presenter';

@ApiTags('Gestão de Serviços - Métricas')
@Controller('services-metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ServicesMetricsController {
  constructor(
    @Inject('IFindAllServicesMetricsUseCase')
    private readonly findAllServicesMetricsUseCase: IFindAllServicesMetricsUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obter métricas de todos os serviços' })
  @ApiOkResponse({
    type: ServiceMetricsPaginatedResponseDto,
    description: 'Lista paginada de métricas de todos os serviços',
  })
  async getAllMetrics(@Query() pagination: PaginationDto) {
    const result = await this.findAllServicesMetricsUseCase.execute({
      page: pagination.page ?? 1,
      limit: pagination.limit ?? 10,
    });

    return ServiceMetricsPresenter.toPaginatedDataResponse(result);
  }
}
