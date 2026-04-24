import { Customer as PrismaCustomer } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';

export class CustomerMapper {
  static toDomain(prismaRecord: PrismaCustomer): Customer {
    return new Customer({
      id: prismaRecord.id,
      name: prismaRecord.name,
      document: prismaRecord.document,
      type: prismaRecord.type as CustomerType,
      email: prismaRecord.email,
      phone: prismaRecord.phone,
      addresses: [], // address management not implemented in this delivery
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }

  static toPrismaCreate(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      type: customer.type,
      email: customer.email,
      phone: customer.phone,
    };
  }
}
