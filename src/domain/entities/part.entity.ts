import { Unit } from '../enums';

export class Part {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  unitPrice!: number;
  stockQuantity!: number;
  minStock!: number;
  unit!: Unit;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Part>) {
    Object.assign(this, partial);
  }
}
