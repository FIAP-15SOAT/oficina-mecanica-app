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
import {
  AuthenticateUserUseCase,
  GetCurrentUserUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
} from '../../application/use-cases/auth';
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from '../../infrastructure/auth';
import {
  AuthResponseDto,
  LoginDto,
  MeResponseDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterResponseDto,
} from './dto';

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
