export class StatusHistory {
  id!: string;
  workOrderId!: string;
  changedById!: string | null;
  previousStatus!: string | null;
  newStatus!: string;
  notes!: string | null;
  createdAt!: Date;

  constructor(partial: Partial<StatusHistory>) {
    Object.assign(this, partial);
  }
}
