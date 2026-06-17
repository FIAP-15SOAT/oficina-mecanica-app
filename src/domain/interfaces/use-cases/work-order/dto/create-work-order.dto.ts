export interface CreateWorkOrderItemServiceDto {
  serviceId: string;
  quantity: number;
}

export interface CreateWorkOrderItemPartSupplyDto {
  partSupplyId: string;
  quantity: number;
}

export interface CreateWorkOrderDto {
  customerId: string;
  vehicleId: string;
  assignedUserId?: string | null;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  userId: string;
  services?: CreateWorkOrderItemServiceDto[];
  partsSupplies?: CreateWorkOrderItemPartSupplyDto[];
}
