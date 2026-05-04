import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status: HttpStatus = this.resolveStatus(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unexpected error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const message = this.resolveMessage(status, exception);

    response.status(status).json({
      statusCode: status,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : 'Bad Request',
      message,
    });
  }

  private resolveMessage(status: HttpStatus, exception: unknown): string | string[] {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'An unexpected error occurred';
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'message' in response) {
        return (response as Record<string, unknown>).message as string | string[];
      }
      return exception.message;
    }

    return 'Bad request';
  }

  private resolveStatus(exception: unknown): HttpStatus {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    // Express body-parser attaches a numeric `status` to SyntaxError on malformed JSON
    if (
      exception instanceof SyntaxError &&
      'status' in exception &&
      (exception as NodeJS.ErrnoException).code !== undefined
    ) {
      return HttpStatus.BAD_REQUEST;
    }
    if (exception instanceof SyntaxError && 'body' in exception) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
