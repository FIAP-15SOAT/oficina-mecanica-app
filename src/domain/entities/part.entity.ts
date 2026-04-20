import { Unit } from '../enums/unit.enum';

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
