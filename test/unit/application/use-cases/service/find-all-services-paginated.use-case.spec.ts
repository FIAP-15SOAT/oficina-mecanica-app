import { randomUUID } from 'crypto';
import { FindAllServicesPaginatedUseCase } from '../../../../../src/application/use-cases/service/find-all-services-paginated.use-case';
import { IServiceRepository } from '../../../../../src/domain/interfaces';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('FindAllServicesPaginatedUseCase', () => {
  let useCase: FindAllServicesPaginatedUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new FindAllServicesPaginatedUseCase(serviceRepository);
  });

  it('should return paginated services with correct metadata', async () => {
    const services = [
      createMockService(),
      createMockService({ id: randomUUID(), name: 'Tire Rotation' }),
    ];

    serviceRepository.findAllPaginated.mockResolvedValue({ services, total: services.length });

    const result = await useCase.execute(1, 10);

    expect(result.services).toHaveLength(2);
    expect(result.totalRecords).toBe(services.length);
    expect(result.totalPages).toBe(1);
  });

  it('should calculate total pages correctly when records span multiple pages', async () => {
    const services = Array.from({ length: 10 }, (_, i) =>
      createMockService({ id: randomUUID(), name: `Service ${i}` }),
    );

    serviceRepository.findAllPaginated.mockResolvedValue({ services, total: 25 });

    const result = await useCase.execute(1, 10);

    expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
    expect(result.totalRecords).toBe(25);
  });

  it('should return zero pages when there are no records', async () => {
    serviceRepository.findAllPaginated.mockResolvedValue({ services: [], total: 0 });

    const result = await useCase.execute(1, 10);

    expect(result.services).toHaveLength(0);
    expect(result.totalRecords).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should pass activeOnly=true to the repository by default', async () => {
    serviceRepository.findAllPaginated.mockResolvedValue({ services: [], total: 0 });

    await useCase.execute(1, 10);

    expect(serviceRepository.findAllPaginated).toHaveBeenCalledWith(1, 10, true);
  });
});
