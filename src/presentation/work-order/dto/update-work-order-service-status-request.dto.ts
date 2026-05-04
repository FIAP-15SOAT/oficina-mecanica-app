import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';

export class UpdateWorkOrderServiceStatusRequestDto {
  @ApiProperty({ description: 'Novo status do serviço na Ordem de Serviço', enum: [WorkOrderServiceStatus.IN_PROGRESS, WorkOrderServiceStatus.COMPLETED] })
  @IsEnum([WorkOrderServiceStatus.IN_PROGRESS, WorkOrderServiceStatus.COMPLETED])
  status!: WorkOrderServiceStatus.IN_PROGRESS | WorkOrderServiceStatus.COMPLETED;
}
