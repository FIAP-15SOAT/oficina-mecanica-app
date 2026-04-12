import { QuoteStatus } from '../enums';

export class Quote {
  id!: string;
  workOrderId!: string;
  servicesAmount!: number;
  partsAmount!: number;
  totalAmount!: number;
  status!: QuoteStatus;
  notes!: string | null;
  sentAt!: Date | null;
  approvedAt!: Date | null;
  rejectedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Quote>) {
    Object.assign(this, partial);
  }
}
