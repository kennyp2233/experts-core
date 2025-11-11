import { registerAs } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';

/**
 * Configuración centralizada de la aplicación
 * Todas las configuraciones deben ser accedidas a través de ConfigService
 */
export default registerAs('app', () => {
  // Validación de variables críticas
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET no está configurado en las variables de entorno',
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    // Entorno
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',

    // Server
    port: parseInt(process.env.PORT || '3000', 10),

    // API
    apiPrefix: 'api',
    apiVersion: 'v1',

    // Versionamiento
    versioning: {
      type: VersioningType.URI,
      defaultVersion: 'v1',
    },

    // Autenticación
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '60m',

    // Rate Limiting
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    },

    // Logs
    logLevel:
      process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  };
});
