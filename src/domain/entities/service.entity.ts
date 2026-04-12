export class Service {
  id!: string;
  name!: string;
  description!: string | null;
  basePrice!: number;
  estimatedTimeMin!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Service>) {
    Object.assign(this, partial);
  }
}
