import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

interface PrismaError {
  code: string;
  meta?: { target?: string[]; cause?: string };
}

function isPrismaError(err: unknown): err is PrismaError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PrismaError).code === 'string'
  );
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = randomUUID();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = (exceptionResponse as { message: string | string[] }).message;
        message = Array.isArray(msg) ? msg.join(', ') : msg;
      }
    } else if (isPrismaError(exception)) {
      if (exception.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        const fields = exception.meta?.target?.join(', ') ?? 'field';
        message = `A record with this ${fields} already exists`;
      } else if (exception.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (exception.code === 'P2003') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Related record not found';
      } else {
        this.logger.error(
          `Prisma error ${exception.code}`,
          JSON.stringify(exception),
        );
      }
    }

    if (statusCode >= 500) {
      Sentry.captureException(exception);
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} — ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      data: null,
      message,
      statusCode,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
