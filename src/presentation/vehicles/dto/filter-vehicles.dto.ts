import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PLATE_REGEX } from '@domain/constants/plate.regex';
import { PaginationDto } from '@presentation/common/dto/pagination.dto';

export class FilterVehiclesDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por marca (busca parcial)', example: 'Toyota' })
  @IsOptional()
  @IsString({ message: 'A marca deve ser um texto.' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Filtrar por placa (exato)', example: 'ABC-1234' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @IsString({ message: 'A placa deve ser um texto.' })
  @Matches(PLATE_REGEX, {
    message: 'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).',
  })
  plate?: string;
}

export class FindAllVehiclesQueryDto extends IntersectionType(PaginationDto, FilterVehiclesDto) {}
