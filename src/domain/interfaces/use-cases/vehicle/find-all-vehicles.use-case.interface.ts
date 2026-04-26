import { FindAllVehiclesInputDto, FindAllVehiclesOutputDto } from './dto/find-all-vehicles.dto';

export interface IFindAllVehiclesUseCase {
  execute(input: FindAllVehiclesInputDto): Promise<FindAllVehiclesOutputDto>;
}
