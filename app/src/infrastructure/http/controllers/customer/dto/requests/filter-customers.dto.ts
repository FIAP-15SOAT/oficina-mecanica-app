import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';

export class FilterCustomersDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome (busca parcial)', example: 'João' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({
    enum: CustomerType,
    example: CustomerType.INDIVIDUAL,
    description: 'Filtrar por tipo: INDIVIDUAL ou COMPANY',
  })
  @IsOptional()
  @IsEnum(CustomerType, { message: 'Tipo inválido. Use INDIVIDUAL ou COMPANY.' })
  type?: CustomerType;

  @ApiPropertyOptional({ description: 'Filtrar por documento (exato)', example: '123.456.789-09' })
  @IsOptional()
  @IsString({ message: 'O documento deve ser um texto.' })
  document?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por clientes ativos (true) ou inativos (false). Omitido, retorna ambos.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'O filtro de ativo deve ser true ou false.' })
  active?: boolean;
}

export class FindAllCustomersQueryDto extends IntersectionType(PaginationDto, FilterCustomersDto) {}
