import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { MailerEmailSenderService } from '@infrastructure/services/mailer-email-sender.service';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-intergration.exception';
import { Logger } from '@nestjs/common';

describe('MailerEmailSenderService', () => {
  let service: MailerEmailSenderService;
  let mailerService: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const mockMailerService = {
      sendMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerEmailSenderService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<MailerEmailSenderService>(MailerEmailSenderService);
    mailerService = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    const input = {
      toEmail: 'test@example.com',
      toName: 'Test User',
      subject: 'Test Subject',
      message: {
        text: 'Test message',
        html: '<p>Test message</p>',
      },
    };

    it('should call mailerService.sendMail with correct parameters', async () => {
      mailerService.sendMail.mockResolvedValueOnce({});

      await service.send(input);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: `${input.toName} <${input.toEmail}>`,
        subject: input.subject,
        text: input.message.text,
        html: input.message.html,
      });
    });

    it('should throw ServiceIntegrationException when mailerService.sendMail fails', async () => {
      const error = new Error('SMTP Error');
      mailerService.sendMail.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(service.send(input)).rejects.toThrow(ServiceIntegrationException);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Falha ao enviar e-mail para ${input.toEmail}: ${error.message}`),
        error.stack,
      );

      loggerSpy.mockRestore();
    });
  });
});
