import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** Filtros para consulta de Serviços */
export class FilterServicesDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome do serviço', example: 'Troca de Óleo' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;
}

export class FindAllServicesQueryDto extends IntersectionType(PaginationDto, FilterServicesDto) {}
