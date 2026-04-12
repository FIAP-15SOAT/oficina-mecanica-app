import { UserRole } from '../../../../src/domain/enums';
import { User } from '../../../../src/domain/entities/user.entity';
import { DomainValidationException } from '../../../../src/domain/exceptions';

describe('User Entity', () => {
  const validProps = {
    name: 'Rafael Neves',
    email: 'rafael@email.com',
    passwordHash: '$2b$12$hashedpassword',
  };

  describe('create (factory method)', () => {
    it('deve criar um usuário válido com defaults', () => {
      const user = User.create(validProps);

      expect(user.name).toBe('Rafael Neves');
      expect(user.email).toBe('rafael@email.com');
      expect(user.passwordHash).toBe(validProps.passwordHash);
      expect(user.role).toBe(UserRole.ATTENDANT);
      expect(user.isActive).toBe(true);
    });

    it('deve criar com role específica', () => {
      const user = User.create({ ...validProps, role: UserRole.ADMIN });

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('deve normalizar o e-mail para lowercase e trimmar', () => {
      const user = User.create({ ...validProps, email: '  RAFAEL@Email.COM  ' });

      expect(user.email).toBe('rafael@email.com');
    });

    it('deve trimmar o nome', () => {
      const user = User.create({ ...validProps, name: '  Rafael Neves  ' });

      expect(user.name).toBe('Rafael Neves');
    });

    it('deve lançar erro se nome for muito curto', () => {
      expect(() => User.create({ ...validProps, name: 'Ab' })).toThrow(DomainValidationException);
      expect(() => User.create({ ...validProps, name: 'Ab' })).toThrow(
        'Nome deve ter no mínimo 3 caracteres',
      );
    });

    it('deve lançar erro se nome for muito longo', () => {
      const longName = 'A'.repeat(151);

      expect(() => User.create({ ...validProps, name: longName })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, name: longName })).toThrow(
        'Nome deve ter no máximo 150 caracteres',
      );
    });

    it('deve lançar erro se e-mail for inválido', () => {
      expect(() => User.create({ ...validProps, email: 'invalido' })).toThrow(
        DomainValidationException,
      );
      expect(() => User.create({ ...validProps, email: 'invalido' })).toThrow('E-mail inválido');
    });

    it('deve lançar erro se e-mail for vazio', () => {
      expect(() => User.create({ ...validProps, email: '' })).toThrow(DomainValidationException);
    });

    it('deve lançar erro se e-mail exceder 150 caracteres', () => {
      const longEmail = 'a'.repeat(142) + '@test.com';

      expect(() => User.create({ ...validProps, email: longEmail })).toThrow(
        'E-mail deve ter no máximo 150 caracteres',
      );
    });
  });

  describe('changeName', () => {
    it('deve alterar o nome com sucesso', () => {
      const user = User.create(validProps);
      user.changeName('Guilherme Salvador');

      expect(user.name).toBe('Guilherme Salvador');
    });

    it('deve trimmar o novo nome', () => {
      const user = User.create(validProps);
      user.changeName('  Lucas Almeida  ');

      expect(user.name).toBe('Lucas Almeida');
    });

    it('deve lançar erro se nome for curto demais', () => {
      const user = User.create(validProps);

      expect(() => user.changeName('Ab')).toThrow(DomainValidationException);
    });
  });

  describe('changeEmail', () => {
    it('deve alterar o e-mail e normalizar', () => {
      const user = User.create(validProps);
      user.changeEmail('NOVO@Email.COM');

      expect(user.email).toBe('novo@email.com');
    });

    it('deve lançar erro se e-mail for inválido', () => {
      const user = User.create(validProps);

      expect(() => user.changeEmail('invalido')).toThrow(DomainValidationException);
    });
  });

  describe('changeRole', () => {
    it('deve alterar a role com sucesso', () => {
      const user = User.create(validProps);
      user.changeRole(UserRole.MECHANIC);

      expect(user.role).toBe(UserRole.MECHANIC);
    });

    it('deve lançar erro para role inválida', () => {
      const user = User.create(validProps);

      expect(() => user.changeRole('InvalidRole' as UserRole)).toThrow(DomainValidationException);
      expect(() => user.changeRole('InvalidRole' as UserRole)).toThrow('Role inválida');
    });
  });

  describe('changePassword', () => {
    it('deve alterar o hash da senha', () => {
      const user = User.create(validProps);
      user.changePassword('$2b$12$newhash');

      expect(user.passwordHash).toBe('$2b$12$newhash');
    });

    it('deve lançar erro se hash for vazio', () => {
      const user = User.create(validProps);

      expect(() => user.changePassword('')).toThrow(DomainValidationException);
      expect(() => user.changePassword('')).toThrow('Hash de senha não pode ser vazio');
    });
  });

  describe('activate / deactivate', () => {
    it('deve desativar um usuário ativo', () => {
      const user = User.create(validProps);

      expect(user.isActive).toBe(true);

      user.deactivate();

      expect(user.isActive).toBe(false);
    });

    it('deve ativar um usuário desativado', () => {
      const user = User.create(validProps);
      user.deactivate();
      user.activate();

      expect(user.isActive).toBe(true);
    });

    it('deve lançar erro ao ativar usuário já ativo', () => {
      const user = User.create(validProps);

      expect(() => user.activate()).toThrow(DomainValidationException);
      expect(() => user.activate()).toThrow('Usuário já está ativo');
    });

    it('deve lançar erro ao desativar usuário já desativado', () => {
      const user = User.create(validProps);
      user.deactivate();

      expect(() => user.deactivate()).toThrow(DomainValidationException);
      expect(() => user.deactivate()).toThrow('Usuário já está desativado');
    });
  });

  describe('role checks', () => {
    it('deve identificar Admin', () => {
      const user = User.create({ ...validProps, role: UserRole.ADMIN });

      expect(user.isAdmin()).toBe(true);
      expect(user.isMechanic()).toBe(false);
      expect(user.isAttendant()).toBe(false);
    });

    it('deve identificar Mechanic', () => {
      const user = User.create({ ...validProps, role: UserRole.MECHANIC });

      expect(user.isAdmin()).toBe(false);
      expect(user.isMechanic()).toBe(true);
      expect(user.isAttendant()).toBe(false);
    });

    it('deve identificar Attendant', () => {
      const user = User.create(validProps);

      expect(user.isAdmin()).toBe(false);
      expect(user.isMechanic()).toBe(false);
      expect(user.isAttendant()).toBe(true);
    });
  });

  describe('toPublicView', () => {
    it('deve retornar view pública sem passwordHash', () => {
      const now = new Date();
      const user = new User({
        id: 'uuid-123',
        name: 'Rafael',
        email: 'rafael@email.com',
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
