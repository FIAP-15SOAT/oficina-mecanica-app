import { Customer as PrismaCustomer, Address as PrismaAddress } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import { Address } from '@domain/value-objects/address.vo';
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
    return Customer.reconstitute({
      id: prismaRecord.id,
      name: prismaRecord.name,
      document: Document.create(prismaRecord.document, type),
      type,
      email: Email.create(prismaRecord.email),
      phone: Phone.create(prismaRecord.phone),
      passwordHash: prismaRecord.passwordHash,
      address: prismaRecord.address
        ? Address.create({
            street: prismaRecord.address.street,
            city: prismaRecord.address.city,
            state: prismaRecord.address.state,
            zipCode: prismaRecord.address.zipCode,
          })
        : null,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }
}
