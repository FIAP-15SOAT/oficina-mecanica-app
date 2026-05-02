import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';

export class WorkOrderCustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CustomerType })
  type!: CustomerType;

  @ApiProperty()
  document!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;
}

export class WorkOrderVehicleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  plate!: string;

  @ApiProperty()
  brand!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;

  @ApiPropertyOptional({ nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mileage!: number | null;
}

export class WorkOrderAssignedUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class WorkOrderServiceItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  totalPrice!: number;

  @ApiProperty({ enum: WorkOrderServiceStatus })
  status!: WorkOrderServiceStatus;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkOrderPartSupplyItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  partSupplyId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional({ nullable: true })
  partNumber!: string | null;

  @ApiProperty({ enum: PartSupplyCategory })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit })
  unit!: Unit;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  totalPrice!: number;
}

export class WorkOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '000001' })
  number!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedUserId!: string | null;

  @ApiProperty({ type: WorkOrderCustomerResponseDto })
  customer!: WorkOrderCustomerResponseDto;

  @ApiProperty({ type: WorkOrderVehicleResponseDto })
  vehicle!: WorkOrderVehicleResponseDto;

  @ApiPropertyOptional({ type: WorkOrderAssignedUserResponseDto, nullable: true })
  assignedUser!: WorkOrderAssignedUserResponseDto | null;

  @ApiProperty({ enum: WorkOrderStatus })
  status!: WorkOrderStatus;

  @ApiPropertyOptional({ nullable: true })
  problemDescription!: string | null;

  @ApiPropertyOptional({ nullable: true })
  internalNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mileageAtService!: number | null;

  @ApiProperty()
  totalAmount!: number;

  @ApiPropertyOptional({ nullable: true })
  approvedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  deliveredAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [WorkOrderServiceItemResponseDto] })
  services?: WorkOrderServiceItemResponseDto[];

  @ApiPropertyOptional({ type: [WorkOrderPartSupplyItemResponseDto] })
  partSupplies?: WorkOrderPartSupplyItemResponseDto[];
}

export class WorkOrderDataResponseDto {
  @ApiProperty({ type: WorkOrderResponseDto })
  data!: WorkOrderResponseDto;
}

import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';

export class WorkOrderPaginatedResponseDto extends PaginatedResponseDto<WorkOrderResponseDto> {
  @ApiProperty({ type: [WorkOrderResponseDto] })
  data!: WorkOrderResponseDto[];
}
