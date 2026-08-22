import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { generateSecurePassword } from '@domain/validators/password-generator';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { CreateCustomerDto } from '@application/ports/input/customer/dto/create-customer.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

  async execute(input: CreateCustomerDto): Promise<Customer> {
    const document = Document.create(input.document, input.type);
    const email = Email.create(input.email);

    const existingByDocument = await this.customerRepository.findByDocument(document.value);

    if (existingByDocument) {
      throw new ResourceConflictException(`Documento '${document.value}' já está cadastrado.`);
    }

    const existingByEmail = await this.customerRepository.findByEmail(email.value);

    if (existingByEmail) {
      throw new ResourceConflictException(`E-mail '${email.value}' já está cadastrado.`);
    }

    const plainPassword = generateSecurePassword();
    const passwordHash = await this.hashService.hash(plainPassword);

    const customer = Customer.create({ ...input, passwordHash });

    const created = await this.customerRepository.create(customer);

    try {
      await this.emailSenderService.send({
        toEmail: created.email.value,
        toName: created.name,
        subject: 'Sua conta foi criada — dados de acesso',
        message: {
          text: `Olá, ${created.name}! Sua conta foi criada. Use o e-mail ou documento cadastrado e a senha "${plainPassword}" para acessar o sistema.`,
          html: `<p>Olá, ${created.name}!</p><p>Sua conta foi criada. Use o e-mail ou documento cadastrado e a senha <strong>${plainPassword}</strong> para acessar o sistema.</p>`,
        },
      });
    } catch (error) {
      // A criação do cliente já foi persistida com sucesso; uma falha no envio do
      // e-mail não deve invalidar o cadastro (a conta é recuperável via reset de senha).
      // eslint-disable-next-line no-console
      console.error('Falha ao enviar e-mail de senha inicial ao cliente', created.id, error);
    }

    return created;
  }
}
