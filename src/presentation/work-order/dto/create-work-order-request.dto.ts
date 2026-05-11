import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MAX_PROBLEM_DESCRIPTION_LENGTH,
  MAX_INTERNAL_NOTES_LENGTH,
} from '@domain/constants/validation/work-order.constants';

export class CreateWorkOrderRequestDto {
  @ApiProperty({
    description: 'ID do cliente',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  customerId!: string;

  @ApiProperty({
    description: 'ID do veículo',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID(undefined, { message: 'O ID do veículo deve ser um UUID válido.' })
  vehicleId!: string;

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
