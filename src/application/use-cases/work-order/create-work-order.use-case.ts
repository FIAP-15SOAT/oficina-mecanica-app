import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { Quote } from '@domain/entities/quote.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { QuoteItemValidator } from '@application/services/quote-item-validator';
import { CreateWorkOrderDto } from '@application/ports/input/work-order/dto/create-work-order.dto';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

export class CreateWorkOrderUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: CreateWorkOrderDto): Promise<WorkOrder> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const customer = await repos.customer.findById(dto.customerId);

      if (!customer) {
        throw new ResourceNotFoundException('Cliente', dto.customerId);
      }

      const vehicle = await repos.vehicle.findById(dto.vehicleId);

      if (!vehicle) {
        throw new ResourceNotFoundException('Veículo', dto.vehicleId);
      }

      if (vehicle.customerId !== dto.customerId) {
        throw new BusinessRuleViolationException(
          'O veículo informado não pertence ao cliente informado.',
        );
      }

      let assignedUser = null;
      if (dto.assignedUserId) {
        assignedUser = await repos.user.findById(dto.assignedUserId);

        if (!assignedUser) {
          throw new ResourceNotFoundException('Usuário', dto.assignedUserId);
        }
      }

      const serviceInputs = dto.services ?? [];
      const partInputs = dto.partsSupplies ?? [];

      const itemValidator = new QuoteItemValidator(repos.service, repos.partSupply);
      const { services, partsSupplies } = await itemValidator.validateAndResolve(
        serviceInputs,
        partInputs,
      );

      const number = await repos.workOrder.generateNextNumber();

      const workOrder = WorkOrder.create({
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        assignedUser: assignedUser,
        problemDescription: dto.problemDescription,
        internalNotes: dto.internalNotes,
        mileageAtService: dto.mileageAtService,
        number,
      });

      const saved = await repos.workOrder.create(workOrder);

      await repos.statusHistory.create(
        StatusHistory.create({
          workOrderId: saved.id,
          changedById: dto.userId,
          newStatus: WorkOrderStatus.RECEIVED,
          previousStatus: null,
          notes: 'Ordem de serviço criada',
        }),
      );

      const hasAnyItems = serviceInputs.length > 0 || partInputs.length > 0;

      if (hasAnyItems) {
        const quote = Quote.create({
          workOrderId: saved.id,
          services,
          partsSupplies,
        });

        await repos.quote.create(quote);
      }

      saved.customer = customer;
      saved.vehicle = vehicle;
      saved.assignedUser = assignedUser;

      return saved;
    });
  }
}
