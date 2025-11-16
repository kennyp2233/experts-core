/**
 * Constantes de configuración para el módulo de autenticación
 */

export const AuthConstants = {
  /**
   * Configuración de hashing de contraseñas
   */
  PASSWORD: {
    SALT_ROUNDS: 10,
  },

  /**
   * Configuración de tokens
   */
  TOKENS: {
    ACCESS_TOKEN_EXPIRES: 15 * 60 * 1000, // 15 minutos en milisegundos
    REFRESH_TOKEN_EXPIRES: '7d', // 7 días
    REFRESH_TOKEN_EXPIRES_SECONDS: 7 * 24 * 60 * 60, // 7 días en segundos
  },

  /**
   * Configuración de 2FA
   */
  TWO_FACTOR: {
    SECRET_EXPIRY_SECONDS: 600, // 10 minutos
    LOGIN_SESSION_EXPIRY_SECONDS: 300, // 5 minutos
    ISSUER: 'ExpertsCore',
  },

  /**
   * Configuración de dispositivos confiables
   */
  TRUSTED_DEVICES: {
    MAX_DEVICES_PER_USER: 5,
    TRUST_DURATION_DAYS: 30,
    TRUST_DURATION_SECONDS: 30 * 24 * 60 * 60, // 30 días en segundos
  },

  /**
   * Prefijos de claves Redis
   */
  REDIS_KEYS: {
    REFRESH_TOKEN: (userId: string, token: string) => `refresh:${userId}:${token}`,
    REFRESH_TOKEN_PATTERN: (userId: string) => `refresh:${userId}:*`,
    TWO_FACTOR_PENDING: (userId: string) => `2fa:pending:${userId}`,
    TWO_FACTOR_LOGIN: (tempToken: string) => `2fa:login:${tempToken}`,
  },

  /**
   * Configuración de cookies
   */
  COOKIES: {
    ACCESS_TOKEN_NAME: 'access_token',
    REFRESH_TOKEN_NAME: 'refresh_token',
    OPTIONS: {
      httpOnly: true,
      sameSite: (env: string) => (env === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
      secure: (env: string) => env === 'production',
      path: '/',
    },
  },
} as const;
