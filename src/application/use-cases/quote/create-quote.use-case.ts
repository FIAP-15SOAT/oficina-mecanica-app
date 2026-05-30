import { Quote } from '@domain/entities/quote.entity';
import { Service } from '@domain/entities/service.entity';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  CreateQuoteDto,
  CreateQuoteItemServiceDto,
  CreateQuoteItemPartSupplyDto,
} from '@domain/interfaces/use-cases/quote/dto/create-quote.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class CreateQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: CreateQuoteDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const workOrder = await repos.workOrder.findById(dto.workOrderId);

      if (!workOrder) {
        throw new ResourceNotFoundException('Ordem de Serviço', dto.workOrderId);
      }

      workOrder.ensureCanCreateQuote();

      const serviceInputs = dto.services ?? [];
      const partInputs = dto.partsSupplies ?? [];

      const services = await this.getAndValidateServices(repos, serviceInputs);
      const partsSupplies = await this.getAndValidatePartsSupplies(repos, partInputs);

      const quote = Quote.create({
        workOrderId: dto.workOrderId,
        notes: dto.notes,
        services: serviceInputs.map((input) => ({
          service: services.find((s) => s.id === input.serviceId)!,
          quantity: input.quantity,
        })),
        partsSupplies: partInputs.map((input) => ({
          partSupply: partsSupplies.find((p) => p.id === input.partSupplyId)!,
          quantity: input.quantity,
        })),
      });

      return await this.createQuote(repos, quote);
    });
  }

  private async getAndValidateServices(
    repos: IRepositories,
    serviceInputs: CreateQuoteItemServiceDto[],
  ): Promise<Service[]> {
    if (serviceInputs.length === 0) return [];

    const serviceIds = serviceInputs.map((s) => s.serviceId);
    const services = await repos.service.findByIds(serviceIds);

    for (const id of serviceIds) {
      const service = services.find((s) => s.id === id);

      if (!service) {
        throw new ResourceNotFoundException('Serviço', id);
      }
    }

    return services;
  }

  private async getAndValidatePartsSupplies(
    repos: IRepositories,
    partInputs: CreateQuoteItemPartSupplyDto[],
  ): Promise<PartSupply[]> {
    if (partInputs.length === 0) return [];

    const partSupplyIds = partInputs.map((p) => p.partSupplyId);
    const partsSupplies = await repos.partSupply.findByIds(partSupplyIds);

    for (const id of partSupplyIds) {
      const partSupply = partsSupplies.find((p) => p.id === id);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça/Insumo', id);
      }
    }

    return partsSupplies;
  }

  private async createQuote(repos: IRepositories, quote: Quote): Promise<Quote> {
    const hasItems = quote.services.length > 0 || quote.partsSupplies.length > 0;

    if (hasItems) {
      return repos.quote.createWithItems(quote);
    }

    return repos.quote.create(quote);
  }
}
