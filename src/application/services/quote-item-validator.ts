import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  Quote,
  CreateQuoteItemServiceProps,
  CreateQuoteItemPartSupplyProps,
} from '@domain/entities/quote.entity';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

interface ServiceInput {
  serviceId: string;
  quantity: number;
}

interface PartSupplyInput {
  partSupplyId: string;
  quantity: number;
}

export class QuoteItemValidator {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly partSupplyRepository: IPartSupplyRepository,
  ) {}

  async validateAndResolve(
    serviceInputs: ServiceInput[],
    partSupplyInputs: PartSupplyInput[],
  ): Promise<{
    services: CreateQuoteItemServiceProps[];
    partsSupplies: CreateQuoteItemPartSupplyProps[];
  }> {
    Quote.validateItems(
      serviceInputs.map((input) => input.serviceId),
      partSupplyInputs.map((input) => input.partSupplyId),
    );

    return {
      services: await this.resolveServiceItems(serviceInputs),
      partsSupplies: await this.resolvePartSupplyItems(partSupplyInputs),
    };
  }

  async resolveServiceItems(inputs: ServiceInput[]): Promise<CreateQuoteItemServiceProps[]> {
    const serviceIds = inputs.map((input) => input.serviceId);

    const services = await this.resolveExisting(
      serviceIds,
      (ids) => this.serviceRepository.findByIds(ids),
      'Serviço',
    );

    return inputs.map((input, index) => ({
      service: services[index],
      quantity: input.quantity,
    }));
  }

  async resolvePartSupplyItems(
    inputs: PartSupplyInput[],
  ): Promise<CreateQuoteItemPartSupplyProps[]> {
    const partSupplyIds = inputs.map((input) => input.partSupplyId);

    const partsSupplies = await this.resolveExisting(
      partSupplyIds,
      (ids) => this.partSupplyRepository.findByIds(ids),
      'Peça/Insumo',
    );

    return inputs.map((input, index) => ({
      partSupply: partsSupplies[index],
      quantity: input.quantity,
    }));
  }

  private async resolveExisting<T extends { id: string }>(
    ids: string[],
    findByIds: (ids: string[]) => Promise<T[]>,
    resourceName: string,
  ): Promise<T[]> {
    if (ids.length === 0) return [];

    const found = await findByIds(ids);
    const byId = new Map(found.map((entity): [string, T] => [entity.id, entity]));

    return ids.map((id) => {
      const entity = byId.get(id);

      if (!entity) {
        throw new ResourceNotFoundException(resourceName, id);
      }

      return entity;
    });
  }
}
