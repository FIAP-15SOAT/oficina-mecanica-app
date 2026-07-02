import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { MAX_STATUS_NOTES_LENGTH } from '@domain/constants/validation/work-order.constants';

const PATCH_STATUS_ALLOWED = [
  WorkOrderStatus.IN_DIAGNOSIS,
  WorkOrderStatus.CANCELLED,
  WorkOrderStatus.DELIVERED,
] as const;

type PatchStatusAllowed = (typeof PATCH_STATUS_ALLOWED)[number];

export class UpdateWorkOrderStatusRequestDto {
  @ApiProperty({
    description: 'Novo status da ordem de serviço',
    enum: PATCH_STATUS_ALLOWED,
    example: WorkOrderStatus.IN_DIAGNOSIS,
  })
  @IsEnum(PATCH_STATUS_ALLOWED, {
    message: `Status deve ser um dos seguintes: ${PATCH_STATUS_ALLOWED.join(', ')}`,
  })
  status!: PatchStatusAllowed;

  @ApiPropertyOptional({
    description: 'Observações sobre a alteração de status',
    example: 'Cancelado a pedido do cliente',
  })
  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto.' })
  @MaxLength(MAX_STATUS_NOTES_LENGTH, {
    message: `As observações devem ter no máximo ${MAX_STATUS_NOTES_LENGTH} caracteres.`,
  })
  notes?: string | null;
}
