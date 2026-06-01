import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnvOnBootstrap } from './config/validate-env';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

async function bootstrap() {
  validateEnvOnBootstrap();

  const app = await NestFactory.create(AppModule, { cors: false });
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const origins =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error('CORS_ORIGINS production ortamında zorunludur');
  }
  app.enableCors(
    origins.length > 0
      ? { origin: origins, credentials: true }
      : nodeEnv === 'production'
        ? false
        : { origin: true, credentials: true },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.use(
    helmet({
      /** Web paneli farklı porttan (örn. 5050) logo `<img>` ile API’den (5001) yükleyebilsin */
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.setGlobalPrefix('v1');
  const port = Number(process.env.PORT ?? 5001);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  console.log(`Point API http://localhost:${port}/v1/health (LAN: http://<bilgisayar-ip>:${port}/v1/health)`);
}

bootstrap();
