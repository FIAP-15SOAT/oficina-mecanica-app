import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class DecideMyQuoteRequestDto {
  @ApiProperty({
    enum: QuoteDecisionAction,
    example: QuoteDecisionAction.APPROVE,
    description: 'Decisão sobre o orçamento: aprovar ou rejeitar',
  })
  @IsEnum(QuoteDecisionAction, { message: 'Ação inválida. Use approve ou reject.' })
  action!: QuoteDecisionAction;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Valor acima do orçamento previsto',
    description:
      'Motivo da decisão. Obrigatório quando action = reject; ignorado quando action = approve.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres.' })
  reason?: string | null;
}
