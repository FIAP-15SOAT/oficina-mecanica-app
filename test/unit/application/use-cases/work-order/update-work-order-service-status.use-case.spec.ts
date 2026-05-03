import { UpdateWorkOrderServiceStatusUseCase } from '@application/use-cases/work-order/update-work-order-service-status.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BadRequestException } from '@application/exceptions/bad-request.exception';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockWorkOrderService } from '../../../../helpers/work-order-service-mock.factory';
import { createMockStockReservation } from '../../../../helpers/stock-reservation-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

describe('UpdateWorkOrderServiceStatusUseCase', () => {
  let useCase: UpdateWorkOrderServiceStatusUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new UpdateWorkOrderServiceStatusUseCase(mockUow);
  });

  describe('transition to IN_PROGRESS', () => {
    it('should start service and create stock movements when WO is not yet IN_PROGRESS', async () => {
      const workOrder = createMockWorkOrder({ status: WorkOrderStatus.APPROVED });
      const woService = createMockWorkOrderService({
        workOrderId: workOrder.id,
        status: WorkOrderServiceStatus.PENDING,
      });
      const reservation = createMockStockReservation({ workOrderId: workOrder.id });

      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.stockReservation.findByWorkOrderId as jest.Mock).mockResolvedValue([reservation]);
      (mockRepos.stockMovement.create as jest.Mock).mockResolvedValue({});
      (mockRepos.partSupply.decrementStock as jest.Mock).mockResolvedValue(undefined);
      (mockRepos.partSupply.decrementReservedStock as jest.Mock).mockResolvedValue(undefined);
      (mockRepos.stockReservation.deleteByWorkOrderId as jest.Mock).mockResolvedValue(undefined);
      (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});
      (mockRepos.workOrderService.update as jest.Mock).mockResolvedValue(woService);

      const result = await useCase.execute({
        workOrderId: workOrder.id,
        serviceId: woService.serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
        userId: '550e8400-e29b-41d4-a716-446655440099',
      });

      expect(mockRepos.workOrder.update).toHaveBeenCalled();
      expect(mockRepos.statusHistory.create).toHaveBeenCalled();
      expect(mockRepos.stockMovement.create).toHaveBeenCalledTimes(1);
      expect(mockRepos.stockReservation.deleteByWorkOrderId).toHaveBeenCalledWith(workOrder.id);
      expect(result).toBe(woService);
    });

    it('should not create stock movements if WO is already IN_PROGRESS', async () => {
      const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_PROGRESS });
      const woService = createMockWorkOrderService({
        workOrderId: workOrder.id,
        status: WorkOrderServiceStatus.PENDING,
      });

      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.workOrderService.update as jest.Mock).mockResolvedValue(woService);

      await useCase.execute({
        workOrderId: workOrder.id,
        serviceId: woService.serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });

      expect(mockRepos.stockReservation.findByWorkOrderId).not.toHaveBeenCalled();
      expect(mockRepos.workOrder.update).not.toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException when work order service not found', async () => {
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(createMockWorkOrder());
      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute({
          workOrderId: '550e8400-e29b-41d4-a716-446655440001',
          serviceId: '550e8400-e29b-41d4-a716-446655440002',
          status: WorkOrderServiceStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw ResourceNotFoundException when work order not found', async () => {
      const woService = createMockWorkOrderService();
      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute({
          workOrderId: woService.workOrderId,
          serviceId: woService.serviceId,
          status: WorkOrderServiceStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('transition to COMPLETED', () => {
    it('should complete service and update WO to COMPLETED when all services are done', async () => {
      const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_PROGRESS });
      const woService = createMockWorkOrderService({
        workOrderId: workOrder.id,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });

      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.workOrderService.update as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrderService.isAllCompletedByWorkOrderId as jest.Mock).mockResolvedValue(true);
      (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

      await useCase.execute({
        workOrderId: workOrder.id,
        serviceId: woService.serviceId,
        status: WorkOrderServiceStatus.COMPLETED,
      });

      expect(mockRepos.workOrderService.update).toHaveBeenCalled();
      expect(mockRepos.workOrder.update).toHaveBeenCalled();
      expect(mockRepos.statusHistory.create).toHaveBeenCalled();
    });

    it('should complete service but NOT update WO when other services remain', async () => {
      const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_PROGRESS });
      const woService = createMockWorkOrderService({
        workOrderId: workOrder.id,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });

      (mockRepos.workOrderService.findByWorkOrderAndService as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.workOrderService.update as jest.Mock).mockResolvedValue(woService);
      (mockRepos.workOrderService.isAllCompletedByWorkOrderId as jest.Mock).mockResolvedValue(false);

      await useCase.execute({
        workOrderId: workOrder.id,
        serviceId: woService.serviceId,
        status: WorkOrderServiceStatus.COMPLETED,
      });

      expect(mockRepos.workOrder.update).not.toHaveBeenCalled();
      expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
    });


  });
});
