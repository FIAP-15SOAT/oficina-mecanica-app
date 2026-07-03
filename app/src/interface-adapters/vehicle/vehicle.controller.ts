import { ICreateVehicleUseCase } from '@application/ports/input/vehicle/create-vehicle.use-case.interface';
import { IFindAllVehiclesUseCase } from '@application/ports/input/vehicle/find-all-vehicles.use-case.interface';
import { IFindVehicleByIdUseCase } from '@application/ports/input/vehicle/find-vehicle-by-id.use-case.interface';
import { IUpdateVehicleUseCase } from '@application/ports/input/vehicle/update-vehicle.use-case.interface';
import { IDeleteVehicleUseCase } from '@application/ports/input/vehicle/delete-vehicle.use-case.interface';
import { IFindVehiclesByCustomerIdUseCase } from '@application/ports/input/vehicle/find-vehicles-by-customer-id.use-case.interface';

import { CreateVehicleRequest } from './requests/create-vehicle-request';
import { UpdateVehicleRequest } from './requests/update-vehicle-request';
import { FindAllVehiclesQuery } from './requests/find-all-vehicles-query';

import { VehiclePresenter } from './vehicle.presenter';
import {
  VehicleDataResponse,
  VehicleListResponse,
  VehiclePaginatedResponse,
} from './responses/vehicle.response';

export class VehicleController {
  constructor(
    private readonly createVehicleUseCase: ICreateVehicleUseCase,
    private readonly findAllVehiclesUseCase: IFindAllVehiclesUseCase,
    private readonly findVehicleByIdUseCase: IFindVehicleByIdUseCase,
    private readonly updateVehicleUseCase: IUpdateVehicleUseCase,
    private readonly deleteVehicleUseCase: IDeleteVehicleUseCase,
    private readonly findVehiclesByCustomerIdUseCase: IFindVehiclesByCustomerIdUseCase,
  ) {}

  async create(input: CreateVehicleRequest): Promise<VehicleDataResponse> {
    const vehicle = await this.createVehicleUseCase.execute(input);
    return VehiclePresenter.toDataResponse(vehicle);
  }

  async findAll(query: FindAllVehiclesQuery): Promise<VehiclePaginatedResponse> {
    const result = await this.findAllVehiclesUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return VehiclePresenter.toPaginatedDataResponse(result);
  }

  async findById(id: string): Promise<VehicleDataResponse> {
    const vehicle = await this.findVehicleByIdUseCase.execute(id);
    return VehiclePresenter.toDataResponse(vehicle);
  }

  async update(id: string, input: UpdateVehicleRequest): Promise<VehicleDataResponse> {
    const vehicle = await this.updateVehicleUseCase.execute(id, input);
    return VehiclePresenter.toDataResponse(vehicle);
  }

  async remove(id: string): Promise<void> {
    await this.deleteVehicleUseCase.execute(id);
  }

  async findByCustomerId(customerId: string): Promise<VehicleListResponse> {
    const vehicles = await this.findVehiclesByCustomerIdUseCase.execute(customerId);
    return VehiclePresenter.toListResponse(vehicles);
  }
}
