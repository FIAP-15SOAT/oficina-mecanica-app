import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';
import { IPasswordResetCodeRepository } from '@domain/interfaces/repositories/password-reset-code.repository.interface';

import { PasswordResetCodeMapper } from '@infrastructure/persistence/prisma/mappers/password-reset-code.mapper';

@Injectable()
export class PrismaPasswordResetCodeRepository implements IPasswordResetCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(code: PasswordResetCode): Promise<PasswordResetCode> {
    const record = await this.prisma.passwordResetCode.upsert({
      where: { userId: code.userId },
      create: {
        userId: code.userId,
        codeHash: code.codeHash,
        attempts: code.attempts,
        expiresAt: code.expiresAt,
      },
      update: {
        codeHash: code.codeHash,
        attempts: code.attempts,
        expiresAt: code.expiresAt,
      },
    });

    return PasswordResetCodeMapper.toDomain(record);
  }

  async findByUserId(userId: string): Promise<PasswordResetCode | null> {
    const record = await this.prisma.passwordResetCode.findUnique({ where: { userId } });

    return record ? PasswordResetCodeMapper.toDomain(record) : null;
  }

  async update(code: PasswordResetCode): Promise<PasswordResetCode> {
    const record = await this.prisma.passwordResetCode.update({
      where: { userId: code.userId },
      data: { codeHash: code.codeHash, attempts: code.attempts },
    });

    return PasswordResetCodeMapper.toDomain(record);
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.passwordResetCode.delete({ where: { userId } });
  }
}
