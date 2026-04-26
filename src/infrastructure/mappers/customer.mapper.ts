import { Customer as PrismaCustomer, Address as PrismaAddress } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import { Address } from '@domain/entities/address.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';

type PrismaCustomerWithAddress = PrismaCustomer & {
  address?: PrismaAddress | null;
};

export class CustomerMapper {
  static toDomain(prismaRecord: PrismaCustomerWithAddress): Customer {
    return new Customer({
      id: prismaRecord.id,
      name: prismaRecord.name,
      document: prismaRecord.document,
      type: prismaRecord.type as CustomerType,
      email: prismaRecord.email,
      phone: prismaRecord.phone,
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

  static toPrismaCreate(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      type: customer.type,
      email: customer.email,
      phone: customer.phone,
      ...(customer.address && {
        address: {
          create: {
            id: customer.address.id,
            street: customer.address.street,
            city: customer.address.city,
            state: customer.address.state,
            zipCode: customer.address.zipCode,
          },
        },
      }),
    };
  }
}
