import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createWinstonLogger } from './common/logger/winston.logger';

async function bootstrap() {
  // Create app
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const apiVersion = configService.get<string>('app.apiVersion');

  // Global middleware
  app.use(helmet());
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://core.expertshcargo.com',
      'https://system.expertshcargo.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Set API prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable API versioning from config
  const versioningConfig = configService.get('app.versioning');
  app.enableVersioning(versioningConfig);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors are now registered in AppModule

  // Global exception filters are now registered in AppModule

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Experts Core API')
    .setDescription('Core API for Experts application')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = configService.get<number>('app.port');
  const nodeEnv = configService.get<string>('app.nodeEnv');

  await app.listen(port);

  const logger = createWinstonLogger();
  logger.info(`🚀 Application is running on port ${port}`);
  logger.info(`📝 Environment: ${nodeEnv}`);
  logger.info(
    `📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`,
  );
  logger.info(
    `🔗 API Base URL: http://localhost:${port}/${apiPrefix}/${apiVersion}`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
