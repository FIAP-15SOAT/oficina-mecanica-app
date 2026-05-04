import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkOrderRequestDto {
  @ApiProperty({ description: 'ID do cliente', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'ID do veículo', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({ description: 'ID do mecânico responsável', format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @ApiPropertyOptional({ description: 'Descrição do problema relatado', example: 'Barulho no motor' })
  @IsOptional()
  @IsString()
  problemDescription?: string | null;

  @ApiPropertyOptional({ description: 'Notas internas da oficina', example: 'Verificar correia' })
  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @ApiPropertyOptional({ description: 'Quilometragem do veículo no momento do serviço', example: 55000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileageAtService?: number | null;
}
