import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { IAuthenticateUserUseCase } from '@domain/interfaces/use-cases/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@domain/interfaces/use-cases/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@domain/interfaces/use-cases/auth/refresh-token.use-case.interface';
import { IRegisterUserUseCase } from '@domain/interfaces/use-cases/auth/register-user.use-case.interface';
import { AuthDataResponseDto } from './dto/auth-response.dto';
import { MeDataResponseDto } from './dto/me-response.dto';
import { RegisterDataResponseDto, RegisterResponseDto } from './dto/register-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IRegisterUserUseCase')
    private readonly registerUseCase: IRegisterUserUseCase,
    @Inject('IAuthenticateUserUseCase')
    private readonly authenticateUseCase: IAuthenticateUserUseCase,
    @Inject('IGetCurrentUserUseCase')
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    @Inject('IRefreshTokenUseCase')
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
  ) { }

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiCreatedResponse({
    type: RegisterDataResponseDto,
    description: 'Usuário registrado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  async register(@Body() dto: RegisterRequestDto): Promise<RegisterDataResponseDto> {
    const result = await this.registerUseCase.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
    return { data: result as RegisterResponseDto };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginRequestDto): Promise<AuthDataResponseDto> {
    const result = await this.authenticateUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens com refresh token' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Tokens renovados com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<AuthDataResponseDto> {
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });
    return { data: result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiOkResponse({ type: MeDataResponseDto, description: 'Dados do usuário' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeDataResponseDto> {
    const result = await this.getCurrentUserUseCase.execute(user.sub);
    return { data: result };
  }
}
