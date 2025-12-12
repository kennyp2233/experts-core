import * as winston from 'winston';
import 'winston-daily-rotate-file';
const DailyRotateFile = require('winston-daily-rotate-file');
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export function createWinstonLogger() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  const transports: winston.transport[] = [];

  // Console transport - Different format for dev/prod
  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          nestWinstonModuleUtilities.format.nestLike('Experts-Core', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  } else {
    // Production: JSON format without colors
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  // File transports (only in production)
  if (isProduction) {
    transports.push(
      // Error logs
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      // Combined logs
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: winston.format.json(),
    transports,
    // No logear información sensible en producción
    exitOnError: false,
  });
}
