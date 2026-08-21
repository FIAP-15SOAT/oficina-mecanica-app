import { generateSecurePassword } from '@domain/validators/password-generator';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ResetUserPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    const plainPassword = generateSecurePassword();
    const newPasswordHash = await this.hashService.hash(plainPassword);
    user.changePassword(newPasswordHash);

    await this.userRepository.update(user);

    await this.emailSenderService.send({
      toEmail: user.email.value,
      toName: user.name,
      subject: 'Sua senha foi alterada',
      message: {
        text: `Olá, ${user.name}! Sua senha foi alterada por um administrador. Nova senha: "${plainPassword}".`,
        html: `<p>Olá, ${user.name}!</p><p>Sua senha foi alterada por um administrador. Nova senha: <strong>${plainPassword}</strong>.</p>`,
      },
    });
  }
}
