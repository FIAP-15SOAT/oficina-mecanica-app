import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { QuoteEmailDecisionAction } from '@domain/enums/quote-email-decision-action.enum';

export class QuoteEmailDecisionRequestDto {
  @ApiProperty({ enum: QuoteEmailDecisionAction })
  @IsEnum(QuoteEmailDecisionAction)
  action!: QuoteEmailDecisionAction;

  @ApiProperty({ description: 'Token assinado para decisão do orçamento' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
