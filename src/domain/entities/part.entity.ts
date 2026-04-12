export class Part {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  unitPrice!: number;
  stockQuantity!: number;
  minStock!: number;
  unit!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Part>) {
    Object.assign(this, partial);
  }
}
