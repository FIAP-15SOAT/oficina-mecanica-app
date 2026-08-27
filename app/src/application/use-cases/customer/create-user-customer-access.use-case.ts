import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserRole } from '@domain/enums/user-role.enum';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';

import { ICreateUserCustomerAccessUseCase } from '@application/ports/input/customer/create-user-customer-access.use-case.interface';
import { CreateUserCustomerAccessDto } from '@application/ports/input/customer/dto/create-user-customer-access.dto';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

export class CreateUserCustomerAccessUseCase implements ICreateUserCustomerAccessUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly accessRepository: IUserCustomerAccessRepository,
  ) {}

  async execute(input: CreateUserCustomerAccessDto): Promise<UserCustomerAccess> {
    const customer = await this.customerRepository.findById(input.customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', input.customerId);
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', input.userId);
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new DomainValidationException(
        'Só é possível vincular um cliente a um usuário com a role CUSTOMER.',
      );
    }

    if (
      input.relationship === AccessRelationship.SELF &&
      user.document.value !== customer.document.value
    ) {
      throw new DomainValidationException(
        'Para um vínculo SELF, o documento do usuário deve ser igual ao documento do cliente.',
      );
    }

    const access = UserCustomerAccess.create(input);

    return this.accessRepository.create(access);
  }
}
