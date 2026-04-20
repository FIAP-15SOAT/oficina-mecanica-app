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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from '@application/use-cases/auth/register-user.use-case';
import { AuthenticatedUser, CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { AuthResponseDto, MeResponseDto, RegisterResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('RegisterUserUseCase')
    private readonly registerUseCase: RegisterUserUseCase,
    @Inject('AuthenticateUserUseCase')
    private readonly authenticateUseCase: AuthenticateUserUseCase,
    @Inject('GetCurrentUserUseCase')
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject('RefreshTokenUseCase')
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({
    status: 201,
    description: 'Usuário registrado com sucesso',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    const result = await this.registerUseCase.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
    return result as RegisterResponseDto;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticateUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens com refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário', type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.getCurrentUserUseCase.execute(user.sub);
  }
}
