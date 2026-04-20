import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateServiceRequestDto {
  @ApiProperty({
    example: 'Troca de óleo premium',
    description: 'Nome do serviço (mín. 3 e máx. 150 caracteres)',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Troca com óleo sintético e filtro',
    description: 'Descrição opcional (máx. 500 caracteres)',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string | null;

  @ApiProperty({ example: 189.9, description: 'Preço base do serviço (maior que zero)' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'O preço base deve ser um número válido' },
  )
  @IsPositive({ message: 'O preço base deve ser maior que zero' })
  basePrice!: number;

  @ApiProperty({ example: 90, description: 'Tempo estimado em minutos (inteiro maior que zero)' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 },
    { message: 'O tempo estimado deve ser um número inteiro' },
  )
  @IsPositive({ message: 'O tempo estimado deve ser maior que zero' })
  estimatedTimeMin!: number;

  @ApiProperty({ example: true, description: 'Indica se o serviço está ativo' })
  @IsBoolean({ message: 'isActive deve ser um booleano' })
  isActive!: boolean;
}
