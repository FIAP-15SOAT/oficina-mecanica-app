import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { DateSerializerInterceptor } from './infrastructure/interceptors/date-serializer.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new DateSerializerInterceptor());

  app.enableCors();
  app.enableShutdownHooks();

  setupSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
}

void bootstrap();
