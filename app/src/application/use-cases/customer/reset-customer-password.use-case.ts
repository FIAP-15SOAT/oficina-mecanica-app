import { generateSecurePassword } from '@domain/validators/password-generator';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ResetCustomerPasswordUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

  async execute(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    const plainPassword = generateSecurePassword();
    const newPasswordHash = await this.hashService.hash(plainPassword);
    customer.changePassword(newPasswordHash);

    await this.customerRepository.update(customer);

    await this.emailSenderService.send({
      toEmail: customer.email.value,
      toName: customer.name,
      subject: 'Sua senha foi alterada',
      message: {
        text: `Olá, ${customer.name}! Sua senha foi alterada por um atendente. Nova senha: "${plainPassword}".`,
        html: `<p>Olá, ${customer.name}!</p><p>Sua senha foi alterada por um atendente. Nova senha: <strong>${plainPassword}</strong>.</p>`,
      },
    });
  }
}
