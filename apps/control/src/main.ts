import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Configurar CORS para desarrollo web y apps móviles
  app.enableCors({
    origin: [
      'http://localhost:8081', // Expo web desarrollo
      'http://localhost:3000', // Frontend desarrollo
      'http://localhost:4200', // Angular desarrollo
      'https://www.expertshcargo.com', // Producción
      'https://system.expertshcargo.com', // Producción System
      'exp://*', // Expo apps
      '*' // Permitir todos los orígenes para apps móviles
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'User-Agent'
    ],
  });

  logger.log('CORS configurado para desarrollo y producción');

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
