import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: (request as any).url,
      message,
      ...(error && { error }),
      // En producción no exponer detalles internos
      ...(!this.isProduction &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    // Log the error
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // En producción, no logear stack traces completos por seguridad
      if (this.isProduction) {
        this.logger.error(
          `[${(request as any).method}] ${(request as any).url} - ${status} - ${message}`,
        );
      } else {
        this.logger.error(
          `[${(request as any).method}] ${(request as any).url}`,
          exception instanceof Error
            ? exception.stack
            : JSON.stringify(exception),
        );
      }
    } else {
      this.logger.warn(
        `[${(request as any).method}] ${(request as any).url} - ${status}`,
      );
    }

    httpAdapter.reply(response, responseBody, status);
  }
}
