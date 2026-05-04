import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@presentation/common/dto/pagination.dto';

export class FilterStockReservationsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partSupplyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;
}

export class FindStockReservationsQueryDto extends IntersectionType(
  PaginationDto,
  FilterStockReservationsDto,
) {}
