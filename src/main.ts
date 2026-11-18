import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { loadEnvironment } from './config/environment.js';
import { ApiExceptionFilter } from './http/api-exception.filter.js';
import { ApiResponseInterceptor } from './http/api-response.interceptor.js';

async function bootstrap() {
  const config = loadEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const {
    PORT: port,
    CORS_ORIGINS: corsOrigins,
    TRUST_PROXY_HOPS: trustProxyHops,
  } = config;

  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: !corsOrigins.includes('*'),
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  Logger.log(`API running on http://localhost:${port}/api/v1`, 'Bootstrap');
}
void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exitCode = 1;
});
