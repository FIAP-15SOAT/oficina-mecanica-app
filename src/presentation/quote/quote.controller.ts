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
  Post,
  Patch,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '@infrastructure/auth/roles.guard';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { Public } from '@infrastructure/auth/public.decorator';
import { AuthenticatedUser, CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { UserRole } from '@domain/enums/user-role.enum';

import { ICreateQuoteUseCase } from '@application/ports/input/quote/create-quote.use-case.interface';
import { IFindQuoteByIdUseCase } from '@application/ports/input/quote/find-quote-by-id.use-case.interface';
import { IAddQuoteServiceUseCase } from '@application/ports/input/quote/add-quote-service.use-case.interface';
import { IRemoveQuoteServiceUseCase } from '@application/ports/input/quote/remove-quote-service.use-case.interface';
import { IAddQuotePartSupplyUseCase } from '@application/ports/input/quote/add-quote-part-supply.use-case.interface';
import { IRemoveQuotePartSupplyUseCase } from '@application/ports/input/quote/remove-quote-part-supply.use-case.interface';
import { IUpdateQuoteServiceQuantityUseCase } from '@application/ports/input/quote/update-quote-service-quantity.use-case.interface';
import { IUpdateQuotePartSupplyQuantityUseCase } from '@application/ports/input/quote/update-quote-part-supply-quantity.use-case.interface';
import { ISubmitQuoteUseCase } from '@application/ports/input/quote/submit-quote.use-case.interface';
import { IEmailDecisionQuoteUseCase } from '@application/ports/input/quote/email-decision-quote.use-case.interface';
import { IUpdateQuoteStatusUseCase } from '@application/ports/input/quote/update-quote-status.use-case.interface';
import { IFindAllQuotesPaginatedUseCase } from '@application/ports/input/quote/find-all-quotes-paginated.use-case.interface';

import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { AddQuoteServiceRequestDto } from './dto/add-quote-service-request.dto';
import { AddQuotePartSupplyRequestDto } from './dto/add-quote-part-supply-request.dto';
import { UpdateQuoteServiceItemRequestDto } from './dto/update-quote-service-item-request.dto';
import { UpdateQuotePartSupplyItemRequestDto } from './dto/update-quote-part-supply-item-request.dto';
import { UpdateQuoteStatusRequestDto } from './dto/update-quote-status-request.dto';
import { QuoteEmailDecisionRequestDto } from './dto/quote-email-decision-request.dto';
import { FindAllQuotesQueryDto } from './dto/find-all-quotes-query.dto';
import {
  QuoteDataResponseDto,
  QuoteWithItemsDataResponseDto,
  QuotePaginatedResponseDto,
} from './dto/quote-response.dto';
import { QuotePresenter } from './quote.presenter';

@ApiTags('Gestão de Orçamentos')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class QuoteController {
  constructor(
    @Inject('ICreateQuoteUseCase') private readonly createQuoteUseCase: ICreateQuoteUseCase,
    @Inject('IFindQuoteByIdUseCase') private readonly findQuoteByIdUseCase: IFindQuoteByIdUseCase,
    @Inject('IAddQuoteServiceUseCase')
    private readonly addQuoteServiceUseCase: IAddQuoteServiceUseCase,
    @Inject('IRemoveQuoteServiceUseCase')
    private readonly removeQuoteServiceUseCase: IRemoveQuoteServiceUseCase,
    @Inject('IAddQuotePartSupplyUseCase')
    private readonly addQuotePartSupplyUseCase: IAddQuotePartSupplyUseCase,
    @Inject('IRemoveQuotePartSupplyUseCase')
    private readonly removeQuotePartSupplyUseCase: IRemoveQuotePartSupplyUseCase,
    @Inject('IUpdateQuoteServiceQuantityUseCase')
    private readonly updateQuoteServiceQuantityUseCase: IUpdateQuoteServiceQuantityUseCase,
    @Inject('IUpdateQuotePartSupplyQuantityUseCase')
    private readonly updateQuotePartSupplyQuantityUseCase: IUpdateQuotePartSupplyQuantityUseCase,
    @Inject('ISubmitQuoteUseCase') private readonly submitQuoteUseCase: ISubmitQuoteUseCase,
    @Inject('IEmailDecisionQuoteUseCase')
    private readonly emailDecisionQuoteUseCase: IEmailDecisionQuoteUseCase,
    @Inject('IUpdateQuoteStatusUseCase')
    private readonly updateQuoteStatusUseCase: IUpdateQuoteStatusUseCase,
    @Inject('IFindAllQuotesPaginatedUseCase')
    private readonly findAllQuotesPaginatedUseCase: IFindAllQuotesPaginatedUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Listar orçamentos paginado' })
  @ApiOkResponse({ type: QuotePaginatedResponseDto })
  async findAll(@Query() query: FindAllQuotesQueryDto) {
    const { page, limit, ...filters } = query;
    const result = await this.findAllQuotesPaginatedUseCase.execute({
      page: page ?? 1,
      limit: limit ?? 10,
      ...filters,
    });

    return QuotePresenter.toPaginatedResponse(result);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Criar orçamento para Ordem de Serviço' })
  @ApiCreatedResponse({ type: QuoteDataResponseDto, description: 'Orçamento criado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Ordem de Serviço não encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  async create(@Body() dto: CreateQuoteRequestDto) {
    const quote = await this.createQuoteUseCase.execute(dto);
    return QuotePresenter.toDataResponse(quote);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar orçamento por ID com itens' })
  @ApiOkResponse({ type: QuoteWithItemsDataResponseDto, description: 'Orçamento encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.findQuoteByIdUseCase.execute(id);
    return QuotePresenter.toWithItemsResponse(result);
  }

  @Post(':id/services')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Adicionar serviço ao orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Serviço adicionado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Orçamento ou Serviço não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  async addService(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddQuoteServiceRequestDto) {
    const quote = await this.addQuoteServiceUseCase.execute({ quoteId: id, ...dto });
    return QuotePresenter.toDataResponse(quote);
  }

  @Patch(':id/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar quantidade de um serviço no orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Quantidade atualizada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Item não encontrado no orçamento' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  @ApiParam({ name: 'serviceId', format: 'uuid', description: 'ID do serviço' })
  async updateService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateQuoteServiceItemRequestDto,
  ) {
    const quote = await this.updateQuoteServiceQuantityUseCase.execute({
      quoteId: id,
      serviceId,
      ...dto,
    });
    return QuotePresenter.toDataResponse(quote);
  }

  @Delete(':id/services/:serviceId')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover serviço do orçamento' })
  @ApiNoContentResponse({ description: 'Serviço removido com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Item não encontrado no orçamento' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  @ApiParam({ name: 'serviceId', format: 'uuid', description: 'ID do serviço' })
  async removeService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    await this.removeQuoteServiceUseCase.execute(id, serviceId);
  }

  @Post(':id/parts-supplies')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Adicionar peça/insumo ao orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Peça/insumo adicionado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Orçamento ou Peça não encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  async addPartSupply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddQuotePartSupplyRequestDto,
  ) {
    const quote = await this.addQuotePartSupplyUseCase.execute({ quoteId: id, ...dto });
    return QuotePresenter.toDataResponse(quote);
  }

  @Patch(':id/parts-supplies/:partSupplyId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Atualizar quantidade de uma peça/insumo no orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Quantidade atualizada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Item não encontrado no orçamento' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  @ApiParam({ name: 'partSupplyId', format: 'uuid', description: 'ID da peça/insumo' })
  async updatePartSupply(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partSupplyId', ParseUUIDPipe) partSupplyId: string,
    @Body() dto: UpdateQuotePartSupplyItemRequestDto,
  ) {
    const quote = await this.updateQuotePartSupplyQuantityUseCase.execute({
      quoteId: id,
      partSupplyId,
      ...dto,
    });
    return QuotePresenter.toDataResponse(quote);
  }

  @Delete(':id/parts-supplies/:partSupplyId')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover peça/insumo do orçamento' })
  @ApiNoContentResponse({ description: 'Peça/insumo removida com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Item não encontrado no orçamento' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  @ApiParam({ name: 'partSupplyId', format: 'uuid', description: 'ID da peça/insumo' })
  async removePartSupply(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partSupplyId', ParseUUIDPipe) partSupplyId: string,
  ) {
    await this.removeQuotePartSupplyUseCase.execute(id, partSupplyId);
  }

  @Post(':id/submissions')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Enviar orçamento para aprovação do cliente' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Orçamento enviado com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Orçamento ou Ordem de Serviço não encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  async submit(@Param('id', ParseUUIDPipe) id: string) {
    const quote = await this.submitQuoteUseCase.execute(id);
    return QuotePresenter.toDataResponse(quote);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Aprovar ou rejeitar orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Status do orçamento atualizado' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiConflictResponse({ description: 'Modificação concorrente detectada. Tente novamente.' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteStatusRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.updateQuoteStatusUseCase.execute(id, user.sub, dto);
    return QuotePresenter.toDataResponse(quote);
  }

  @Get(':id/decisions')
  @Public()
  @ApiOperation({ summary: 'Aprovar ou rejeitar orçamento via link de email' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Decisão registrada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Erro de validação ou regra de negócio' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do orçamento' })
  @ApiQuery({ name: 'token', description: 'Token assinado para decisão do orçamento' })
  async emailDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuoteEmailDecisionRequestDto,
  ) {
    const quote = await this.emailDecisionQuoteUseCase.execute(id, query.token);

    return QuotePresenter.toDataResponse(quote);
  }
}
