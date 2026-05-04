import { User } from '@domain/entities/user.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { UpdateWorkOrderDto } from '@domain/interfaces/use-cases/work-order/dto/update-work-order.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export class UpdateWorkOrderUseCase {
  constructor(
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, dto: UpdateWorkOrderDto): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findById(id);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de serviço', id);
    }

    let assignedUser: User | null | undefined = undefined;

    if (dto.assignedUserId) {
      assignedUser = await this.userRepository.findById(dto.assignedUserId);

      if (!assignedUser) {
        throw new ResourceNotFoundException('Usuário', dto.assignedUserId);
      }
    }

    const { assignedUserId: _, ...updateData } = dto;

    workOrder.update({ ...updateData, assignedUser });

    return this.workOrderRepository.update(workOrder);
  }
}
