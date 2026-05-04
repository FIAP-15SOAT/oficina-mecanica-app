import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class QuoteEmailDecisionRequestDto {
  @ApiProperty({ enum: QuoteDecisionAction })
  @IsEnum(QuoteDecisionAction)
  action!: QuoteDecisionAction;

  @ApiProperty({ description: 'Token assinado para decisão do orçamento' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
