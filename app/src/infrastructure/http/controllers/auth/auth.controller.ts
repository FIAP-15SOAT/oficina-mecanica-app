import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@infrastructure/http/decorators/current-user.decorator';
import { CurrentCustomer } from '@infrastructure/http/decorators/current-customer.decorator';
import { JwtAuthGuard } from '@infrastructure/http/guards/jwt-auth.guard';
import { JwtCustomerAuthGuard } from '@infrastructure/http/guards/jwt-customer-auth.guard';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';

import { AuthDataResponseDto } from './dto/responses/auth-response.dto';
import { MeDataResponseDto } from './dto/responses/me-response.dto';
import {
  AuthCustomerDataResponseDto,
  AuthCustomerTokensDataResponseDto,
} from './dto/responses/auth-customer-response.dto';
import { CustomerDataResponseDto } from '@infrastructure/http/controllers/customer/dto/responses/customer-response.dto';
import { LoginRequestDto } from './dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from './dto/requests/refresh-token-request.dto';
import { LoginCustomerRequestDto } from './dto/requests/login-customer-request.dto';
import { RefreshCustomerTokenRequestDto } from './dto/requests/refresh-customer-token-request.dto';
import { ChangeOwnCustomerPasswordRequestDto } from './dto/requests/change-own-customer-password-request.dto';

@ApiTags('Autenticação')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('auth')
export class AuthController {
  constructor(private readonly controller: AuthCleanController) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Login realizado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  login(@Body() request: LoginRequestDto): Promise<AuthDataResponseDto> {
    return this.controller.login(request);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens com refresh token' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Tokens renovados com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  refresh(@Body() request: RefreshTokenRequestDto): Promise<AuthDataResponseDto> {
    return this.controller.refresh(request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiOkResponse({ type: MeDataResponseDto, description: 'Dados do usuário' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeDataResponseDto> {
    return this.controller.me(user.sub);
  }

  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar cliente' })
  @ApiOkResponse({ type: AuthCustomerDataResponseDto, description: 'Login realizado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  loginCustomer(@Body() request: LoginCustomerRequestDto): Promise<AuthCustomerDataResponseDto> {
    return this.controller.loginCustomer(request);
  }

  @Post('customer/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens do cliente com refresh token' })
  @ApiOkResponse({
    type: AuthCustomerTokensDataResponseDto,
    description: 'Tokens renovados com sucesso',
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  refreshCustomer(
    @Body() request: RefreshCustomerTokenRequestDto,
  ): Promise<AuthCustomerTokensDataResponseDto> {
    return this.controller.refreshCustomer(request);
  }

  @Get('customer/me')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Obter dados do cliente autenticado' })
  @ApiOkResponse({ type: CustomerDataResponseDto, description: 'Dados do cliente' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  meCustomer(@CurrentCustomer() customer: CustomerTokenPayload): Promise<CustomerDataResponseDto> {
    return this.controller.meCustomer(customer.sub);
  }

  @Patch('customer/password')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiBearerAuth('customer-access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cliente troca a própria senha' })
  @ApiNoContentResponse({ description: 'Senha alterada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Senha atual incorreta' })
  async changeOwnCustomerPassword(
    @CurrentCustomer() customer: CustomerTokenPayload,
    @Body() request: ChangeOwnCustomerPasswordRequestDto,
  ): Promise<void> {
    await this.controller.changeOwnCustomerPassword(customer.sub, request);
  }
}
