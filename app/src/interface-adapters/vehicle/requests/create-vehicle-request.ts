export interface CreateVehicleRequest {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
}
