import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DateSerializerInterceptor } from '../../src/infrastructure/interceptors/date-serializer.interceptor';
import { SanitizeStringsPipe } from '../../src/infrastructure/pipes/sanitize-strings.pipe';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import type { Server } from 'http';
import { join } from 'path';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  httpServer: Server;
  prisma: PrismaService;
  postgresContainer: StartedPostgreSqlContainer;
  mailhogContainer: StartedTestContainer;
}

export async function setupTestApp(): Promise<TestContext> {
  const postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  const mailhogContainer = await new GenericContainer('mailhog/mailhog')
    .withExposedPorts(1025, 8025)
    .start();

  const databaseUrl = postgresContainer.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;
  process.env.MAIL_HOST = mailhogContainer.getHost();
  process.env.MAIL_PORT = mailhogContainer.getMappedPort(1025).toString();
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e';
  process.env.JWT_EXPIRATION = '15m';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-e2e';
  process.env.JWT_REFRESH_EXPIRATION = '7d';
  process.env.QUOTE_DECISION_TOKEN_SECRET = 'test-jwt-secret-key-for-e2e';

  execSync('npx prisma db push --force-reset', {
    env: { ...process.env },
    cwd: join(__dirname, '..', '..'),
    stdio: 'pipe',
  });

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new SanitizeStringsPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new DateSerializerInterceptor());

  await app.init();

  const prisma = moduleFixture.get(PrismaService);
  const httpServer = app.getHttpServer() as Server;

  return { app, httpServer, prisma, postgresContainer, mailhogContainer };
}

export async function teardownTestApp(ctx: TestContext): Promise<void> {
  if (ctx?.app) await ctx.app.close();
  if (ctx?.postgresContainer) await ctx.postgresContainer.stop();
  if (ctx?.mailhogContainer) await ctx.mailhogContainer.stop();
}
