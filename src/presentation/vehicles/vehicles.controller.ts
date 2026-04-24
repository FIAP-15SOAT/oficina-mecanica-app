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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/create-vehicle.use-case.interface';
import { IFindAllVehiclesUseCase } from '@domain/interfaces/use-cases/vehicle/find-all-vehicles.use-case.interface';
import { IFindVehicleByIdUseCase } from '@domain/interfaces/use-cases/vehicle/find-vehicle-by-id.use-case.interface';
import { IUpdateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/update-vehicle.use-case.interface';
import { IDeleteVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/delete-vehicle.use-case.interface';
import { CreateVehicleRequestDto } from './dto/create-vehicle-request.dto';
import { UpdateVehicleRequestDto } from './dto/update-vehicle-request.dto';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';
import { VehicleDataResponseDto } from './dto/vehicle-response.dto';
import { VehiclePaginatedResponseDto } from './dto/vehicle-paginated-response.dto';
import { VehiclePresenter } from './vehicle.presenter';

@ApiTags('Gestão de Veículos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    @Inject('ICreateVehicleUseCase')
    private readonly createVehicleUseCase: ICreateVehicleUseCase,
    @Inject('IFindAllVehiclesUseCase')
    private readonly findAllVehiclesUseCase: IFindAllVehiclesUseCase,
    @Inject('IFindVehicleByIdUseCase')
    private readonly findVehicleByIdUseCase: IFindVehicleByIdUseCase,
    @Inject('IUpdateVehicleUseCase')
    private readonly updateVehicleUseCase: IUpdateVehicleUseCase,
    @Inject('IDeleteVehicleUseCase')
    private readonly deleteVehicleUseCase: IDeleteVehicleUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Cadastrar Veículo' })
  @ApiCreatedResponse({ type: VehicleDataResponseDto, description: 'Veículo cadastrado com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Placa já cadastrada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(@Body() dto: CreateVehicleRequestDto): Promise<VehicleDataResponseDto> {
    const result = await this.createVehicleUseCase.execute(dto);
    return VehiclePresenter.toResponse(result);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Veículos' })
  @ApiOkResponse({ type: VehiclePaginatedResponseDto, description: 'Lista paginada de Veículos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAll(@Query() query: FilterVehiclesDto): Promise<VehiclePaginatedResponseDto> {
    const result = await this.findAllVehiclesUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      customerId: query.customerId,
      brand: query.brand,
      plate: query.plate,
    });
    return VehiclePresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar Veículo por ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Veículo' })
  @ApiOkResponse({ type: VehicleDataResponseDto, description: 'Veículo encontrado' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleDataResponseDto> {
    const result = await this.findVehicleByIdUseCase.execute(id);
    return VehiclePresenter.toResponse(result);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar Veículo' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Veículo' })
  @ApiOkResponse({ type: VehicleDataResponseDto, description: 'Veículo atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Veículo ou cliente não encontrado' })
  @ApiConflictResponse({ description: 'Placa já cadastrada para outro veículo' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ID inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleRequestDto,
  ): Promise<VehicleDataResponseDto> {
    const result = await this.updateVehicleUseCase.execute(id, dto);
    return VehiclePresenter.toResponse(result);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir Veículo' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Veículo' })
  @ApiNoContentResponse({ description: 'Veículo excluído com sucesso' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  @ApiConflictResponse({ description: 'Veículo possui ordens de serviço' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteVehicleUseCase.execute(id);
  }
}
