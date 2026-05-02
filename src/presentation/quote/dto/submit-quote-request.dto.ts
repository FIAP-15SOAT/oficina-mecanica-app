import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitQuoteRequestDto {
  @ApiPropertyOptional({ description: 'E-mail do cliente para envio do orcamento' })
  @IsOptional()
  @IsString()
  customerEmail?: string | null;
}
