import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ChangeOwnCustomerPasswordDto } from '@application/ports/input/auth/dto/change-own-customer-password.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class ChangeOwnCustomerPasswordUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(customerId: string, input: ChangeOwnCustomerPasswordDto): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    const currentPasswordMatches = await this.hashService.compare(
      input.currentPassword,
      customer.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedAccessException('Senha atual incorreta');
    }

    Customer.validatePasswordStrength(input.newPassword);

    const newPasswordHash = await this.hashService.hash(input.newPassword);
    customer.changePassword(newPasswordHash);

    await this.customerRepository.update(customer);
  }
}
