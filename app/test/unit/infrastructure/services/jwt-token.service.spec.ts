import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@domain/enums/user-role.enum';
import { TokenPayload } from '@application/ports/output/token.service.interface';
import { JwtTokenService } from '@infrastructure/services/jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: jest.Mocked<JwtService>;

  const mockPayload: TokenPayload = {
    sub: 'user-uuid-123',
    email: 'admin@email.com',
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
    it('should sign access token', () => {
      const token = service.signAccessToken(mockPayload);

      expect(token).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('signRefreshToken', () => {
    it('should sign refresh token with separate secret and expiration', () => {
      const token = service.signRefreshToken(mockPayload);

      expect(token).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });
    });
  });

  describe('signTokenPair', () => {
    it('should return token pair', () => {
      const pair = service.signTokenPair(mockPayload);

      expect(pair.accessToken).toBe('signed-token');
      expect(pair.refreshToken).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify refresh token with specific secret', () => {
      const result = service.verifyRefreshToken('some-refresh-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('some-refresh-token', {
        secret: 'refresh-secret',
      });
    });
  });
});
