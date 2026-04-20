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
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { ToggleUserStatusUseCase } from '@application/use-cases/user/toggle-user-status.use-case';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(
    @Inject('CreateUserUseCase')
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject('FindUserByIdUseCase')
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    @Inject('FindAllUsersUseCase')
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    @Inject('UpdateUserUseCase')
    private readonly updateUserUseCase: UpdateUserUseCase,
    @Inject('ToggleUserStatusUseCase')
    private readonly toggleUserStatusUseCase: ToggleUserStatusUseCase,
    @Inject('DeleteUserUseCase')
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (somente Admin)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  @ApiResponse({ status: 422, description: 'Erro de validação de domínio' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUserUseCase.execute(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários', type: [UserResponseDto] })
  async findAll(): Promise<UserResponseDto[]> {
    return this.findAllUsersUseCase.execute();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar usuário por ID (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.findUserByIdUseCase.execute(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados do usuário (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  @ApiResponse({ status: 422, description: 'Erro de validação de domínio' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.updateUserUseCase.execute(id, dto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ativar usuário (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Usuário ativado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 422, description: 'Usuário já está ativo' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.toggleUserStatusUseCase.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desativar usuário (somente Admin)' })
  @ApiResponse({ status: 200, description: 'Usuário desativado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 422, description: 'Usuário já está desativado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.toggleUserStatusUseCase.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário (somente Admin)' })
  @ApiResponse({ status: 204, description: 'Usuário removido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteUserUseCase.execute(id);
  }
}
