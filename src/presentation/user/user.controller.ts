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
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateUserUseCase } from '@domain/interfaces/use-cases/user/create-user.use-case.interface';
import { IDeleteUserUseCase } from '@domain/interfaces/use-cases/user/delete-user.use-case.interface';
import { IFindAllUsersUseCase } from '@domain/interfaces/use-cases/user/find-all-users.use-case.interface';
import { IFindUserByIdUseCase } from '@domain/interfaces/use-cases/user/find-user-by-id.use-case.interface';
import { IUpdateUserStatusUseCase } from '@domain/interfaces/use-cases/user/update-user-status.use-case.interface';
import { IUpdateUserUseCase } from '@domain/interfaces/use-cases/user/update-user.use-case.interface';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserStatusRequestDto } from './dto/update-user-status-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserDataResponseDto, UsersDataResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(
    @Inject('ICreateUserUseCase')
    private readonly createUserUseCase: ICreateUserUseCase,
    @Inject('IFindUserByIdUseCase')
    private readonly findUserByIdUseCase: IFindUserByIdUseCase,
    @Inject('IFindAllUsersUseCase')
    private readonly findAllUsersUseCase: IFindAllUsersUseCase,
    @Inject('IUpdateUserUseCase')
    private readonly updateUserUseCase: IUpdateUserUseCase,
    @Inject('IUpdateUserStatusUseCase')
    private readonly updateUserStatusUseCase: IUpdateUserStatusUseCase,
    @Inject('IDeleteUserUseCase')
    private readonly deleteUserUseCase: IDeleteUserUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (somente Admin)' })
  @ApiCreatedResponse({ type: UserDataResponseDto, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async create(@Body() dto: CreateUserRequestDto): Promise<UserDataResponseDto> {
    const result = await this.createUserUseCase.execute(dto);
    return { data: result };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (somente Admin)' })
  @ApiOkResponse({ type: UsersDataResponseDto, description: 'Lista de usuários' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findAll(): Promise<UsersDataResponseDto> {
    const result = await this.findAllUsersUseCase.execute();
    return { data: result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar usuário por ID (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Usuário encontrado' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserDataResponseDto> {
    const result = await this.findUserByIdUseCase.execute(id);
    return { data: result };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados do usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Usuário atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ID com formato incorreto' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<UserDataResponseDto> {
    const result = await this.updateUserUseCase.execute(id, dto);
    return { data: result };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar status do usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Status do usuário atualizado' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Usuário já está no status informado' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateUserStatusRequestDto,
  ): Promise<UserDataResponseDto> {
    const result = await this.updateUserStatusUseCase.execute(id, request.active);
    return { data: result };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiNoContentResponse({ description: 'Usuário removido' })
  @ApiResponse({ status: 400, description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteUserUseCase.execute(id);
  }
}
