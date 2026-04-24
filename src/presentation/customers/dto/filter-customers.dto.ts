import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerType } from '@domain/enums/customer-type.enum';

export class FilterCustomersDto {
  @ApiPropertyOptional({ description: 'Número da página', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O número da página deve ser um inteiro.' })
  @Min(1, { message: 'O número da página deve ser no mínimo 1.' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite de itens deve ser um inteiro.' })
  @Min(1, { message: 'O limite de itens deve ser no mínimo 1.' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrar por nome (busca parcial)', example: 'João' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ enum: CustomerType, description: 'Filtrar por tipo: INDIVIDUAL ou COMPANY' })
  @IsOptional()
  @IsEnum(CustomerType, { message: 'Tipo inválido. Use INDIVIDUAL ou COMPANY.' })
  type?: CustomerType;

  @ApiPropertyOptional({ description: 'Filtrar por documento (exato)', example: '123.456.789-09' })
  @IsOptional()
  @IsString({ message: 'O documento deve ser um texto.' })
  document?: string;
}
