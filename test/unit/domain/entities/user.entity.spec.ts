import { UserRole } from '@domain/enums/user-role.enum';
import { User } from '@domain/entities/user.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { Email } from '@domain/value-objects/email.vo';

describe('User Entity', () => {
  const validProps = {
    name: 'Rafael Neves',
    email: 'rafael@email.com',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.ATTENDANT,
  };

  describe('create (factory method)', () => {
    it('should create a valid user', () => {
      const user = User.create(validProps);

      expect(user.name).toBe('Rafael Neves');
      expect(user.email.value).toBe('rafael@email.com');
      expect(user.passwordHash).toBe(validProps.passwordHash);
      expect(user.role).toBe(UserRole.ATTENDANT);
      expect(user.isActive).toBe(true);
    });

    it('should create with specific role', () => {
      const user = User.create({ ...validProps, role: UserRole.ADMIN });

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should normalize email to lowercase and trim', () => {
      const user = User.create({ ...validProps, email: '  RAFAEL@Email.COM  ' });

      expect(user.email.value).toBe('rafael@email.com');
    });

    it('should trim name', () => {
      const user = User.create({ ...validProps, name: '  Rafael Neves  ' });

      expect(user.name).toBe('Rafael Neves');
    });

    it('should throw error if name is too short', () => {
      expect(() => User.create({ ...validProps, name: 'Ab' })).toThrow(DomainValidationException);
      expect(() => User.create({ ...validProps, name: 'Ab' })).toThrow(
        'Nome deve ter no mínimo 3 caracteres',
      );
    });

    it('should throw error if name is too long', () => {
      const longName = 'A'.repeat(151);

      expect(() => User.create({ ...validProps, name: longName })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, name: longName })).toThrow(
        'Nome deve ter no máximo 150 caracteres',
      );
    });

    it('should throw error if email is invalid', () => {
      expect(() => User.create({ ...validProps, email: 'invalido' })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, email: 'invalido' })).toThrow('E-mail inválido');
    });

    it('should throw error if email is empty', () => {
      expect(() => User.create({ ...validProps, email: '' })).toThrow(DomainValidationException);
    });

    it('should throw error if email exceeds 150 characters', () => {
      const longEmail = 'a'.repeat(142) + '@test.com';

      expect(() => User.create({ ...validProps, email: longEmail })).toThrow(
        'E-mail deve ter no máximo 150 caracteres',
      );
    });

    it('should throw error if passwordHash is empty', () => {
      expect(() => User.create({ ...validProps, passwordHash: '' })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, passwordHash: '' })).toThrow(
        'Hash de senha não pode ser vazio',
      );
    });

    it('should throw error if role is invalid', () => {
      expect(() => User.create({ ...validProps, role: 'InvalidRole' as UserRole })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, role: 'InvalidRole' as UserRole })).toThrow(
        'Role inválida',
      );
    });
  });

  describe('changeName', () => {
    it('should change name successfully', () => {
      const user = User.create(validProps);
      user.changeName('Guilherme Salvador');

      expect(user.name).toBe('Guilherme Salvador');
    });

    it('should trim new name', () => {
      const user = User.create(validProps);
      user.changeName('  Lucas Almeida  ');

      expect(user.name).toBe('Lucas Almeida');
    });

    it('should throw error if name is too short', () => {
      const user = User.create(validProps);

      expect(() => user.changeName('Ab')).toThrow(DomainValidationException);
    });
  });

  describe('changeEmail', () => {
    it('should change email and normalize', () => {
      const user = User.create(validProps);
      user.changeEmail('NOVO@Email.COM');

      expect(user.email.value).toBe('novo@email.com');
    });

    it('should throw error if email is invalid', () => {
      const user = User.create(validProps);

      expect(() => user.changeEmail('invalido')).toThrow(DomainValidationException);
    });
  });

  describe('changeRole', () => {
    it('should change role successfully', () => {
      const user = User.create(validProps);
      user.changeRole(UserRole.MECHANIC);

      expect(user.role).toBe(UserRole.MECHANIC);
    });

    it('should throw error for invalid role', () => {
      const user = User.create(validProps);

      expect(() => user.changeRole('InvalidRole' as UserRole)).toThrow(DomainValidationException);
      expect(() => user.changeRole('InvalidRole' as UserRole)).toThrow('Role inválida');
    });
  });

  describe('changePassword', () => {
    it('should change password hash', () => {
      const user = User.create(validProps);
      user.changePassword('$2b$12$newhash');

      expect(user.passwordHash).toBe('$2b$12$newhash');
    });

    it('should throw error if hash is empty', () => {
      const user = User.create(validProps);

      expect(() => user.changePassword('')).toThrow(DomainValidationException);
      expect(() => user.changePassword('')).toThrow('Hash de senha não pode ser vazio');
    });
  });

  describe('activate / deactivate', () => {
    it('should deactivate an active user', () => {
      const user = User.create(validProps);

      expect(user.isActive).toBe(true);

      user.deactivate();

      expect(user.isActive).toBe(false);
    });

    it('should activate a deactivated user', () => {
      const user = User.create(validProps);
      user.deactivate();
      user.activate();

      expect(user.isActive).toBe(true);
    });

    it('should throw error when activating already active user', () => {
      const user = User.create(validProps);

      expect(() => user.activate()).toThrow(DomainValidationException);
      expect(() => user.activate()).toThrow('Usuário já está ativo');
    });

    it('should throw error when deactivating already deactivated user', () => {
      const user = User.create(validProps);
      user.deactivate();

      expect(() => user.deactivate()).toThrow(DomainValidationException);
      expect(() => user.deactivate()).toThrow('Usuário já está desativado');
    });
  });

  describe('role checks', () => {
    it('should identify Admin', () => {
      const user = User.create({ ...validProps, role: UserRole.ADMIN });

      expect(user.isAdmin()).toBe(true);
      expect(user.isMechanic()).toBe(false);
      expect(user.isAttendant()).toBe(false);
    });

    it('should identify Mechanic', () => {
      const user = User.create({ ...validProps, role: UserRole.MECHANIC });

      expect(user.isAdmin()).toBe(false);
      expect(user.isMechanic()).toBe(true);
      expect(user.isAttendant()).toBe(false);
    });

    it('should identify Attendant', () => {
      const user = User.create(validProps);

      expect(user.isAdmin()).toBe(false);
      expect(user.isMechanic()).toBe(false);
      expect(user.isAttendant()).toBe(true);
    });
  });

  describe('toPublicView', () => {
    it('should return public view without passwordHash', () => {
      const now = new Date();

      const user = User.reconstitute({
        id: 'uuid-123',
        name: 'Rafael',
        email: Email.create('rafael@email.com'),
        passwordHash: 'secret-hash',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const view = user.toPublicView();

      expect(view).toEqual({
        id: 'uuid-123',
        name: 'Rafael',
        email: 'rafael@email.com',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      expect(view).not.toHaveProperty('passwordHash');
    });
  });
});
