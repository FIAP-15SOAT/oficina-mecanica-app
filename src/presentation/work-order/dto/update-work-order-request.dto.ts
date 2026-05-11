import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MAX_PROBLEM_DESCRIPTION_LENGTH,
  MAX_INTERNAL_NOTES_LENGTH,
} from '@domain/constants/validation/work-order.constants';

export class UpdateWorkOrderRequestDto {
  @ApiPropertyOptional({
    description: 'ID do mecânico responsável',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do mecânico deve ser um UUID válido.' })
  assignedUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Descrição do problema relatado',
    example: 'Barulho no motor',
  })
  @IsOptional()
  @IsString({ message: 'A descrição do problema deve ser um texto.' })
  @MaxLength(MAX_PROBLEM_DESCRIPTION_LENGTH, {
    message: `A descrição do problema deve ter no máximo ${MAX_PROBLEM_DESCRIPTION_LENGTH} caracteres.`,
  })
  problemDescription?: string | null;

  @ApiPropertyOptional({ description: 'Notas internas da oficina', example: 'Verificar correia' })
  @IsOptional()
  @IsString({ message: 'As notas internas devem ser um texto.' })
  @MaxLength(MAX_INTERNAL_NOTES_LENGTH, {
    message: `As notas internas devem ter no máximo ${MAX_INTERNAL_NOTES_LENGTH} caracteres.`,
  })
  internalNotes?: string | null;

  @ApiPropertyOptional({
    description: 'Quilometragem do veículo no momento do serviço',
    example: 55000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @Min(0, { message: 'A quilometragem não pode ser negativa.' })
  mileageAtService?: number | null;
}
