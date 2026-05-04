import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  IEmailSenderService,
  SendEmailInput,
} from '@domain/interfaces/services/email-sender.service.interface';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-intergration.exception';

@Injectable()
export class MailerEmailSenderService implements IEmailSenderService {
  private readonly logger = new Logger(MailerEmailSenderService.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(input: SendEmailInput): Promise<void> {
    const { toEmail, toName, subject, message } = input;

    try {
      await this.mailerService.sendMail({
        to: `${toName} <${toEmail}>`,
        subject: subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${toEmail}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      throw new ServiceIntegrationException(`Não foi possível enviar o e-mail para ${toEmail}`);
    }
  }
}
