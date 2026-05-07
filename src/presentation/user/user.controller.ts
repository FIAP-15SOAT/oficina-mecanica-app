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
import { UserRole } from '@domain/enums/user-role.enum';
import { ICreateUserUseCase } from '@domain/interfaces/use-cases/user/create-user.use-case.interface';
import { IDeleteUserUseCase } from '@domain/interfaces/use-cases/user/delete-user.use-case.interface';
import { IFindAllUsersUseCase } from '@domain/interfaces/use-cases/user/find-all-users.use-case.interface';
import { IFindUserByIdUseCase } from '@domain/interfaces/use-cases/user/find-user-by-id.use-case.interface';
import { IUpdateUserStatusUseCase } from '@domain/interfaces/use-cases/user/update-user-status.use-case.interface';
import { IUpdateUserUseCase } from '@domain/interfaces/use-cases/user/update-user.use-case.interface';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { FindAllUsersQueryDto } from './dto/filter-users.dto';
import { UpdateUserStatusRequestDto } from './dto/update-user-status-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserDataResponseDto, UserPaginatedResponseDto } from './dto/user-response.dto';
import { UserPresenter } from './user.presenter';

@ApiTags('Gestão de Usuários')
@ApiProduces('application/json')
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
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
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async create(@Body() dto: CreateUserRequestDto): Promise<UserDataResponseDto> {
    const result = await this.createUserUseCase.execute(dto);
    return UserPresenter.toDataResponse(result);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuários de forma paginada (somente Admin)' })
  @ApiOkResponse({ type: UserPaginatedResponseDto, description: 'Lista paginada de usuários' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  async findAll(@Query() query: FindAllUsersQueryDto): Promise<UserPaginatedResponseDto> {
    const result = await this.findAllUsersUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return UserPresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar usuário por ID (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Usuário encontrado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserDataResponseDto> {
    const result = await this.findUserByIdUseCase.execute(id);
    return UserPresenter.toDataResponse(result);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados do usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Usuário atualizado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID com formato incorreto' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação de domínio' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<UserDataResponseDto> {
    const result = await this.updateUserUseCase.execute(id, dto);
    return UserPresenter.toDataResponse(result);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar status do usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiOkResponse({ type: UserDataResponseDto, description: 'Status do usuário atualizado' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Usuário já está no status informado' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateUserStatusRequestDto,
  ): Promise<UserDataResponseDto> {
    const result = await this.updateUserStatusUseCase.execute(id, request.active);
    return UserPresenter.toDataResponse(result);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiNoContentResponse({ description: 'Usuário removido' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteUserUseCase.execute(id);
  }
}
