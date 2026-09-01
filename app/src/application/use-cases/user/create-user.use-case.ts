import { User } from '@domain/entities/user.entity';
import { PasswordGenerator } from '@domain/services/password-generator';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  CreateUserDto,
  CreateUserOutputDto,
} from '@application/ports/input/user/dto/create-user.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly emailSender: IEmailSenderService,
  ) {}

  async execute(createUserDto: CreateUserDto): Promise<CreateUserOutputDto> {
    const existing = await this.userRepository.findByEmail(
      createUserDto.email.trim().toLowerCase(),
    );

    if (existing) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const generatedPassword = PasswordGenerator.generate();
    const passwordHash = await this.hashService.hash(generatedPassword);

    const user = User.create({
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
      cpf: createUserDto.cpf,
    });

    const created = await this.userRepository.create(user);

    await this.sendInitialPasswordEmail(created.email.value, created.name, generatedPassword);

    return created.toPublicView();
  }

  private async sendInitialPasswordEmail(
    toEmail: string,
    toName: string,
    password: string,
  ): Promise<void> {
    try {
      await this.emailSender.send({
        toEmail,
        toName,
        subject: 'Sua conta na Oficina Mecânica foi criada',
        message: {
          text:
            `Olá ${toName},\n\n` +
            `Sua conta de funcionário foi criada.\n` +
            `Senha inicial: ${password}\n\n` +
            `Recomendamos trocar a senha após o primeiro acesso.\n\n` +
            `Atenciosamente,\nEquipe da Oficina Mecânica`,
          html:
            `<p>Olá <strong>${toName}</strong>,</p>` +
            `<p>Sua conta de funcionário foi criada.</p>` +
            `<p><strong>Senha inicial:</strong> ${password}</p>` +
            `<p>Recomendamos trocar a senha após o primeiro acesso.</p>` +
            `<p>Atenciosamente,<br/>Equipe da Oficina Mecânica</p>`,
        },
      });
    } catch {
      // Falha de envio não deve reverter a criação já persistida (spec §8.1
      // aplica o mesmo princípio à concessão de acesso).
    }
  }
}
