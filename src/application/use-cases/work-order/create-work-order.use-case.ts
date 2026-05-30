import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { Quote } from '@domain/entities/quote.entity';
import { Service } from '@domain/entities/service.entity';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  CreateWorkOrderDto,
  CreateWorkOrderItemServiceDto,
  CreateWorkOrderItemPartSupplyDto,
} from '@domain/interfaces/use-cases/work-order/dto/create-work-order.dto';
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

      const serviceInputs = dto.services ?? [];
      const partInputs = dto.partsSupplies ?? [];

      const hasAnyItems = serviceInputs.length > 0 || partInputs.length > 0;

      if (hasAnyItems) {
        const services = await this.getAndValidateServices(repos, serviceInputs);
        const partsSupplies = await this.getAndValidatePartsSupplies(repos, partInputs);

        const quote = Quote.create({
          workOrderId: saved.id,
          services: serviceInputs.map((input) => ({
            service: services.find((s) => s.id === input.serviceId)!,
            quantity: input.quantity,
          })),
          partsSupplies: partInputs.map((input) => ({
            partSupply: partsSupplies.find((p) => p.id === input.partSupplyId)!,
            quantity: input.quantity,
          })),
        });

        await repos.quote.createWithItems(quote);
      }

      saved.customer = customer;
      saved.vehicle = vehicle;
      saved.assignedUser = assignedUser;

      return saved;
    });
  }

  private async getAndValidateServices(
    repos: IRepositories,
    serviceInputs: CreateWorkOrderItemServiceDto[],
  ): Promise<Service[]> {
    if (serviceInputs.length === 0) return [];

    const serviceIds = serviceInputs.map((s) => s.serviceId);
    const services = await repos.service.findByIds(serviceIds);

    for (const id of serviceIds) {
      const service = services.find((s) => s.id === id);

      if (!service) {
        throw new ResourceNotFoundException('Serviço', id);
      }
    }

    return services;
  }

  private async getAndValidatePartsSupplies(
    repos: IRepositories,
    partInputs: CreateWorkOrderItemPartSupplyDto[],
  ): Promise<PartSupply[]> {
    if (partInputs.length === 0) return [];

    const partSupplyIds = partInputs.map((p) => p.partSupplyId);
    const partsSupplies = await repos.partSupply.findByIds(partSupplyIds);

    for (const id of partSupplyIds) {
      const partSupply = partsSupplies.find((p) => p.id === id);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça/Insumo', id);
      }
    }

    return partsSupplies;
  }
}
