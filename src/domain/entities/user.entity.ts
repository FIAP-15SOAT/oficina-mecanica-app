import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { UserRole } from '../enums/user-role.enum';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 150;
const MAX_EMAIL_LENGTH = 150;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = Object.values(UserRole);

export class User {
  id!: string;
  name!: string;
  email!: string;
  passwordHash!: string;
  role!: UserRole;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  static create(props: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): User {
    const user = new User({
      name: props.name.trim(),
      email: props.email.trim().toLowerCase(),
      passwordHash: props.passwordHash,
      role: props.role ?? UserRole.ATTENDANT,
      isActive: true,
    });

    user.validateName();
    user.validateEmail();
    user.validateRole();

    return user;
  }

  changeName(name: string): void {
    this.name = name.trim();
    this.validateName();
  }

  changeEmail(email: string): void {
    this.email = email.trim().toLowerCase();
    this.validateEmail();
  }

  changeRole(role: UserRole): void {
    this.role = role;
    this.validateRole();
  }

  changePassword(passwordHash: string): void {
    if (!passwordHash || passwordHash.length === 0) {
      throw new DomainValidationException('Hash de senha não pode ser vazio');
    }
    this.passwordHash = passwordHash;
  }

  activate(): void {
    if (this.isActive) {
      throw new DomainValidationException('Usuário já está ativo');
    }
    this.isActive = true;
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainValidationException('Usuário já está desativado');
    }
    this.isActive = false;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isMechanic(): boolean {
    return this.role === UserRole.MECHANIC;
  }

  isAttendant(): boolean {
    return this.role === UserRole.ATTENDANT;
  }

  toPublicView(): UserPublicView {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private validateName(): void {
    if (!this.name || this.name.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (this.name.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }

  private validateEmail(): void {
    if (!this.email || !EMAIL_REGEX.test(this.email)) {
      throw new DomainValidationException('E-mail inválido');
    }

    if (this.email.length > MAX_EMAIL_LENGTH) {
      throw new DomainValidationException(
        `E-mail deve ter no máximo ${MAX_EMAIL_LENGTH} caracteres`,
      );
    }
  }

  private validateRole(): void {
    if (!VALID_ROLES.includes(this.role)) {
      throw new DomainValidationException(
        `Role inválida. Valores aceitos: ${VALID_ROLES.join(', ')}`,
      );
    }
  }
}

export interface UserPublicView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
