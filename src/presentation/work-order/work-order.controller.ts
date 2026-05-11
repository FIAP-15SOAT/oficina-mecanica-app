import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { AuthenticatedUser, CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { UserRole } from '@domain/enums/user-role.enum';

import { ICreateWorkOrderUseCase } from '@domain/interfaces/use-cases/work-order/create-work-order.use-case.interface';
import { IFindWorkOrderByIdUseCase } from '@domain/interfaces/use-cases/work-order/find-work-order-by-id.use-case.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { IUpdateWorkOrderUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order.use-case.interface';
import { IUpdateWorkOrderStatusUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order-status.use-case.interface';
import { IUpdateWorkOrderServiceStatusUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order-service-status.use-case.interface';
import { IFindWorkOrderStatusHistoryUseCase } from '@domain/interfaces/use-cases/work-order/find-work-order-status-history.use-case.interface';
import { IFindWorkOrderQuotesUseCase } from '@domain/interfaces/use-cases/quote/find-work-order-quotes.use-case.interface';

import { CreateWorkOrderRequestDto } from './dto/create-work-order-request.dto';
import { UpdateWorkOrderRequestDto } from './dto/update-work-order-request.dto';
import { UpdateWorkOrderStatusRequestDto } from './dto/update-work-order-status-request.dto';
import { FindAllWorkOrdersPaginatedQueryDto } from './dto/filter-work-orders.dto';
import { UpdateWorkOrderServiceStatusRequestDto } from './dto/update-work-order-service-status-request.dto';
import {
  WorkOrderDataResponseDto,
  WorkOrderPaginatedResponseDto,
  WorkOrderServiceItemDataResponseDto,
} from './dto/work-order-response.dto';
import { StatusHistoryListResponseDto } from './dto/status-history-response.dto';
import { QuoteListResponseDto } from '../quote/dto/quote-response.dto';
import { WorkOrderPresenter } from './work-order.presenter';
import { QuotePresenter } from '../quote/quote.presenter';

@ApiTags('Gestão de Ordens de Serviço')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class WorkOrderController {
  constructor(
    @Inject('ICreateWorkOrderUseCase')
    private readonly createWorkOrderUseCase: ICreateWorkOrderUseCase,
    @Inject('IFindWorkOrderByIdUseCase')
    private readonly findWorkOrderByIdUseCase: IFindWorkOrderByIdUseCase,
    @Inject('IFindAllWorkOrdersPaginatedUseCase')
    private readonly findAllWorkOrdersPaginatedUseCase: IFindAllWorkOrdersPaginatedUseCase,
    @Inject('IUpdateWorkOrderUseCase')
    private readonly updateWorkOrderUseCase: IUpdateWorkOrderUseCase,
    @Inject('IUpdateWorkOrderStatusUseCase')
    private readonly updateWorkOrderStatusUseCase: IUpdateWorkOrderStatusUseCase,
    @Inject('IUpdateWorkOrderServiceStatusUseCase')
    private readonly updateWorkOrderServiceStatusUseCase: IUpdateWorkOrderServiceStatusUseCase,
    @Inject('IFindWorkOrderStatusHistoryUseCase')
    private readonly findWorkOrderStatusHistoryUseCase: IFindWorkOrderStatusHistoryUseCase,
    @Inject('IFindWorkOrderQuotesUseCase')
    private readonly findWorkOrderQuotesUseCase: IFindWorkOrderQuotesUseCase,
  ) {}

  @Get(':id/quotes')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar orçamentos de uma Ordem de Serviço' })
  @ApiOkResponse({ type: QuoteListResponseDto, description: 'Lista de orçamentos' })
  @ApiNotFoundResponse({ description: 'Ordem de Serviço não encontrada' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async findQuotes(@Param('id', ParseUUIDPipe) id: string) {
    const quotes = await this.findWorkOrderQuotesUseCase.execute(id);
    return QuotePresenter.toListResponse(quotes);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Criar nova Ordem de Serviço' })
  @ApiCreatedResponse({
    type: WorkOrderDataResponseDto,
    description: 'Ordem de Serviço criada com sucesso',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async create(@Body() dto: CreateWorkOrderRequestDto, @CurrentUser() user: AuthenticatedUser) {
    const workOrder = await this.createWorkOrderUseCase.execute({
      ...dto,
      userId: user.sub,
    });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Ordens de Serviço paginado' })
  @ApiOkResponse({ type: WorkOrderPaginatedResponseDto })
  async findAll(@Query() query: FindAllWorkOrdersPaginatedQueryDto) {
    const { page, limit, ...filters } = query;

    const result = await this.findAllWorkOrdersPaginatedUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });

    return WorkOrderPresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar Ordem de Serviço por ID' })
  @ApiOkResponse({ type: WorkOrderDataResponseDto })
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const workOrder = await this.findWorkOrderByIdUseCase.execute(id);
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar Ordem de Serviço' })
  @ApiOkResponse({ type: WorkOrderDataResponseDto })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse()
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const workOrder = await this.updateWorkOrderUseCase.execute(id, {
      ...dto,
      userId: user.sub,
    });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar status da Ordem de Serviço' })
  @ApiOkResponse({ type: WorkOrderDataResponseDto, description: 'Status atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Ordem de Serviço não encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Transição de status inválida' })
  @ApiConflictResponse({ description: 'Modificação concorrente detectada. Tente novamente.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderStatusRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const workOrder = await this.updateWorkOrderStatusUseCase.execute(id, {
      status: dto.status,
      notes: dto.notes,
      userId: user.sub,
    });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  @Patch(':workOrderId/services/:serviceId')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Atualizar status de serviço da Ordem de Serviço' })
  @ApiOkResponse({
    type: WorkOrderServiceItemDataResponseDto,
    description: 'Status do serviço atualizado',
  })
  @ApiNotFoundResponse({ description: 'Ordem de Serviço ou serviço não encontrado' })
  @ApiConflictResponse({ description: 'Modificação concorrente detectada. Tente novamente.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiParam({ name: 'workOrderId', format: 'uuid' })
  @ApiParam({ name: 'serviceId', format: 'uuid' })
  async updateServiceStatus(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateWorkOrderServiceStatusRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateWorkOrderServiceStatusUseCase.execute({
      workOrderId,
      serviceId,
      status: dto.status,
      userId: user.sub,
    });
    return WorkOrderPresenter.toServiceItemDataResponse(result);
  }

  @Get(':id/status-history')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Histórico de status da Ordem de Serviço' })
  @ApiOkResponse({ type: StatusHistoryListResponseDto })
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', format: 'uuid' })
  async getStatusHistory(@Param('id', ParseUUIDPipe) id: string) {
    const history = await this.findWorkOrderStatusHistoryUseCase.execute(id);
    return WorkOrderPresenter.toStatusHistoryListResponse(history);
  }
}
