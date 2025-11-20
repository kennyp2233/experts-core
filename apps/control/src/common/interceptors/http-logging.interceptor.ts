import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, headers } = request;
    const startTime = Date.now();

    // Log request
    this.logger.log(`➡️  ${method} ${url}`);
    this.logger.debug(`Headers:`, {
      'content-type': headers['content-type'],
      'content-length': headers['content-length'],
      'authorization': headers.authorization ? 'Bearer ***' : 'None',
      'user-agent': headers['user-agent']
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;
        const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';

        this.logger.log(`${statusEmoji} ${method} ${url} - ${statusCode} (${duration}ms)`);
      })
    );
  }
}