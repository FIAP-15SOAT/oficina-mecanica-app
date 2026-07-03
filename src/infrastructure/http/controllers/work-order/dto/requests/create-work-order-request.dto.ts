import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MAX_PROBLEM_DESCRIPTION_LENGTH,
  MAX_INTERNAL_NOTES_LENGTH,
} from '@domain/constants/validation/work-order.constants';

export class CreateWorkOrderItemServiceRequestDto {
  @ApiProperty({
    description: 'ID do serviço a ser incluído no orçamento inicial',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'O ID do serviço deve ser um UUID válido.' })
  serviceId!: string;

  @ApiProperty({ description: 'Quantidade do serviço', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade deve ser no mínimo 1.' })
  quantity!: number;
}

export class CreateWorkOrderItemPartSupplyRequestDto {
  @ApiProperty({
    description: 'ID da peça/insumo a ser incluído no orçamento inicial',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'O ID da peça/insumo deve ser um UUID válido.' })
  partSupplyId!: string;

  @ApiProperty({ description: 'Quantidade da peça/insumo', example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade deve ser no mínimo 1.' })
  quantity!: number;
}

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

  @ApiPropertyOptional({
    type: [CreateWorkOrderItemServiceRequestDto],
    description: 'Serviços a serem incluídos no orçamento inicial da ordem de serviço',
  })
  @IsOptional()
  @IsArray({ message: 'Os serviços devem ser uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderItemServiceRequestDto)
  services?: CreateWorkOrderItemServiceRequestDto[];

  @ApiPropertyOptional({
    type: [CreateWorkOrderItemPartSupplyRequestDto],
    description: 'Peças/insumos a serem incluídos no orçamento inicial da ordem de serviço',
  })
  @IsOptional()
  @IsArray({ message: 'As peças/insumos devem ser uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderItemPartSupplyRequestDto)
  partsSupplies?: CreateWorkOrderItemPartSupplyRequestDto[];
}
