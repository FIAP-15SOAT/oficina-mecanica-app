import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Filtros para consulta de Serviços */
export class FilterServicesDto {
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

  @ApiPropertyOptional({ description: 'Filtrar por nome do serviço', example: 'Troca de Óleo' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por status: true = apenas ativos, false = apenas inativos, omitir = todos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O filtro de status deve ser true ou false.' })
  active?: boolean;
}
