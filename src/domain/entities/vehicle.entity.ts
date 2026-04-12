export class Vehicle {
  id!: string;
  customerId!: string;
  plate!: string;
  brand!: string;
  model!: string;
  year!: number;
  color!: string | null;
  mileage!: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Vehicle>) {
    Object.assign(this, partial);
  }
}
