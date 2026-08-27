import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class QuoteDecisionRequestDto {
  @ApiProperty({ enum: QuoteDecisionAction, example: QuoteDecisionAction.APPROVE })
  @IsEnum(QuoteDecisionAction, { message: 'A ação deve ser APPROVE ou REJECT.' })
  @IsNotEmpty({ message: 'A ação é obrigatória.' })
  action!: QuoteDecisionAction;

  @ApiPropertyOptional({ example: 'Muito caro para o momento' })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  reason?: string;
}
