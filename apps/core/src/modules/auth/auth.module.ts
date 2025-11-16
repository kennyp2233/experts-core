import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient } from '.prisma/usuarios-client';

// Controllers
import { AuthControllerV1 } from './v1/controllers/auth.controller';
import { TrustedDevicesController } from './v1/controllers/trusted-devices.controller';

// Services
import { AuthService } from './v1/services/auth.service';
import { PasswordService } from './v1/services/password.service';
import { TokenService } from './v1/services/token.service';
import { TwoFactorService } from './v1/services/two-factor.service';
import { TrustedDevicesService } from './v1/services/trusted-devices.service';

// Repositories
import { UserRepository } from './v1/repositories/user.repository';
import { TrustedDeviceRepository } from './v1/repositories/trusted-device.repository';

// Strategies & Guards
import { JwtStrategy } from './v1/strategies/jwt.strategy';
import { LocalStrategy } from './v1/strategies/local.strategy';
import { RolesGuard } from './v1/guards/roles.guard';

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
    // Prisma Client
    { provide: 'PrismaClientUsuarios', useClass: PrismaClient },

    // Repositories
    UserRepository,
    TrustedDeviceRepository,

    // Services
    AuthService,
    PasswordService,
    TokenService,
    TwoFactorService,
    TrustedDevicesService,

    // Strategies
    JwtStrategy,
    LocalStrategy,

    // Guards
    RolesGuard,
  ],
  controllers: [AuthControllerV1, TrustedDevicesController],
  exports: [AuthService],
})
export class AuthModule {}
