import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

interface PasswordResetCodeProps {
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export class PasswordResetCode {
  readonly userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  readonly createdAt: Date;

  private constructor(props: PasswordResetCodeProps) {
    this.userId = props.userId;
    this.codeHash = props.codeHash;
    this.attempts = props.attempts;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: PasswordResetCodeProps): PasswordResetCode {
    return new PasswordResetCode(props);
  }

  static issue(userId: string, codeHash: string): PasswordResetCode {
    if (!codeHash) {
      throw new DomainValidationException('Hash do código não pode ser vazio');
    }

    const now = new Date();

    return new PasswordResetCode({
      userId,
      codeHash,
      attempts: 0,
      expiresAt: new Date(now.getTime() + TTL_MINUTES * 60_000),
      createdAt: now,
    });
  }

  isExpired(): boolean {
    return Date.now() >= this.expiresAt.getTime();
  }

  isExhausted(): boolean {
    return this.attempts >= MAX_ATTEMPTS;
  }

  registerFailedAttempt(): void {
    if (this.isExhausted()) {
      throw new BusinessRuleViolationException('Código de reset esgotado');
    }
    this.attempts += 1;
  }
}
