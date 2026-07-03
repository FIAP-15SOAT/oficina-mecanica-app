export interface UpdateWorkOrderRequest {
  assignedUserId?: string | null;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
}
