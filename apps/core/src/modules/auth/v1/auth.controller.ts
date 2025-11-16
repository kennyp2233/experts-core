import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { DeviceFingerprintUtils } from './utils/device-fingerprint.utils';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthControllerV1 {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 intentos por minuto
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        user: {
          id: 'cm3hj9k8l0000xjke8bqf5z9m',
          email: 'user@example.com',
          username: 'johndoe',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          createdAt: '2024-11-10T12:00:00.000Z',
          updatedAt: '2024-11-10T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario o email ya existe',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(registerDto);
    const accessToken = await this.authService.generateToken(user);

    // Generar refresh token
    const refreshToken = await this.authService.generateRefreshToken(
      user.id,
      req.headers['user-agent'],
      req.ip,
    );

    // Setear access token cookie (15 minutos)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Setear refresh token cookie (7 días)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso O requiere 2FA',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
              },
            },
          },
        },
        {
          type: 'object',
          properties: {
            requires2FA: { type: 'boolean', example: true },
            tempToken: { type: 'string', example: 'abc123...' },
            message: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  async login(
    @Request() req: any,
    @Req() request: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;

    // Verificar si el usuario tiene 2FA habilitado
    const userWith2FA = await this.authService['prisma'].user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });

    // Temporary: Check if user has 2FA enabled in Redis
    // const has2FA = await this.authService['redis'].get(`2fa:enabled:${user.id}`);

    // Si NO tiene 2FA, login normal
    if (!userWith2FA?.twoFactorEnabled) {
      return this.completeLogin(user, request, res);
    }

    // Tiene 2FA: verificar si el dispositivo es confiable
    const fingerprint = DeviceFingerprintUtils.generate(request);
    const isTrusted = await this.authService.isDeviceTrusted(user.id, fingerprint);

    if (isTrusted) {
      // Dispositivo confiable: Skip 2FA
      await this.authService.updateDeviceLastUsed(user.id, fingerprint, request.ip);
      return this.completeLogin(user, request, res);
    }

    // Dispositivo NO confiable: Requiere 2FA
    const tempToken = randomBytes(32).toString('hex');
    const deviceInfo = DeviceFingerprintUtils.extractInfo(request);

    // Guardar sesión temporal en Redis (5 minutos)
    await this.authService['redis'].setex(
      `2fa:login:${tempToken}`,
      300,
      JSON.stringify({
        userId: user.id,
        fingerprint,
        deviceInfo,
        ip: request.ip,
      }),
    );

    return {
      requires2FA: true,
      tempToken,
      message: 'Ingresa tu código 2FA de 6 dígitos',
    };
  }

  /**
   * Completa el login generando tokens y seteando cookies
   */
  private async completeLogin(user: any, request: any, res: Response) {
    const result = await this.authService.login(user);

    // Generar refresh token
    const refreshToken = await this.authService.generateRefreshToken(
      user.id,
      request.headers['user-agent'],
      request.ip,
    );

    // Setear access token cookie (15 minutos)
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Setear refresh token cookie (7 días)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    // Revocar refresh token de Redis si existe
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const userId = await this.authService.validateRefreshToken(refreshToken);
      if (userId) {
        await this.authService.revokeRefreshToken(userId, refreshToken);
      }
    }

    // Limpiar cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    schema: {
      example: {
        id: 'cm3hj9k8l0000xjke8bqf5z9m',
        username: 'johndoe',
        email: 'user@example.com',
        role: 'USER',
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  })
  async getProfile(@Request() req: any) {
    return {
      id: req.user.sub,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };
  }

  // ==================== 2FA ENDPOINTS ====================

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Habilitar 2FA - Genera código QR' })
  @ApiResponse({
    status: 200,
    description: 'QR code generado exitosamente',
    schema: {
      example: {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KG...',
      },
    },
  })
  async enable2FA(@Request() req: any) {
    const userId = req.user.userId;
    const email = req.user.email;

    const result = await this.authService.generate2FASecret(userId, email);

    return {
      secret: result.secret,
      qrCode: result.qrCode,
      message: 'Escanea el código QR con Google Authenticator y confirma con un código',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar habilitación de 2FA' })
  @ApiBody({ type: Enable2FADto })
  @ApiResponse({
    status: 200,
    description: '2FA habilitado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Sesión 2FA expirada',
  })
  @ApiResponse({
    status: 401,
    description: 'Código 2FA inválido',
  })
  async confirm2FA(@Request() req: any, @Body() dto: Enable2FADto) {
    const userId = req.user.userId;

    await this.authService.confirm2FA(userId, dto.token);

    return {
      success: true,
      message: '2FA habilitado exitosamente',
    };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA durante login' })
  @ApiBody({ type: Verify2FADto })
  @ApiResponse({
    status: 200,
    description: '2FA verificado exitosamente - Login completo',
    schema: {
      example: {
        user: {
          id: 'cm3hj9k8l0000xjke8bqf5z9m',
          username: 'johndoe',
          email: 'user@example.com',
          role: 'USER',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Código 2FA inválido o sesión expirada',
  })
  async verify2FA(
    @Body() dto: Verify2FADto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Recuperar sesión temporal de Redis
    const data = await this.authService['redis'].get(`2fa:login:${dto.tempToken}`);

    if (!data) {
      throw new UnauthorizedException('Sesión 2FA expirada');
    }

    const { userId, fingerprint, deviceInfo, ip } = JSON.parse(data);

    // Verificar código 2FA
    await this.authService.verify2FACode(userId, dto.token);

    // Obtener usuario completo de DB
    const user = await this.authService['prisma'].user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Temporary: Create user object from userId (should come from DB)
    // const user = {
    //   id: userId,
    //   username: 'user',
    //   email: 'user@example.com',
    //   role: 'USER',
    //   firstName: 'User',
    //   lastName: 'Name',
    // };

    // Si usuario marcó "Confiar en este dispositivo"
    if (dto.trustDevice) {
      await this.authService.trustDevice(
        userId,
        fingerprint,
        deviceInfo,
        ip,
      );
    }

    // Limpiar sesión temporal
    await this.authService['redis'].del(`2fa:login:${dto.tempToken}`);

    // Completar login: generar tokens y cookies
    return this.completeLogin(user, req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deshabilitar 2FA' })
  @ApiResponse({
    status: 200,
    description: '2FA deshabilitado exitosamente',
  })
  async disable2FA(@Request() req: any) {
    const userId = req.user.userId;

    await this.authService.disable2FA(userId);

    return {
      success: true,
      message: '2FA deshabilitado exitosamente. Todos los dispositivos confiables han sido eliminados.',
    };
  }
}
