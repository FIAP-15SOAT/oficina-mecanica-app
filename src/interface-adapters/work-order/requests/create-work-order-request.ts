export interface CreateWorkOrderItemServiceRequest {
  serviceId: string;
  quantity: number;
}

export interface CreateWorkOrderItemPartSupplyRequest {
  partSupplyId: string;
  quantity: number;
}

export interface CreateWorkOrderRequest {
  customerId: string;
  vehicleId: string;
  assignedUserId?: string | null;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  services?: CreateWorkOrderItemServiceRequest[];
  partsSupplies?: CreateWorkOrderItemPartSupplyRequest[];
}
