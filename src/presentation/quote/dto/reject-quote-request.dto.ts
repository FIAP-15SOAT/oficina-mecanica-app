import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectQuoteRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;
}
