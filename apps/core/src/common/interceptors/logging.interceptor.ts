import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const correlationId = uuidv4();
    const userAgent = request.get('user-agent');

    // Add correlation ID to request
    (request as any).correlationId = correlationId;

    const startTime = Date.now();

    // En producción, no logear User-Agent ni IP por seguridad
    if (this.isProduction) {
      this.logger.log(`→ ${method} ${url} | Correlation-ID: ${correlationId}`);
    } else {
      this.logger.debug(
        `→ ${method} ${url} | IP: ${ip} | User-Agent: ${userAgent} | Correlation-ID: ${correlationId}`,
      );
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        if (this.isProduction) {
          this.logger.log(
            `← ${method} ${url} | Status: ${statusCode} | Duration: ${duration}ms | Correlation-ID: ${correlationId}`,
          );
        } else {
          this.logger.debug(
            `← ${method} ${url} | Status: ${statusCode} | Duration: ${duration}ms | Correlation-ID: ${correlationId}`,
          );
        }

        // Add correlation ID to response headers
        response.setHeader('X-Correlation-ID', correlationId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // En producción, no exponer stack traces completos
        if (this.isProduction) {
          this.logger.error(
            `✗ ${method} ${url} | Duration: ${duration}ms | Error: ${error.message} | Correlation-ID: ${correlationId}`,
          );
        } else {
          this.logger.error(
            `✗ ${method} ${url} | Duration: ${duration}ms | Error: ${error.message} | Correlation-ID: ${correlationId}`,
            error.stack,
          );
        }
        throw error;
      }),
    );
  }
}
