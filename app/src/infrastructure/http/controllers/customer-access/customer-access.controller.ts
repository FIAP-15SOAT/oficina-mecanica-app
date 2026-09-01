import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
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

import { JwtAuthGuard } from '@infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '@infrastructure/http/guards/roles.guard';
import { Roles } from '@infrastructure/http/decorators/roles.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@infrastructure/http/decorators/current-user.decorator';
import { UserRole } from '@domain/enums/user-role.enum';

import { CustomerAccessController as CustomerAccessCleanController } from '@interface-adapters/customer-access/customer-access.controller';

import { GrantCustomerAccessRequestDto } from './dto/requests/grant-customer-access-request.dto';
import { UpdateCustomerStatusRequestDto } from './dto/requests/update-customer-status-request.dto';
import {
  AccessUserListResponseDto,
  CustomerAccessDataResponseDto,
} from './dto/responses/customer-access-response.dto';

@ApiTags('Acesso Externo de Clientes')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerAccessController {
  constructor(private readonly controller: CustomerAccessCleanController) {}

  @Post(':customerId/access-users')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Conceder acesso externo a um cliente' })
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiCreatedResponse({ type: CustomerAccessDataResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({
    description: 'Vínculo já existe, conflito de identidade ou cliente inativo',
  })
  @ApiUnprocessableEntityResponse({ description: 'CPF inválido' })
  @HttpCode(HttpStatus.CREATED)
  grantAccess(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() request: GrantCustomerAccessRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerAccessDataResponseDto> {
    return this.controller.grantAccess(customerId, user.sub, request);
  }

  @Get(':customerId/access-users')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar usuários com acesso a um cliente' })
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOkResponse({ type: AccessUserListResponseDto })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  listAccessUsers(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<AccessUserListResponseDto> {
    return this.controller.listAccessUsers(customerId);
  }

  @Delete(':customerId/access-users/:userId')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover acesso externo de um usuário a um cliente' })
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  revokeAccess(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.controller.revokeAccess(customerId, userId, user.sub);
  }

  @Patch(':customerId/status')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ativar ou desativar um cliente' })
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  updateStatus(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() request: UpdateCustomerStatusRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.controller.updateStatus(customerId, request.isActive, user.sub);
  }
}
