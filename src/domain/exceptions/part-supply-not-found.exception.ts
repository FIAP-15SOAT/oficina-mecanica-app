import { EntityNotFoundException } from './entity-not-found.exception';

/**
 * Exceção lançada quando uma Peça ou Insumo não é encontrado no Estoque.
 * Estende EntityNotFoundException para que o DomainExceptionFilter retorne HTTP 404.
 */
export class PartSupplyNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Peça ou Insumo', id);
  }
}
