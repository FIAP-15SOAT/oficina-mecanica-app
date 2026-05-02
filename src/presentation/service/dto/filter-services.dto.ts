import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** Filtros para consulta de Serviços */
export class FilterServicesDto {

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

export class FindAllServicesQueryDto extends IntersectionType(
  PaginationDto,
  FilterServicesDto,
) {}
