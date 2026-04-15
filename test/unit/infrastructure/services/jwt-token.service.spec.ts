import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../../../src/domain/enums';
import { TokenPayload } from '../../../../src/domain/interfaces';
import { JwtTokenService } from '../../../../src/infrastructure/services/jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: jest.Mocked<JwtService>;

  const mockPayload: TokenPayload = {
    sub: 'user-uuid-123',
    email: 'rafael@email.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn().mockReturnValue(mockPayload),
    } as unknown as jest.Mocked<JwtService>;

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
      get: jest.fn().mockReturnValue('7d'),
    } as unknown as ConfigService;

    service = new JwtTokenService(jwtService, configService);
  });

  describe('signAccessToken', () => {
    it('deve assinar token de acesso', () => {
      const token = service.signAccessToken(mockPayload);

      expect(token).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('signRefreshToken', () => {
    it('deve assinar refresh token com secret e expiração separados', () => {
      const token = service.signRefreshToken(mockPayload);

      expect(token).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });
    });
  });

  describe('signTokenPair', () => {
    it('deve retornar par de tokens', () => {
      const pair = service.signTokenPair(mockPayload);

      expect(pair.accessToken).toBe('signed-token');
      expect(pair.refreshToken).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyAccessToken', () => {
    it('deve verificar token de acesso', () => {
      const result = service.verifyAccessToken('some-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('some-token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('deve verificar refresh token com secret específico', () => {
      const result = service.verifyRefreshToken('some-refresh-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('some-refresh-token', {
        secret: 'refresh-secret',
      });
    });
  });
});
