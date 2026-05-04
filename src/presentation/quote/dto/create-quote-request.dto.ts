import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuoteRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workOrderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
