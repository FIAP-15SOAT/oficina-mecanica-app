import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { UserRole } from '@domain/enums/user-role.enum';

export class StatusHistoryChangedByDto {
  @ApiProperty({ description: 'ID único do Usuário', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Nome do Usuário', example: 'Carlos Mecânico' })
  name: string;

  @ApiProperty({ description: 'E-mail do Usuário', example: 'carlos@oficina.com' })
  email: string;

  @ApiProperty({ enum: UserRole, description: 'Perfil de acesso', example: UserRole.MECHANIC })
  role: UserRole;
}

export class StatusHistoryResponseDto {
  @ApiProperty({ description: 'ID único do registro de histórico', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ type: StatusHistoryChangedByDto, description: 'Usuário que realizou a alteração de status', nullable: true })
  changedBy: StatusHistoryChangedByDto | null;

  @ApiPropertyOptional({ enum: WorkOrderStatus, description: 'Status anterior', example: WorkOrderStatus.RECEIVED, nullable: true })
  previousStatus: WorkOrderStatus | null;

  @ApiProperty({ enum: WorkOrderStatus, description: 'Novo status após a alteração', example: WorkOrderStatus.IN_DIAGNOSIS })
  newStatus: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Observações sobre a alteração de status', example: 'Aprovado pelo cliente via WhatsApp', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Data/hora da alteração', example: '2026-04-21T10:30:00.000Z', format: 'date-time' })
  createdAt: Date;
}

export class StatusHistoryListResponseDto {
  @ApiProperty({ type: [StatusHistoryResponseDto], description: 'Histórico de alterações de status da Ordem de Serviço' })
  data: StatusHistoryResponseDto[];
}
