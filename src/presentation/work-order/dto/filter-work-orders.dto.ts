import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterWorkOrdersDto {
  @ApiPropertyOptional({ description: 'Filtrar por número da OS', example: '000001' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do veículo', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do mecânico responsável', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status da OS', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;
}

export class FindAllWorkOrdersPaginatedQueryDto extends IntersectionType(
  PaginationDto,
  FilterWorkOrdersDto,
) {}
