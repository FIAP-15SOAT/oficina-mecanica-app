import { Body, Controller, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AnyAuthGuard } from '@infrastructure/http/guards/any-auth.guard';
import { CurrentPrincipal } from '@infrastructure/http/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';

import { MeController as MeCleanController } from '@interface-adapters/me/me.controller';
import { ChangeOwnPasswordRequestDto } from './dto/requests/change-own-password-request.dto';

@ApiTags('Minha Conta')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@ApiBearerAuth('access-token')
@Controller('me')
export class MeController {
  constructor(private readonly controller: MeCleanController) {}

  @Patch('password')
  @UseGuards(AnyAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trocar a própria senha (token interno ou externo)' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado ou senha atual incorreta' })
  @ApiUnprocessableEntityResponse({ description: 'Nova senha não atende aos requisitos de força' })
  @ApiConflictResponse({ description: 'Nova senha é igual à senha atual' })
  changePassword(
    @Body() request: ChangeOwnPasswordRequestDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<void> {
    return this.controller.changePassword(principal.sub, request);
  }
}
