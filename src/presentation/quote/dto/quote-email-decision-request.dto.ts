import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class QuoteEmailDecisionRequestDto {
  @ApiProperty({ description: 'Token assinado para decisão do orçamento' })
  @IsString({ message: 'O token deve ser um texto.' })
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token!: string;
}
