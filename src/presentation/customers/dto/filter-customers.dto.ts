import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterCustomersDto {

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

export class FindAllCustomersQueryDto extends IntersectionType(
  PaginationDto,
  FilterCustomersDto,
) { }
