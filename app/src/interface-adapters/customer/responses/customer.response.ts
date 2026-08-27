import { PersonType } from '@domain/enums/person-type.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface AddressResponse {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CustomerResponse {
  id: string;
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  address: AddressResponse | null;
}

export interface CustomerDataResponse {
  data: CustomerResponse;
}

export interface CustomerPaginatedResponse {
  data: CustomerResponse[];
  pagination: PaginationMeta;
}
