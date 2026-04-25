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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateCustomerUseCase } from '@domain/interfaces/use-cases/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@domain/interfaces/use-cases/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@domain/interfaces/use-cases/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@domain/interfaces/use-cases/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@domain/interfaces/use-cases/customer/delete-customer.use-case.interface';
import { IFindVehiclesByCustomerIdUseCase } from '@domain/interfaces/use-cases/vehicle/find-vehicles-by-customer-id.use-case.interface';
import { CreateCustomerRequestDto } from './dto/create-customer-request.dto';
import { UpdateCustomerRequestDto } from './dto/update-customer-request.dto';
import { FilterCustomersDto } from './dto/filter-customers.dto';
import { CustomerDataResponseDto } from './dto/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/customer-paginated-response.dto';
import { CustomerPresenter } from './customer.presenter';
import { VehiclePaginatedResponseDto } from '../vehicles/dto/vehicle-paginated-response.dto';
import { VehiclePresenter } from '../vehicles/vehicle.presenter';
import { FilterVehiclesDto } from '../vehicles/dto/filter-vehicles.dto';

@ApiTags('Gestão de Clientes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject('ICreateCustomerUseCase')
    private readonly createCustomerUseCase: ICreateCustomerUseCase,
    @Inject('IFindAllCustomersUseCase')
    private readonly findAllCustomersUseCase: IFindAllCustomersUseCase,
    @Inject('IFindCustomerByIdUseCase')
    private readonly findCustomerByIdUseCase: IFindCustomerByIdUseCase,
    @Inject('IUpdateCustomerUseCase')
    private readonly updateCustomerUseCase: IUpdateCustomerUseCase,
    @Inject('IDeleteCustomerUseCase')
    private readonly deleteCustomerUseCase: IDeleteCustomerUseCase,
    @Inject('IFindVehiclesByCustomerIdUseCase')
    private readonly findVehiclesByCustomerIdUseCase: IFindVehiclesByCustomerIdUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Cadastrar Cliente' })
  @ApiCreatedResponse({ type: CustomerDataResponseDto, description: 'Cliente cadastrado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio (documento inválido)' })
  @ApiConflictResponse({ description: 'Documento ou e-mail já cadastrado' })
  async create(@Body() dto: CreateCustomerRequestDto): Promise<CustomerDataResponseDto> {
    const result = await this.createCustomerUseCase.execute(dto);
    return CustomerPresenter.toDataResponse(result);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Clientes' })
  @ApiOkResponse({ type: CustomerPaginatedResponseDto, description: 'Lista paginada de Clientes' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findAll(@Query() query: FilterCustomersDto): Promise<CustomerPaginatedResponseDto> {
    const result = await this.findAllCustomersUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      name: query.name,
      type: query.type,
      document: query.document,
    });
    return CustomerPresenter.toPaginatedDataResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar Cliente por ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: CustomerDataResponseDto, description: 'Cliente encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerDataResponseDto> {
    const result = await this.findCustomerByIdUseCase.execute(id);
    return CustomerPresenter.toDataResponse(result);
  }

  @Get(':id/vehicles')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Veículos do Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: VehiclePaginatedResponseDto, description: 'Lista paginada de veículos do cliente' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  async findVehiclesByCustomerId(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FilterVehiclesDto,
  ): Promise<VehiclePaginatedResponseDto> {
    const result = await this.findVehiclesByCustomerIdUseCase.execute(id, {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
    return VehiclePresenter.toPaginatedDataResponse(result);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: CustomerDataResponseDto, description: 'Cliente atualizado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio (documento inválido)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Documento ou e-mail já cadastrado para outro cliente' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerRequestDto,
  ): Promise<CustomerDataResponseDto> {
    const result = await this.updateCustomerUseCase.execute(id, dto);
    return CustomerPresenter.toDataResponse(result);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiNoContentResponse({ description: 'Cliente excluído com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Cliente possui vínculos e não pode ser excluído' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteCustomerUseCase.execute(id);
  }
}
