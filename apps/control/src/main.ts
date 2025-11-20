import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Filtro global de excepciones para debugging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Interceptor global para logging HTTP
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // Configurar límites para body parser (para manejar fotos base64)
  app.use(express.json({
    limit: '50mb' // Aumentar límite a 50MB para fotos base64
  }));
  app.use(express.urlencoded({
    limit: '50mb',
    extended: true
  }));

  // Configurar ValidationPipe global con transformación habilitada
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

}
bootstrap();
