import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '@infrastructure/http/guards/jwt-auth.guard';
import { Public } from '@infrastructure/http/decorators/public.decorator';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';

import { AuthDataResponseDto } from './dto/responses/auth-response.dto';
import { MeDataResponseDto } from './dto/responses/me-response.dto';
import { LoginRequestDto } from './dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from './dto/requests/refresh-token-request.dto';
import { ConfirmPasswordResetRequestDto } from './dto/requests/confirm-password-reset-request.dto';

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

  @Post('password-reset-confirmations')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirmar redefinição de senha com código numérico' })
  @ApiNoContentResponse({ description: 'Senha redefinida com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Código inválido ou expirado' })
  confirmPasswordReset(@Body() request: ConfirmPasswordResetRequestDto): Promise<void> {
    return this.controller.confirmPasswordReset(request);
  }
}
