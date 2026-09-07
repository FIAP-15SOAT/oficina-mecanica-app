import { PasswordResetCode as PrismaPasswordResetCode } from '@generated/client';
import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';

export class PasswordResetCodeMapper {
  static toDomain(record: PrismaPasswordResetCode): PasswordResetCode {
    return PasswordResetCode.reconstitute({
      userId: record.userId,
      codeHash: record.codeHash,
      attempts: record.attempts,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    });
  }
}
