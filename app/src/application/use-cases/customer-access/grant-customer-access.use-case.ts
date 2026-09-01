import { User } from '@domain/entities/user.entity';
import { UserCustomer } from '@domain/entities/user-customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { PasswordGenerator } from '@domain/services/password-generator';

import {
  GrantCustomerAccessDto,
  GrantCustomerAccessOutputDto,
} from '@application/ports/input/customer-access/dto/grant-customer-access.dto';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';

interface PersonData {
  name: string;
  email: string;
  cpf: string;
}

interface PendingPassword {
  toEmail: string;
  toName: string;
  password: string;
}

export interface GrantResult {
  userId: string;
  pendingPassword: PendingPassword | null;
}

export class GrantCustomerAccessUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly hashService: IHashService,
    private readonly emailSender: IEmailSenderService,
    private readonly logger: ILogger,
  ) {}

  async execute(
    customerId: string,
    actingUserId: string,
    input?: GrantCustomerAccessDto,
  ): Promise<GrantCustomerAccessOutputDto> {
    const result = await this.unitOfWork.executeTransaction((repos) =>
      this.grantAccess(repos, customerId, input),
    );

    return this.finalize(result, customerId, actingUserId);
  }

  /**
   * Runs the DB-write portion within a caller-supplied transaction (e.g. `CreateCustomerUseCase`
   * granting access in the same transaction as the `Customer` insert). Callers own `finalize()`.
   */
  async grantAccess(
    repos: IRepositories,
    customerId: string,
    input?: GrantCustomerAccessDto,
  ): Promise<GrantResult> {
    const customer = await repos.customer.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    if (!customer.isActive) {
      throw new BusinessRuleViolationException('Cliente inativo não pode receber novos acessos');
    }

    const person = this.resolvePersonData(
      customer.type,
      customer.name,
      customer.email.value,
      customer.document.value,
      input,
    );

    const [userByCpf, userByEmail] = await Promise.all([
      repos.user.findByCpf(person.cpf),
      repos.user.findByEmail(person.email),
    ]);

    if (userByCpf || userByEmail) {
      throw new ResourceConflictException('CPF ou e-mail já cadastrado no sistema');
    }

    const generatedPassword = PasswordGenerator.generate();
    const passwordHash = await this.hashService.hash(generatedPassword);

    const newUser = User.create({
      name: person.name,
      email: person.email,
      passwordHash,
      role: null,
      cpf: person.cpf,
    });

    const user = await repos.user.create(newUser);

    await repos.userCustomer.create(UserCustomer.create({ userId: user.id, customerId }));

    return {
      userId: user.id,
      pendingPassword: {
        toEmail: user.email.value,
        toName: user.name,
        password: generatedPassword,
      },
    };
  }

  /** Sends the initial-password e-mail and logs the business event after the transaction commits. */
  async finalize(
    result: GrantResult,
    customerId: string,
    actingUserId: string,
  ): Promise<GrantCustomerAccessOutputDto> {
    const initialPasswordSent = result.pendingPassword
      ? await this.sendInitialPasswordEmail(result.pendingPassword)
      : false;

    this.logger.event(BUSINESS_EVENTS.CUSTOMER_ACCESS_GRANTED, {
      subjectId: actingUserId,
      targetUserId: result.userId,
      customerId,
      accessUserCreated: true,
      initialPasswordSent,
    });

    return { userId: result.userId, customerId, initialPasswordSent };
  }

  private resolvePersonData(
    type: CustomerType,
    customerName: string,
    customerEmail: string,
    customerDocument: string,
    input?: GrantCustomerAccessDto,
  ): PersonData {
    if (type === CustomerType.INDIVIDUAL) {
      return { name: customerName, email: customerEmail, cpf: customerDocument };
    }

    if (!input?.name || !input?.email || !input?.cpf) {
      throw new BusinessRuleViolationException(
        'Nome, e-mail e CPF são obrigatórios para conceder acesso a um cliente do tipo COMPANY',
      );
    }

    return { name: input.name, email: input.email, cpf: input.cpf.replaceAll(/\D/g, '') };
  }

  private async sendInitialPasswordEmail(pending: {
    toEmail: string;
    toName: string;
    password: string;
  }): Promise<boolean> {
    try {
      await this.emailSender.send({
        toEmail: pending.toEmail,
        toName: pending.toName,
        subject: 'Seu acesso à Oficina Mecânica foi criado',
        message: {
          text:
            `Olá ${pending.toName},\n\n` +
            `Uma conta foi criada para você acessar a Oficina Mecânica.\n` +
            `Senha inicial: ${pending.password}\n\n` +
            `Recomendamos trocar a senha após o primeiro acesso.\n\n` +
            `Atenciosamente,\nEquipe da Oficina Mecânica`,
          html:
            `<p>Olá <strong>${pending.toName}</strong>,</p>` +
            `<p>Uma conta foi criada para você acessar a Oficina Mecânica.</p>` +
            `<p><strong>Senha inicial:</strong> ${pending.password}</p>` +
            `<p>Recomendamos trocar a senha após o primeiro acesso.</p>` +
            `<p>Atenciosamente,<br/>Equipe da Oficina Mecânica</p>`,
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Falha ao enviar e-mail de senha inicial', error);
      return false;
    }
  }
}
