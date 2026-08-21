import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtCustomerAuthGuard } from '@infrastructure/http/guards/jwt-customer-auth.guard';
import { CurrentCustomer } from '@infrastructure/http/decorators/current-customer.decorator';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

import { CustomerQuoteController as CustomerQuoteCleanController } from '@interface-adapters/quote/customer-quote.controller';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';
import { QuotePaginatedResponseDto } from './dto/responses/quote-response.dto';

@ApiTags('Orçamentos')
@ApiProduces('application/json')
@Controller('quotes')
@UseGuards(JwtCustomerAuthGuard)
@ApiBearerAuth('customer-access-token')
export class CustomerQuoteController {
  constructor(private readonly controller: CustomerQuoteCleanController) {}

  @Get('me')
  @ApiOperation({ summary: 'Listar meus orçamentos pendentes de decisão' })
  @ApiOkResponse({
    type: QuotePaginatedResponseDto,
    description: 'Orçamentos SENT do cliente logado',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  findMyPending(
    @CurrentCustomer() customer: CustomerTokenPayload,
    @Query() query: PaginationDto,
  ): Promise<QuotePaginatedResponseDto> {
    return this.controller.findMyPending(customer.sub, {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}
