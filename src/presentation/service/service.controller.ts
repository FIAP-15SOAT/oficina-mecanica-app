import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';

import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateServiceUseCase } from '@application/ports/input/service/create-service.use-case.interface';
import { IDeleteServiceUseCase } from '@application/ports/input/service/delete-service.use-case.interface';
import { IFindAllServicesPaginatedUseCase } from '@application/ports/input/service/find-all-services-paginated.use-case.interface';
import { IFindServiceByIdUseCase } from '@application/ports/input/service/find-service-by-id.use-case.interface';

import { IUpdateServiceUseCase } from '@application/ports/input/service/update-service.use-case.interface';
import { IFindServiceMetricsUseCase } from '@application/ports/input/service/find-service-metrics.use-case.interface';
import { ServicePaginatedResponseDto } from './dto/service-paginated-response.dto';
import { ServiceDataResponseDto } from './dto/service-response.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { FindAllServicesQueryDto } from './dto/filter-services.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { ServiceMetricsDataResponseDto } from './dto/service-metrics-response.dto';
import { ServicePresenter } from './service.presenter';
import { ServiceMetricsPresenter } from './service-metrics.presenter';

@ApiTags('Gestão de Serviços')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ServiceController {
  constructor(
    @Inject('ICreateServiceUseCase')
    private readonly createServiceUseCase: ICreateServiceUseCase,
    @Inject('IFindServiceByIdUseCase')
    private readonly findServiceByIdUseCase: IFindServiceByIdUseCase,
    @Inject('IFindAllServicesPaginatedUseCase')
    private readonly findAllServicesPaginatedUseCase: IFindAllServicesPaginatedUseCase,
    @Inject('IUpdateServiceUseCase')
    private readonly updateServiceUseCase: IUpdateServiceUseCase,
    @Inject('IDeleteServiceUseCase')
    private readonly deleteServiceUseCase: IDeleteServiceUseCase,
    @Inject('IFindServiceMetricsUseCase')
    private readonly findServiceMetricsUseCase: IFindServiceMetricsUseCase,
  ) {}

  @Get(':id/metrics')
  @Roles(UserRole.ADMIN)
  @ApiTags('Gestão de Serviços - Métricas')
  @ApiOperation({ summary: 'Obter métricas de um serviço específico' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    type: ServiceMetricsDataResponseDto,
    description: 'Métricas do serviço solicitado',
  })
  async getMetrics(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.findServiceMetricsUseCase.execute(id);
    return ServiceMetricsPresenter.toDataResponse(result);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiCreatedResponse({ type: ServiceDataResponseDto, description: 'Serviço criado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiConflictResponse({ description: 'Serviço já cadastrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async create(@Body() request: CreateServiceRequestDto): Promise<ServiceDataResponseDto> {
    const result = await this.createServiceUseCase.execute(request);
    return ServicePresenter.toDataResponse(result);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Listar serviços paginados (somente Admin)' })
  @ApiOkResponse({ type: ServicePaginatedResponseDto, description: 'Lista paginada de serviços' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findAll(@Query() query: FindAllServicesQueryDto): Promise<ServicePaginatedResponseDto> {
    const { page, limit, ...filters } = query;

    const result = await this.findAllServicesPaginatedUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });

    return ServicePresenter.toPaginatedDataResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar serviço por ID (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do serviço' })
  @ApiOkResponse({ type: ServiceDataResponseDto, description: 'Serviço encontrado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceDataResponseDto> {
    const result = await this.findServiceByIdUseCase.execute(id);
    return ServicePresenter.toDataResponse(result);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados do serviço (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do serviço' })
  @ApiOkResponse({ type: ServiceDataResponseDto, description: 'Serviço atualizado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID com formato incorreto' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @ApiConflictResponse({ description: 'Outro serviço com o mesmo nome já existe' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateServiceRequestDto,
  ): Promise<ServiceDataResponseDto> {
    const result = await this.updateServiceUseCase.execute(id, request);
    return ServicePresenter.toDataResponse(result);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover serviço (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do serviço' })
  @ApiNoContentResponse({ description: 'Serviço removido' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteServiceUseCase.execute(id);
  }
}
