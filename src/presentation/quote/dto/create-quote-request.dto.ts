import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MAX_NOTES_LENGTH } from '@domain/constants/validation/quote.constants';

export class CreateQuoteRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'O ID da ordem de serviço deve ser um UUID válido.' })
  workOrderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'As notas devem ser um texto.' })
  @MaxLength(MAX_NOTES_LENGTH, {
    message: `As notas devem ter no máximo ${MAX_NOTES_LENGTH} caracteres.`,
  })
  notes?: string | null;
}
