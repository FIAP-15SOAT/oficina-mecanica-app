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
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';

import { UserRole } from '@domain/enums/user-role.enum';
import { ICreatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/create-part-supply.use-case.interface';
import { IFindPartSupplyByIdUseCase } from '@domain/interfaces/use-cases/part-supply/find-part-supply-by-id.use-case.interface';
import { IFindAllPartsSuppliesUseCase } from '@domain/interfaces/use-cases/part-supply/find-all-parts-supplies.use-case.interface';
import { IUpdatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/update-part-supply.use-case.interface';
import { IDeletePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/delete-part-supply.use-case.interface';
import { IUpdateStockUseCase } from '@domain/interfaces/use-cases/part-supply/update-stock.use-case.interface';

import { CreatePartSupplyRequestDto } from './dto/create-part-supply-request.dto';
import { UpdatePartSupplyRequestDto } from './dto/update-part-supply-request.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { FindAllPartsSuppliesQueryDto } from './dto/filter-parts-supplies.dto';
import { PartSupplyDataResponseDto } from './dto/part-supply-response.dto';
import { PartSupplyPaginatedResponseDto } from './dto/part-supply-paginated-response.dto';
import { PartSupplyPresenter } from './part-supply.presenter';

@ApiTags('Gestão de Peças e Insumos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parts-supplies')
export class PartsSuppliesController {
  constructor(
    @Inject('ICreatePartSupplyUseCase')
    private readonly createPartSupplyUseCase: ICreatePartSupplyUseCase,
    @Inject('IFindAllPartsSuppliesUseCase')
    private readonly findAllPartsSuppliesUseCase: IFindAllPartsSuppliesUseCase,
    @Inject('IFindPartSupplyByIdUseCase')
    private readonly findPartSupplyByIdUseCase: IFindPartSupplyByIdUseCase,
    @Inject('IUpdatePartSupplyUseCase')
    private readonly updatePartSupplyUseCase: IUpdatePartSupplyUseCase,
    @Inject('IDeletePartSupplyUseCase')
    private readonly deletePartSupplyUseCase: IDeletePartSupplyUseCase,
    @Inject('IUpdateStockUseCase')
    private readonly updateStockUseCase: IUpdateStockUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cadastrar Peça ou Insumo' })
  @ApiCreatedResponse({
    type: PartSupplyDataResponseDto,
    description: 'Peça ou Insumo cadastrado com sucesso',
  })
  @ApiConflictResponse({ description: 'Já existe uma Peça ou Insumo com este SKU no Estoque' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async create(@Body() dto: CreatePartSupplyRequestDto): Promise<PartSupplyDataResponseDto> {
    const result = await this.createPartSupplyUseCase.execute({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return PartSupplyPresenter.toDataResponse(result);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Consulta de Estoque de Peças e Insumos' })
  @ApiOkResponse({
    type: PartSupplyPaginatedResponseDto,
    description: 'Lista paginada de Peças e Insumos',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findAll(
    @Query() query: FindAllPartsSuppliesQueryDto,
  ): Promise<PartSupplyPaginatedResponseDto> {
    const { page, limit, ...filters } = query;
    const result = await this.findAllPartsSuppliesUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });
    return PartSupplyPresenter.toPaginatedDataResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar Peça ou Insumo por ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({ type: PartSupplyDataResponseDto, description: 'Peça ou Insumo encontrado' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<PartSupplyDataResponseDto> {
    const result = await this.findPartSupplyByIdUseCase.execute(id);
    return PartSupplyPresenter.toDataResponse(result);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar Peça ou Insumo' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({
    type: PartSupplyDataResponseDto,
    description: 'Peça ou Insumo atualizado com sucesso',
  })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiConflictResponse({ description: 'SKU já está em uso por outra Peça ou Insumo' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ID inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartSupplyRequestDto,
  ): Promise<PartSupplyDataResponseDto> {
    const result = await this.updatePartSupplyUseCase.execute(id, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return PartSupplyPresenter.toDataResponse(result);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover Peça ou Insumo do Estoque' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiNoContentResponse({ description: 'Peça ou Insumo removido do Estoque com sucesso' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deletePartSupplyUseCase.execute(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Movimentar Estoque' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({ type: PartSupplyDataResponseDto, description: 'Estoque atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiConflictResponse({ description: 'Estoque insuficiente para realizar a saída' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ): Promise<PartSupplyDataResponseDto> {
    const result = await this.updateStockUseCase.execute(id, {
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason,
      workOrderId: dto.workOrderId,
    });
    return PartSupplyPresenter.toDataResponse(result);
  }
}
