import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';

export interface IPasswordResetCodeRepository {
  upsert(code: PasswordResetCode): Promise<PasswordResetCode>;
  findByUserId(userId: string): Promise<PasswordResetCode | null>;
  incrementAttempts(userId: string): Promise<void>;
  delete(userId: string): Promise<void>;
}
