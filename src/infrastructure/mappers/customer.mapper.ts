import { Customer as PrismaCustomer, Address as PrismaAddress } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import { Address } from '@domain/entities/address.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

type PrismaCustomerWithAddress = PrismaCustomer & {
  address?: PrismaAddress | null;
};

export class CustomerMapper {
  static toDomain(prismaRecord: PrismaCustomerWithAddress): Customer {
    const type = prismaRecord.type as CustomerType;
    return new Customer({
      id: prismaRecord.id,
      name: prismaRecord.name,
      document: Document.create(prismaRecord.document, type),
      type,
      email: Email.create(prismaRecord.email),
      phone: Phone.create(prismaRecord.phone),
      address: prismaRecord.address
        ? new Address({
            id: prismaRecord.address.id,
            customerId: prismaRecord.address.customerId,
            street: prismaRecord.address.street,
            city: prismaRecord.address.city,
            state: prismaRecord.address.state,
            zipCode: prismaRecord.address.zipCode,
            createdAt: prismaRecord.address.createdAt,
            updatedAt: prismaRecord.address.updatedAt,
          })
        : null,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }
}
