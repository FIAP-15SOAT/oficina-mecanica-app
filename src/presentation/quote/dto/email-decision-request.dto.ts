import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class EmailDecisionRequestDto {
  @ApiProperty({
    description: 'Ação a ser realizada (APPROVED ou REJECTED)',
    enum: QuoteDecisionAction,
    example: QuoteDecisionAction.APPROVED,
  })
  @IsEnum(QuoteDecisionAction, { message: 'A ação deve ser APPROVED ou REJECTED' })
  @IsNotEmpty({ message: 'A ação é obrigatória' })
  action: QuoteDecisionAction;

  @ApiProperty({
    description: 'Token de decisão gerado no envio do orçamento',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'O token deve ser um texto' })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  token: string;
}
