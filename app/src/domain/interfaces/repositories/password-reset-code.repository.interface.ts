import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';

export interface IPasswordResetCodeRepository {
  upsert(code: PasswordResetCode): Promise<PasswordResetCode>;
  findByUserId(userId: string): Promise<PasswordResetCode | null>;
  update(code: PasswordResetCode): Promise<PasswordResetCode>;
  delete(userId: string): Promise<void>;
}
