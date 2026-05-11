import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterWorkOrdersDto {
  @ApiPropertyOptional({ description: 'Filtrar por número da OS', example: '000001' })
  @IsOptional()
  @IsString({ message: 'O número da OS deve ser um texto.' })
  number?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do veículo', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do veículo deve ser um UUID válido.' })
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do mecânico responsável', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do mecânico deve ser um UUID válido.' })
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status da OS', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus, {
    message: `status deve ser um dos seguintes: ${Object.values(WorkOrderStatus).join(', ')}`,
  })
  status?: WorkOrderStatus;
}

export class FindAllWorkOrdersPaginatedQueryDto extends IntersectionType(
  PaginationDto,
  FilterWorkOrdersDto,
) {}
