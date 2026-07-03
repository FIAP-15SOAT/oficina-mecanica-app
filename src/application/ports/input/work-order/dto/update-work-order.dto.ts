export interface UpdateWorkOrderDto {
  assignedUserId?: string | null;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  userId: string;
}
