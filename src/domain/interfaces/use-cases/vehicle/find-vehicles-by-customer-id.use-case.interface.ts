import { FindAllVehiclesOutputDto } from './dto/find-all-vehicles.dto';

export interface IFindVehiclesByCustomerIdUseCase {
  execute(customerId: string, input: { page: number; limit: number }): Promise<FindAllVehiclesOutputDto>;
}
