import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BcryptHashService } from './bcrypt-hash.service';
import { JwtTokenService } from './jwt-token.service';
import { MailerEmailSenderService } from './mailer-email-sender.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '15m') as `${number}m`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    { provide: 'IHashService', useClass: BcryptHashService },
    { provide: 'ITokenService', useClass: JwtTokenService },
    { provide: 'IEmailSenderService', useClass: MailerEmailSenderService },
  ],
  exports: ['IHashService', 'ITokenService', 'IEmailSenderService'],
})
export class InfrastructureServicesModule {}
