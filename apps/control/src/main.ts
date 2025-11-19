import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Filtro global de excepciones para debugging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Interceptor global para debugging de requests
  app.use((req: any, res: any, next: any) => {
    const startTime = Date.now();
    console.log(`[Request] ${req.method} ${req.path} - Start`);
    console.log(`[Request] Headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'None'
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[Response] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  });

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
