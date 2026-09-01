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

// TODO(Task 12, Step 6): swap JwtAuthGuard for AnyAuthGuard once the combined
// internal/external auth guard exists, so this route accepts both flows.
import { JwtAuthGuard } from '@infrastructure/http/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@infrastructure/http/decorators/current-user.decorator';

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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trocar a própria senha (token interno ou externo)' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado ou senha atual incorreta' })
  @ApiUnprocessableEntityResponse({ description: 'Nova senha não atende aos requisitos de força' })
  @ApiConflictResponse({ description: 'Nova senha é igual à senha atual' })
  changePassword(
    @Body() request: ChangeOwnPasswordRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.controller.changePassword(user.sub, request);
  }
}
