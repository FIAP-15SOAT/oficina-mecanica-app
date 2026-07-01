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

import { CustomerController } from '@interface-adapters/customer/customer.controller';
import { IFindVehiclesByCustomerIdUseCase } from '@application/ports/input/vehicle/find-vehicles-by-customer-id.use-case.interface';
import { VehiclePresenter } from '@presentation/vehicles/vehicle.presenter';
import { UserRole } from '@domain/enums/user-role.enum';

import {
  VehicleDataResponseDto,
  VehicleResponseDto,
} from '@presentation/vehicles/dto/vehicle-response.dto';
import { CreateCustomerRequestDto } from './dto/requests/create-customer-request.dto';
import { UpdateCustomerRequestDto } from './dto/requests/update-customer-request.dto';
import { FindAllCustomersQueryDto } from './dto/requests/filter-customers.dto';
import { CustomerDataResponseDto } from './dto/responses/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/responses/customer-paginated-response.dto';

@ApiTags('Gestão de Clientes')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject('CustomerCleanController')
    private readonly controller: CustomerController,
    @Inject('IFindVehiclesByCustomerIdUseCase')
    private readonly findVehiclesByCustomerIdUseCase: IFindVehiclesByCustomerIdUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Cadastrar Cliente' })
  @ApiCreatedResponse({
    type: CustomerDataResponseDto,
    description: 'Cliente cadastrado com sucesso',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnprocessableEntityResponse({
    description: 'Erro de validação de domínio (documento inválido)',
  })
  @ApiConflictResponse({ description: 'Documento ou e-mail já cadastrado' })
  create(@Body() dto: CreateCustomerRequestDto): Promise<CustomerDataResponseDto> {
    return this.controller.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Clientes' })
  @ApiOkResponse({ type: CustomerPaginatedResponseDto, description: 'Lista paginada de Clientes' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  findAll(@Query() query: FindAllCustomersQueryDto): Promise<CustomerPaginatedResponseDto> {
    return this.controller.findAll(query);
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
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerDataResponseDto> {
    return this.controller.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: CustomerDataResponseDto, description: 'Cliente atualizado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido' })
  @ApiUnprocessableEntityResponse({
    description: 'Erro de validação de domínio (documento inválido)',
  })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Documento ou e-mail já cadastrado para outro cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerRequestDto,
  ): Promise<CustomerDataResponseDto> {
    return this.controller.update(id, dto);
  }

  @Get(':id/vehicles')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Veículos do Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: [VehicleDataResponseDto], description: 'Lista de veículos do cliente' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  async findVehiclesByCustomerId(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: VehicleResponseDto[] }> {
    const result = await this.findVehiclesByCustomerIdUseCase.execute(id);
    return VehiclePresenter.toListDataResponse(result);
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
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.controller.remove(id);
  }
}
