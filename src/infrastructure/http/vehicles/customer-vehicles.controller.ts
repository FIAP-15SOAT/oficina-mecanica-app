import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/http/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/http/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/http/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';

import { VehicleController } from '@interface-adapters/vehicle/vehicle.controller';

import { VehicleListResponseDto } from './dto/responses/vehicle-list-response.dto';

@ApiTags('Gestão de Clientes')
@ApiProduces('application/json')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerVehiclesController {
  constructor(private readonly controller: VehicleController) {}

  @Get(':id/vehicles')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar Veículos do Cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiOkResponse({ type: VehicleListResponseDto, description: 'Lista de veículos do cliente' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  findByCustomerId(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleListResponseDto> {
    return this.controller.findByCustomerId(id);
  }
}
