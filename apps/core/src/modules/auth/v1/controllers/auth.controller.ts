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
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Enable2FADto } from '../dto/enable-2fa.dto';
import { Verify2FADto } from '../dto/verify-2fa.dto';
import { DeviceFingerprintUtils } from '../utils/device-fingerprint.utils';
import { AuthConstants } from '../config/auth.constants';
import { UserForToken } from '../interfaces';

/**
 * Controlador de autenticación
 * Responsabilidad: Manejar requests HTTP y delegar a AuthService
 */
@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthControllerV1 {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validación' })
  @ApiResponse({ status: 409, description: 'El usuario o email ya existe' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(registerDto);
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      user,
      req.headers['user-agent'],
      req.ip,
    );

    this.setCookies(res, accessToken, refreshToken);

    return { user };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso O requiere 2FA' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Request() req: any,
    @Req() request: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;

    // Verificar si el usuario tiene 2FA habilitado
    const has2FA = await this.authService.twoFactor.isEnabled(user.id);

    if (!has2FA) {
      return this.completeLogin(user, request, res);
    }

    // Verificar si el dispositivo es confiable
    const fingerprint = DeviceFingerprintUtils.generate(request);
    const isTrusted = await this.authService.trustedDevices.isTrusted(
      user.id,
      fingerprint,
    );

    if (isTrusted) {
      await this.authService.trustedDevices.updateLastUsed(
        user.id,
        fingerprint,
        request.ip,
      );
      return this.completeLogin(user, request, res);
    }

    // Requiere 2FA
    const tempToken = randomBytes(32).toString('hex');
    const deviceInfo = DeviceFingerprintUtils.extractInfo(request);

    await this.authService.twoFactor.saveLoginSession(tempToken, {
      userId: user.id,
      fingerprint,
      deviceInfo,
      ip: request.ip,
    });

    return {
      requires2FA: true,
      tempToken,
      message: 'Ingresa tu código 2FA de 6 dígitos',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      const userId = await this.authService.tokens.validate(refreshToken);
      if (userId) {
        await this.authService.tokens.revoke(userId, refreshToken);
      }
    }

    this.clearCookies(res);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
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
  @ApiResponse({ status: 200, description: 'QR code generado exitosamente' })
  async enable2FA(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const email = req.user.email;

    const result = await this.authService.twoFactor.generateSecret(
      userId,
      email,
    );

    return {
      secret: result.secret,
      qrCode: result.qrCode,
      message:
        'Escanea el código QR con Google Authenticator y confirma con un código',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar habilitación de 2FA' })
  @ApiBody({ type: Enable2FADto })
  @ApiResponse({ status: 200, description: '2FA habilitado exitosamente' })
  @ApiResponse({ status: 400, description: 'Sesión 2FA expirada' })
  @ApiResponse({ status: 401, description: 'Código 2FA inválido' })
  async confirm2FA(@Request() req: any, @Body() dto: Enable2FADto) {
    const userId = req.user.sub || req.user.userId;

    await this.authService.twoFactor.confirmEnable(userId, dto.token);

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
  @ApiResponse({ status: 200, description: '2FA verificado exitosamente' })
  @ApiResponse({ status: 401, description: 'Código 2FA inválido o sesión expirada' })
  async verify2FA(
    @Body() dto: Verify2FADto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.twoFactor.getAndRemoveLoginSession(
      dto.tempToken,
    );

    if (!session) {
      throw new UnauthorizedException('Sesión 2FA expirada');
    }

    const { userId, fingerprint, deviceInfo, ip } = session;

    // Verificar código 2FA
    await this.authService.twoFactor.verify(userId, dto.token);

    // Obtener usuario
    const user = await this.authService.getUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Confiar en dispositivo si lo solicita
    if (dto.trustDevice) {
      await this.authService.trustedDevices.trust(
        userId,
        fingerprint,
        deviceInfo,
        ip,
      );
    }

    return this.completeLogin(user, req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deshabilitar 2FA' })
  @ApiResponse({ status: 200, description: '2FA deshabilitado exitosamente' })
  async disable2FA(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    await this.authService.twoFactor.disable(userId);
    await this.authService.trustedDevices.removeAll(userId);

    return {
      success: true,
      message:
        '2FA deshabilitado exitosamente. Todos los dispositivos confiables han sido eliminados.',
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Completa el login generando tokens y seteando cookies
   */
  private async completeLogin(
    user: UserForToken,
    request: any,
    res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      user,
      request.headers['user-agent'],
      request.ip,
    );

    this.setCookies(res, accessToken, refreshToken);

    return { user };
  }

  /**
   * Setea cookies de autenticación
   */
  private setCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const env = process.env.NODE_ENV || 'development';

    res.cookie(
      AuthConstants.COOKIES.ACCESS_TOKEN_NAME,
      accessToken,
      {
        httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
        secure: AuthConstants.COOKIES.OPTIONS.secure(env),
        sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
        maxAge: AuthConstants.TOKENS.ACCESS_TOKEN_EXPIRES,
        path: AuthConstants.COOKIES.OPTIONS.path,
      },
    );

    res.cookie(
      AuthConstants.COOKIES.REFRESH_TOKEN_NAME,
      refreshToken,
      {
        httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
        secure: AuthConstants.COOKIES.OPTIONS.secure(env),
        sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
        maxAge: AuthConstants.TOKENS.REFRESH_TOKEN_EXPIRES_SECONDS * 1000,
        path: AuthConstants.COOKIES.OPTIONS.path,
      },
    );
  }

  /**
   * Limpia cookies de autenticación
   */
  private clearCookies(res: Response): void {
    const env = process.env.NODE_ENV || 'development';

    res.clearCookie(AuthConstants.COOKIES.ACCESS_TOKEN_NAME, {
      httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
      secure: AuthConstants.COOKIES.OPTIONS.secure(env),
      sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
      path: AuthConstants.COOKIES.OPTIONS.path,
    });

    res.clearCookie(AuthConstants.COOKIES.REFRESH_TOKEN_NAME, {
      httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
      secure: AuthConstants.COOKIES.OPTIONS.secure(env),
      sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
      path: AuthConstants.COOKIES.OPTIONS.path,
    });
  }
}
