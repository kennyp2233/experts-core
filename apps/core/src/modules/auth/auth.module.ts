import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthControllerV1 } from './v1/auth.controller';
import { AuthService as AuthServiceV1 } from './v1/auth.service';
import { JwtStrategy as JwtStrategyV1 } from './v1/strategies/jwt.strategy';
import { LocalStrategy as LocalStrategyV1 } from './v1/strategies/local.strategy';
import { RolesGuard } from './v1/guards/roles.guard';
import { TokenRefreshInterceptor } from './v1/interceptors/token-refresh.interceptor';
import { PrismaClient } from '.prisma/usuarios-client';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwtExpiresIn') as any,
        },
      }),
    }),
  ],
  providers: [
    AuthServiceV1,
    JwtStrategyV1,
    LocalStrategyV1,
    RolesGuard,
    { provide: 'PrismaClientUsuarios', useClass: PrismaClient },
    // TODO: Uncomment when Prisma clients are generated and tested
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TokenRefreshInterceptor,
    // },
  ],
  controllers: [AuthControllerV1],
  exports: [AuthServiceV1],
})
export class AuthModule {}
