export interface CreateWorkOrderDto {
  customerId: string;
  vehicleId: string;
  assignedUserId?: string | null;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
}
