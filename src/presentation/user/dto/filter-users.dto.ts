import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@domain/enums/user-role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterUsersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por papel do usuário',
    enum: UserRole,
    example: UserRole.MECHANIC,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filtrar por nome do usuário',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class FindAllUsersQueryDto extends IntersectionType(PaginationDto, FilterUsersDto) {}
