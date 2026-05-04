import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

const PATCH_STATUS_ALLOWED = [
  WorkOrderStatus.IN_DIAGNOSIS,
  WorkOrderStatus.CANCELLED,
  WorkOrderStatus.DELIVERED,
] as const;

type PatchStatusAllowed = (typeof PATCH_STATUS_ALLOWED)[number];

export class UpdateWorkOrderStatusRequestDto {
  @ApiProperty({ description: 'Novo status da ordem de serviço', enum: PATCH_STATUS_ALLOWED, example: WorkOrderStatus.IN_DIAGNOSIS })
  @IsEnum(PATCH_STATUS_ALLOWED)
  status!: PatchStatusAllowed;

  @ApiPropertyOptional({ description: 'Observações sobre a alteração de status', example: 'Cancelado a pedido do cliente' })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
