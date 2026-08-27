import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PersonType } from '@domain/enums/person-type.enum';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';

export class FilterCustomersDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome (busca parcial)', example: 'João' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({
    enum: PersonType,
    description: 'Filtrar por tipo: INDIVIDUAL ou COMPANY',
  })
  @IsOptional()
  @IsEnum(PersonType, { message: 'Tipo inválido. Use INDIVIDUAL ou COMPANY.' })
  type?: PersonType;

  @ApiPropertyOptional({ description: 'Filtrar por documento (exato)', example: '123.456.789-09' })
  @IsOptional()
  @IsString({ message: 'O documento deve ser um texto.' })
  document?: string;
}

export class FindAllCustomersQueryDto extends IntersectionType(PaginationDto, FilterCustomersDto) {}
