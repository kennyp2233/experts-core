import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AppService } from './v1/app/app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './modules/database/database.module';
import { AppControllerV1 } from './v1/app/app.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { createWinstonLogger } from './common/logger/winston.logger';
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    WinstonModule.forRoot({
      instance: createWinstonLogger(),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    RedisModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('app.throttle.ttl'),
          limit: config.get<number>('app.throttle.limit'),
        },
      ],
    }),
    AuthModule,
    UsersModule,
    MasterDataModule,
    DocumentsModule,
    TemplatesModule,
    HealthModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }
