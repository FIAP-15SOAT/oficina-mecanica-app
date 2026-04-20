import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';

import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateServiceUseCase } from '@domain/interfaces/use-cases/service/create-service.use-case.interface';
import { IDeleteServiceUseCase } from '@domain/interfaces/use-cases/service/delete-service.use-case.interface';
import { IFindAllServicesPaginatedUseCase } from '@domain/interfaces/use-cases/service/find-all-services-paginated.use-case.interface';
import { IFindServiceByIdUseCase } from '@domain/interfaces/use-cases/service/find-service-by-id.use-case.interface';
import { IUpdateServiceStatusUseCase } from '@domain/interfaces/use-cases/service/update-service-status.use-case.interface';
import { IUpdateServiceUseCase } from '@domain/interfaces/use-cases/service/update-service.use-case.interface';
import { ServicePaginatedResponseDto } from './dto/service-paginated-response.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceStatusRequestDto } from './dto/update-service-status-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';

@ApiTags('Services')
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
    @Inject('IUpdateServiceStatusUseCase')
    private readonly updateServiceStatusUseCase: IUpdateServiceStatusUseCase,
    @Inject('IDeleteServiceUseCase')
    private readonly deleteServiceUseCase: IDeleteServiceUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso', type: ServiceResponseDto })
  @ApiResponse({ status: 409, description: 'Serviço já cadastrado' })
  @ApiResponse({ status: 422, description: 'Erro de validação de domínio' })
  async create(@Body() request: CreateServiceRequestDto): Promise<ServiceResponseDto> {
    return this.createServiceUseCase.execute(request);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar serviços paginados (somente Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de serviços',
    type: ServicePaginatedResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('activeOnly', new DefaultValuePipe(true), ParseBoolPipe) activeOnly: boolean,
  ): Promise<ServicePaginatedResponseDto> {
    const result = await this.findAllServicesPaginatedUseCase.execute(page, pageSize, activeOnly);

    return {
      data: result.services,
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar serviço por ID (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado', type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceResponseDto> {
    return this.findServiceByIdUseCase.execute(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados do serviço (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado', type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiResponse({ status: 409, description: 'Outro serviço com o mesmo nome já existe' })
  @ApiResponse({ status: 422, description: 'Erro de validação de domínio' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateServiceRequestDto,
  ): Promise<ServiceResponseDto> {
    return this.updateServiceUseCase.execute(id, request);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar status do serviço (somente Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Status do serviço atualizado',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiResponse({ status: 422, description: 'Serviço já está no status informado' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateServiceStatusRequestDto,
  ): Promise<ServiceResponseDto> {
    return this.updateServiceStatusUseCase.execute(id, request.active);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover serviço (somente Admin)' })
  @ApiResponse({ status: 204, description: 'Serviço removido' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteServiceUseCase.execute(id);
  }
}
