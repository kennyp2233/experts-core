import { Role } from '@internal/usuarios-client';

/**
 * Respuesta de autenticación exitosa
 */
export interface AuthResponse {
  user: UserInfo;
}

/**
 * Respuesta cuando se requiere 2FA
 */
export interface TwoFactorRequiredResponse {
  requires2FA: true;
  tempToken: string;
  message: string;
}

/**
 * Respuesta de login (puede ser con o sin 2FA)
 */
export type LoginResponse = AuthResponse | TwoFactorRequiredResponse;

/**
 * Información pública del usuario
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

/**
 * Resultado de generación de tokens
 */
export interface TokensResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Resultado de generación de secreto 2FA
 */
export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
}

/**
 * Datos de sesión temporal 2FA
 */
export interface TwoFactorLoginSession {
  userId: string;
  fingerprint: string;
  deviceInfo: any; // DeviceInfo from utils
  ip: string;
  failedAttempts: number;
}
