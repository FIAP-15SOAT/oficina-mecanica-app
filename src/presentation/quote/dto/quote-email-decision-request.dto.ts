import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class QuoteEmailDecisionRequestDto {
  @ApiProperty({ description: 'Token assinado para decisão do orçamento' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
