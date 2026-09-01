import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import {
  GrantCustomerAccessUseCase,
  GrantResult,
} from '@application/use-cases/customer-access/grant-customer-access.use-case';

import { CreateCustomerDto } from '@application/ports/input/customer/dto/create-customer.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly grantCustomerAccessUseCase: GrantCustomerAccessUseCase,
  ) {}

  async execute(input: CreateCustomerDto, actingUserId: string): Promise<Customer> {
    const document = Document.create(input.document, input.type);
    const email = Email.create(input.email);

    if (input.createAccess === true && input.type === CustomerType.COMPANY) {
      throw new BusinessRuleViolationException(
        'createAccess não pode ser true para clientes do tipo COMPANY',
      );
    }

    const shouldCreateAccess = input.createAccess ?? input.type === CustomerType.INDIVIDUAL;

    const { created, grantResult } = await this.unitOfWork.executeTransaction(async (repos) => {
      const existingByDocument = await repos.customer.findByDocument(document.value);

      if (existingByDocument) {
        throw new ResourceConflictException(`Documento '${document.value}' já está cadastrado.`);
      }

      const existingByEmail = await repos.customer.findByEmail(email.value);

      if (existingByEmail) {
        throw new ResourceConflictException(`E-mail '${email.value}' já está cadastrado.`);
      }

      const customer = Customer.create(input);
      const created = await repos.customer.create(customer);

      const grantResult: GrantResult | null = shouldCreateAccess
        ? await this.grantCustomerAccessUseCase.grantAccess(repos, created.id)
        : null;

      return { created, grantResult };
    });

    if (grantResult) {
      await this.grantCustomerAccessUseCase.finalize(grantResult, created.id, actingUserId);
    }

    return created;
  }
}
